const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Campus = require('../models/Campus');
const Dish = require('../models/Dish');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

class ExcelImporter {
  constructor() {
    this.campusCache = null;
    this.dishCache = null;
  }

  async initializeCache() {
    if (!this.campusCache) {
      this.campusCache = await Campus.getAll();
    }
    if (!this.dishCache) {
      this.dishCache = await this.getAllDishes();
    }
  }

  async getAllDishes() {
    const sql = `
      SELECT d.*, dc.type as meal_type_category
      FROM dishes d
      JOIN dish_categories dc ON d.category_id = dc.id
      WHERE d.is_active = 1
    `;
    const database = require('./database');
    return await database.all(sql);
  }

  findCampusByName(campusName) {
    if (!this.campusCache) return null;
    return this.campusCache.find(campus =>
      campus.name.includes(campusName) || campusName.includes(campus.name)
    );
  }

  findDishByName(dishName) {
    if (!this.dishCache) return null;
    return this.dishCache.find(dish =>
      dish.name === dishName ||
      dish.name.includes(dishName) ||
      dishName.includes(dish.name)
    );
  }

  parseDateFromExcel(dateValue) {
    if (!dateValue) return null;

    // 如果是Excel日期数字格式
    if (typeof dateValue === 'number') {
      const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
      return excelDate.toISOString().split('T')[0];
    }

    // 如果是字符串格式，尝试解析
    if (typeof dateValue === 'string') {
      // 尝试各种日期格式
      const dateFormats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
        /(\d{1,2})-(\d{1,2})-(\d{4})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/
      ];

      for (const format of dateFormats) {
        const match = dateValue.match(format);
        if (match) {
          let year, month, day;
          if (match[1].length === 4) {
            year = match[1];
            month = match[2].padStart(2, '0');
            day = match[3].padStart(2, '0');
          } else {
            year = match[3];
            month = match[1].padStart(2, '0');
            day = match[2].padStart(2, '0');
          }
          return `${year}-${month}-${day}`;
        }
      }
    }

    return null;
  }

  determineMealTypeFromDish(dish) {
    if (!dish) return 'lunch'; // 默认午餐

    const mealType = dish.meal_type_category;
    if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return mealType;
    }

    // 根据菜品名称判断
    const dishName = dish.name.toLowerCase();
    if (dishName.includes('粥') || dishName.includes('豆浆') || dishName.includes('包子') ||
        dishName.includes('馒头') || dishName.includes('面包') || dishName.includes('煎蛋')) {
      return 'breakfast';
    }
    if (dishName.includes('汤') || dishName.includes('粥')) {
      return 'dinner';
    }

    return 'lunch';
  }

  async calculateIngredientQuantities(dish, servings = 100) {
    const quantities = {};

    if (!dish.ingredients || dish.ingredients.length === 0) {
      return this.getDefaultIngredientQuantities(dish, servings);
    }

    try {
      let ingredients = dish.ingredients;
      if (typeof dish.ingredients === 'string') {
        ingredients = JSON.parse(dish.ingredients);
      }

      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return this.getDefaultIngredientQuantities(dish, servings);
      }

      for (const ingredient of ingredients) {
        const ingredientData = await Ingredient.getByName(ingredient.name);
        if (ingredientData) {
          const baseQuantity = ingredient.quantity || 50;
          const scaledQuantity = (baseQuantity * servings) / 100;

          quantities[ingredient.name] = {
            quantity: scaledQuantity,
            unit: ingredientData.unit,
            category: ingredientData.category
          };
        }
      }
    } catch (error) {
      console.error('Error calculating ingredient quantities:', error);
      return this.getDefaultIngredientQuantities(dish, servings);
    }

    return quantities;
  }

  getDefaultIngredientQuantities(dish, servings) {
    const mealType = this.determineMealTypeFromDish(dish);
    const defaultMappings = {
      breakfast: {
        '大米': { quantity: 30, unit: 'g', category: 'grains' },
        '鸡蛋': { quantity: 50, unit: 'g', category: 'dairy' },
        '牛奶': { quantity: 150, unit: 'ml', category: 'dairy' }
      },
      lunch: {
        '大米': { quantity: 80, unit: 'g', category: 'grains' },
        '猪肉': { quantity: 40, unit: 'g', category: 'meat' },
        '白菜': { quantity: 100, unit: 'g', category: 'vegetables' }
      },
      dinner: {
        '大米': { quantity: 60, unit: 'g', category: 'grains' },
        '鸡肉': { quantity: 35, unit: 'g', category: 'meat' },
        '萝卜': { quantity: 80, unit: 'g', category: 'vegetables' }
      }
    };

    const quantities = {};
    const mapping = defaultMappings[mealType] || defaultMappings.lunch;

    for (const [name, data] of Object.entries(mapping)) {
      quantities[name] = {
        quantity: (data.quantity * servings) / 100,
        unit: data.unit,
        category: data.category
      };
    }

    return quantities;
  }

  async importFromExcel(filePath) {
    try {
      console.log('开始导入Excel文件:', filePath);

      // 初始化缓存
      await this.initializeCache();

      // 读取Excel文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`Excel文件包含 ${data.length} 行数据`);

      const results = {
        success: [],
        failed: [],
        total: data.length
      };

      // 创建生成记录
      const fileName = path.basename(filePath, path.extname(filePath));
      const generationData = {
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        notes: `从Excel文件导入: ${fileName}`
      };

      const generationResult = await Recipe.createGeneration(generationData);
      const generationId = generationResult.id;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];

        try {
          const recipe = await this.parseRowToRecipe(row, generationId);
          if (recipe) {
            const result = await Recipe.create(recipe);
            results.success.push({
              row: i + 1,
              recipeId: result.id,
              data: recipe
            });
            console.log(`成功导入第 ${i + 1} 行: ${recipe.dish_name}`);
          } else {
            results.failed.push({
              row: i + 1,
              reason: '无法解析数据或找不到对应的菜品/校区',
              data: row
            });
            console.log(`第 ${i + 1} 行导入失败: 无法解析数据`);
          }
        } catch (error) {
          results.failed.push({
            row: i + 1,
            reason: error.message,
            data: row
          });
          console.error(`第 ${i + 1} 行导入失败:`, error.message);
        }
      }

      // 更新生成状态
      await Recipe.updateGenerationStatus(generationId, 'completed', results.success.length);

      return {
        success: true,
        message: `导入完成: 成功 ${results.success.length} 条，失败 ${results.failed.length} 条`,
        data: results,
        generationId
      };

    } catch (error) {
      console.error('Excel导入失败:', error);
      return {
        success: false,
        message: 'Excel导入失败: ' + error.message,
        error: error.message
      };
    }
  }

  async importFromExcel(filePath) {
    try {
      console.log('开始导入Excel文件:', filePath);

      // 初始化缓存
      await this.initializeCache();

      // 读取Excel文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
      const worksheet = workbook.Sheets[sheetName];

      // 使用原始数据方式读取
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const rawData = [];

      for (let row = 0; row <= range.e.r; row++) {
        const rowData = [];
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({r: row, c: col});
          const cell = worksheet[cellAddress];
          rowData.push(cell ? String(cell.v || '').trim() : '');
        }
        rawData.push(rowData);
      }

      console.log(`Excel文件包含 ${rawData.length} 行原始数据`);

      // 解析周食谱格式的数据
      const recipes = this.parseWeeklyMenuFormat(rawData, filePath);
      console.log(`解析出 ${recipes.length} 条食谱记录`);

      const results = {
        success: [],
        failed: [],
        total: recipes.length
      };

      // 创建生成记录
      const fileName = path.basename(filePath, path.extname(filePath));
      const generationData = {
        start_date: this.extractStartDateFromFileName(fileName),
        end_date: this.extractEndDateFromFileName(fileName),
        notes: `从Excel文件导入: ${fileName}`
      };

      const generationResult = await Recipe.createGeneration(generationData);
      const generationId = generationResult.id;

      for (let i = 0; i < recipes.length; i++) {
        const recipeData = recipes[i];
        // 设置generation_id
        recipeData.generation_id = generationId;

        try {
          const result = await Recipe.create(recipeData);
          results.success.push({
            row: i + 1,
            recipeId: result.id,
            data: recipeData
          });
          console.log(`成功导入第 ${i + 1} 条: ${recipeData.dish_name || recipeData.dish_id}`);
        } catch (error) {
          results.failed.push({
            row: i + 1,
            reason: error.message,
            data: recipeData
          });
          console.error(`第 ${i + 1} 条导入失败:`, error.message);
        }
      }

      // 更新生成状态
      await Recipe.updateGenerationStatus(generationId, 'completed', results.success.length);

      return {
        success: true,
        message: `导入完成: 成功 ${results.success.length} 条，失败 ${results.failed.length} 条`,
        data: results,
        generationId
      };

    } catch (error) {
      console.error('Excel导入失败:', error);
      return {
        success: false,
        message: 'Excel导入失败: ' + error.message,
        error: error.message
      };
    }
  }

  parseWeeklyMenuFormat(rawData, filePath) {
    const recipes = [];

    try {
      // 从文件名或第一行提取日期信息
      const fileName = path.basename(filePath);
      let dates = this.extractDatesFromFileData(rawData, fileName);

      if (dates.length === 0) {
        console.log('无法提取日期信息，使用默认日期');
        dates = ['2025-09-28', '2025-09-29', '2025-09-30']; // 默认日期
      }

      // 默认园区信息
      const defaultCampus = this.findCampusByName('普惠园') || this.campusCache[0];
      if (!defaultCampus) {
        console.log('找不到默认园区');
        return recipes;
      }

      // 解析早餐 (第4行开始)
      let rowIndex = 3; // 从第4行开始 (0-indexed)
      if (rawData[rowIndex] && rawData[rowIndex][0] && rawData[rowIndex][0].includes('早')) {
        // 解析早餐菜品
        for (let col = 2; col < Math.min(5, dates.length + 2); col++) {
          if (rawData[rowIndex] && rawData[rowIndex][col]) {
            const dishNames = this.splitDishNames(rawData[rowIndex][col]);
            for (const dishName of dishNames) {
              const recipe = this.createRecipeFromDishName(dishName, dates[col - 2], 'breakfast', defaultCampus);
              if (recipe) recipes.push(recipe);
            }
          }
        }
      }

      // 解析午餐 (第6行开始)
      rowIndex = 5; // 第6行
      if (rawData[rowIndex] && rawData[rowIndex][0] && rawData[rowIndex][0].includes('午')) {
        // 解析午餐菜品
        for (let col = 2; col < Math.min(5, dates.length + 2); col++) {
          if (rawData[rowIndex] && rawData[rowIndex][col]) {
            const dishNames = this.splitDishNames(rawData[rowIndex][col]);
            for (const dishName of dishNames) {
              const recipe = this.createRecipeFromDishName(dishName, dates[col - 2], 'lunch', defaultCampus);
              if (recipe) recipes.push(recipe);
            }
          }
        }
      }

      // 解析加餐 (第8行开始)
      rowIndex = 7; // 第8行
      if (rawData[rowIndex] && rawData[rowIndex][0] && rawData[rowIndex][0].includes('加餐')) {
        // 解析加餐菜品
        for (let col = 2; col < Math.min(5, dates.length + 2); col++) {
          if (rawData[rowIndex] && rawData[rowIndex][col]) {
            const dishName = rawData[rowIndex][col].trim();
            if (dishName) {
              const recipe = this.createRecipeFromDishName(dishName, dates[col - 2], 'snack', defaultCampus);
              if (recipe) recipes.push(recipe);
            }
          }
        }
      }

      // 解析午点 (第9行开始)
      rowIndex = 8; // 第9行
      if (rawData[rowIndex] && rawData[rowIndex][0] && rawData[rowIndex][0].includes('午点')) {
        // 解析午点菜品
        for (let col = 2; col < Math.min(5, dates.length + 2); col++) {
          if (rawData[rowIndex] && rawData[rowIndex][col]) {
            const dishNames = this.splitDishNames(rawData[rowIndex][col]);
            for (const dishName of dishNames) {
              const recipe = this.createRecipeFromDishName(dishName, dates[col - 2], 'snack', defaultCampus);
              if (recipe) recipes.push(recipe);
            }
          }
        }
      }

    } catch (error) {
      console.error('解析周食谱格式失败:', error);
    }

    return recipes;
  }

  splitDishNames(dishString) {
    if (!dishString) return [];

    // 按换行符分割菜品名称
    const names = dishString.split(/[\n\r]+/).map(name => name.trim()).filter(name => name);

    // 如果没有换行符，尝试按空格或其他分隔符分割
    if (names.length === 1) {
      const alternativeNames = dishString.split(/[ \t]+/).map(name => name.trim()).filter(name => name);
      if (alternativeNames.length > 1) {
        return alternativeNames;
      }
    }

    return names;
  }

  createRecipeFromDishName(dishName, date, mealType, campus) {
    if (!dishName) return null;

    // 查找菜品
    const dish = this.findDishByName(dishName);
    if (!dish) {
      console.log(`找不到菜品: ${dishName}`);
      return null;
    }

    return {
      campus_id: campus.id,
      dish_id: dish.id,
      date,
      meal_type: mealType,
      generation_id: null, // 将在外部设置
      servings: 100,
      ingredient_quantities: this.getDefaultIngredientQuantities(dish, 100)
    };
  }

  extractDatesFromFileData(rawData, fileName) {
    const dates = [];

    try {
      // 尝试从文件名提取日期
      const dateMatch = fileName.match(/(\d{4})(\d{2})(\d{2})-(\d{4})(\d{2})(\d{2})/);
      if (dateMatch) {
        const startDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        const endDate = `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`;

        // 生成日期范围
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current <= end) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }

      // 如果从文件名提取失败，尝试从Excel内容提取
      if (dates.length === 0 && rawData.length > 2) {
        // 检查第二行是否有日期信息
        const secondRow = rawData[1];
        if (secondRow && secondRow[0]) {
          const contentMatch = secondRow[0].match(/(\d{4})年(\d{1,2})月(\d{1,2})日-(\d{1,2})月(\d{1,2})日/);
          if (contentMatch) {
            const year = contentMatch[1];
            const startMonth = contentMatch[2].padStart(2, '0');
            const startDay = contentMatch[3].padStart(2, '0');
            const endMonth = contentMatch[4].padStart(2, '0');
            const endDay = contentMatch[5].padStart(2, '0');

            dates.push(`${year}-${startMonth}-${startDay}`);
            dates.push(`${year}-${startMonth}-${(parseInt(startDay) + 1).toString().padStart(2, '0')}`);
            dates.push(`${year}-${startMonth}-${(parseInt(startDay) + 2).toString().padStart(2, '0')}`);
          }
        }
      }
    } catch (error) {
      console.error('提取日期失败:', error);
    }

    return dates;
  }

  extractStartDateFromFileName(fileName) {
    const dateMatch = fileName.match(/(\d{4})(\d{2})(\d{2})-/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
    return new Date().toISOString().split('T')[0];
  }

  extractEndDateFromFileName(fileName) {
    const dateMatch = fileName.match(/-(\d{4})(\d{2})(\d{2})/);
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
    return new Date().toISOString().split('T')[0];
  }
}

module.exports = ExcelImporter;