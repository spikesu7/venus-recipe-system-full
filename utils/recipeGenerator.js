const { format, addDays, eachDayOfInterval, isWeekend, parseISO } = require('date-fns');
const Campus = require('../models/Campus');
const Dish = require('../models/Dish');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

class RecipeGenerator {
  constructor() {
    this.mealTypes = ['早餐', '上午加餐', '午餐', '下午加餐', '午点'];
    // 每个时间段只有一餐
    this.mealConfig = {
      '早餐': { minDishes: 3, maxDishes: 3 },      // 早餐3道菜
      '上午加餐': { minDishes: 1, maxDishes: 1 },   // 上午加餐1道菜（水果）
      '午餐': { minDishes: 3, maxDishes: 5 },      // 午餐3-5道菜
      '下午加餐': { minDishes: 1, maxDishes: 1 },   // 下午加餐1道菜（点心）
      '午点': { minDishes: 2, maxDishes: 3 }       // 午点2-3道菜
    };
  }

  async generateRecipes(campusIds, startDate, endDate) {
    try {
      // Create recipe generation record
      const generationData = {
        start_date: startDate,
        end_date: endDate,
        notes: `Generated for ${campusIds.length} campus(es) from ${startDate} to ${endDate}`
      };

      const generationResult = await Recipe.createGeneration(generationData);
      const generationId = generationResult.id;

      // Update status to in progress
      await Recipe.updateGenerationStatus(generationId, 'pending');

      let totalRecipes = 0;
      const results = [];

      // Generate recipes for each campus
      for (const campusId of campusIds) {
        const campus = await Campus.getById(campusId);
        const campusResult = await this.generateCampusRecipes(
          campusId,
          startDate,
          endDate,
          generationId
        );

        totalRecipes += campusResult.recipes.length;
        results.push({
          campus: campus,
          recipes: campusResult.recipes,
          stats: campusResult.stats
        });
      }

      // Update generation record
      await Recipe.updateGenerationStatus(generationId, 'completed', totalRecipes);

      // Generate and cache statistics
      const Statistics = require('../models/Statistics');
      await Statistics.generateAndCacheAllStatistics(generationId);

      return {
        success: true,
        generationId,
        totalRecipes,
        results
      };

    } catch (error) {
      console.error('Recipe generation failed:', error);
      throw error;
    }
  }

  async generateCampusRecipes(campusId, startDate, endDate, generationId) {
    const dateRange = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    });

    // Filter weekdays (Monday to Friday)
    const weekdays = dateRange.filter(date => !isWeekend(date));

    const recipes = [];
    const usedDishes = new Set(); // Track all used dishes for this campus

    for (const date of weekdays) {
      const dateStr = format(date, 'yyyy-MM-dd');

      for (const mealType of this.mealTypes) {  // 使用所有5个餐期
        try {
          const mealConfig = this.mealConfig[mealType];
          const dishCount = Math.floor(Math.random() * (mealConfig.maxDishes - mealConfig.minDishes + 1)) + mealConfig.minDishes;

          for (let i = 0; i < dishCount; i++) {
            const dish = await this.selectDishForMeal(
              campusId,
              dateStr,
              mealType,
              usedDishes
            );

            if (dish) {
              // Calculate ingredient quantities
              const ingredientQuantities = await this.calculateIngredientQuantities(
                dish,
                100, // Default servings
                mealType
              );

              const recipeData = {
                campus_id: campusId,
                dish_id: dish.id,
                date: dateStr,
                meal_type: mealType,
                generation_id: generationId,
                servings: 100,
                ingredient_quantities: ingredientQuantities
              };

              const recipeResult = await Recipe.create(recipeData);
              const recipe = await Recipe.getByCampusDateAndMeal(
                campusId,
                dateStr,
                mealType
              );

              recipes.push({
                ...recipe,
                dish_name: dish.name
              });

              // Track used dish to prevent duplicates
              usedDishes.add(dish.id);
            }
          }
        } catch (error) {
          console.error(`Error generating recipe for campus ${campusId}, date ${dateStr}, meal ${mealType}:`, error);
        }
      }
    }

    return {
      recipes: recipes,
      stats: {
        totalRecipes: recipes.length,
        uniqueDishes: usedDishes.size,
        dateRange: `${startDate} to ${endDate}`
      }
    };
  }

  async selectDishForMeal(campusId, date, mealType, usedDishes) {
    // Get dishes already used this week for this campus
    const startOfWeek = this.getWeekStart(parseISO(date));
    const endOfWeek = addDays(startOfWeek, 4); // Friday

    const usedInWeek = await Recipe.getUsedDishesInWeek(
      campusId,
      format(startOfWeek, 'yyyy-MM-dd'),
      format(endOfWeek, 'yyyy-MM-dd')
    );

    const usedInWeekIds = usedInWeek.map(d => d.dish_id);
    const excludeIds = [...usedInWeekIds, ...Array.from(usedDishes)];

    // Try to get a random dish that hasn't been used this week
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const dish = await Dish.getRandomByMealType(mealType, excludeIds);

      if (dish) {
        return dish;
      }

      // If no dish found, relax constraints by allowing previously used dishes (but not the same day)
      const todayRecipes = await this.getTodayRecipes(campusId, date);
      const todayDishIds = todayRecipes.map(r => r.dish_id);

      const relaxedDish = await Dish.getRandomByMealType(mealType, todayDishIds);
      if (relaxedDish) {
        return relaxedDish;
      }

      attempts++;
    }

    // Fallback: get any dish for this meal type
    const fallbackDish = await Dish.getRandomByMealType(mealType, []);
    if (fallbackDish) {
      return fallbackDish;
    }

    // If still no dish found, create a default dish for this meal type
    return await this.createDefaultDish(mealType);
  }

  async getTodayRecipes(campusId, date) {
    const sql = `
      SELECT r.*, d.name as dish_name
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      WHERE r.campus_id = ? AND r.date = ?
    `;

    try {
      return await require('../utils/database').all(sql, [campusId, date]);
    } catch (error) {
      console.error('Error getting today recipes:', error);
      return [];
    }
  }

  async calculateIngredientQuantities(dish, servings, mealType) {
    const quantities = {};

    if (!dish.ingredients || dish.ingredients.length === 0) {
      // Use default ingredient mappings based on dish category
      return this.getDefaultIngredientQuantities(dish, servings, mealType);
    }

    // Parse ingredients if it's a string
    let ingredients = dish.ingredients;
    if (typeof dish.ingredients === 'string') {
      try {
        ingredients = JSON.parse(dish.ingredients);
      } catch (error) {
        return this.getDefaultIngredientQuantities(dish, servings, mealType);
      }
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return this.getDefaultIngredientQuantities(dish, servings, mealType);
    }

    for (const ingredient of ingredients) {
      const ingredientData = await Ingredient.getByName(ingredient.name);
      if (ingredientData) {
        // Calculate quantity based on servings
        let baseQuantity = 50; // Default 50g per ingredient

        if (ingredient.quantity) {
          if (typeof ingredient.quantity === 'string') {
            // Parse quantity from string like "100g" or "100ml"
            const match = ingredient.quantity.match(/(\d+(?:\.\d+)?)/);
            baseQuantity = match ? parseFloat(match[1]) : 50;
          } else if (typeof ingredient.quantity === 'number') {
            baseQuantity = ingredient.quantity;
          }
        }

        const scaledQuantity = (baseQuantity * servings) / 100; // Scale from 100 servings base

        quantities[ingredient.name] = {
          quantity: scaledQuantity,
          unit: ingredientData.unit,
          category: ingredientData.category
        };
      }
    }

    return quantities;
  }

  getDefaultIngredientQuantities(dish, servings, mealType) {
    console.log('Getting default ingredient quantities for mealType:', mealType);
    // Default ingredient mappings based on dish name and meal type
    const defaultMappings = {
      '早餐': {
        '主食': { quantity: 80, unit: 'g', category: 'grains' },
        '配菜': { quantity: 60, unit: 'g', category: 'vegetables' },
        '饮品': { quantity: 200, unit: 'ml', category: 'dairy' }
      },
      '上午加餐': {
        '水果': { quantity: 150, unit: 'g', category: 'fruits' }  // 上午水果加餐
      },
      '午餐': {
        '主食': { quantity: 100, unit: 'g', category: 'grains' },
        '荤菜': { quantity: 80, unit: 'g', category: 'meat' },
        '素菜': { quantity: 120, unit: 'g', category: 'vegetables' },
        '鲜牛奶': { quantity: 250, unit: 'ml', category: 'dairy' }  // 午餐后250ml鲜牛奶
      },
      '下午加餐': {
        '点心': { quantity: 80, unit: 'g', category: 'grains' },   // 下午点心加餐
        '饮品': { quantity: 200, unit: 'ml', category: 'dairy' }  // 配餐饮品
      },
      '午点': {
        '主食': { quantity: 60, unit: 'g', category: 'grains' },
        '点心': { quantity: 80, unit: 'g', category: 'grains' },
        '鲜牛奶': { quantity: 250, unit: 'ml', category: 'dairy' }  // 午点前250ml鲜牛奶
      }
    };

    const quantities = {};
    const mapping = defaultMappings[mealType] || defaultMappings['午餐'];
    console.log('Using mapping:', mapping);

    for (const [name, data] of Object.entries(mapping)) {
      quantities[name] = {
        quantity: (data.quantity * servings) / 100,
        unit: data.unit,
        category: data.category
      };
    }

    console.log('Generated quantities:', quantities);
    return quantities;
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  async generateWeeklySchedule(campusId, startDate) {
    const weekStart = this.getWeekStart(parseISO(startDate));
    const weekEnd = addDays(weekStart, 4); // Friday

    const schedule = {};
    const mealTypes = ['早餐', '上午加餐', '午餐', '下午加餐', '午点'];

    for (let i = 0; i < 5; i++) {
      const currentDate = addDays(weekStart, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      schedule[dateStr] = {};

      for (const mealType of mealTypes) {
        const recipe = await Recipe.getByCampusDateAndMeal(campusId, dateStr, mealType);
        schedule[dateStr][mealType] = recipe || null;
      }
    }

    return schedule;
  }

  validateGenerationRequest(campusIds, startDate, endDate) {
    const errors = [];

    if (!campusIds || campusIds.length === 0) {
      errors.push('At least one campus must be selected');
    }

    if (!startDate || !endDate) {
      errors.push('Start date and end date are required');
    }

    // Parse dates first
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format. Please use YYYY-MM-DD format.');
      return {
        isValid: errors.length === 0,
        errors
      };
    }

    // Check if start date is before end date
    if (start >= end) {
      errors.push('End date must be after start date');
      return {
        isValid: errors.length === 0,
        errors
      };
    }

    // Check if date range spans at least 1 weekday
    const dateRange = eachDayOfInterval({ start, end });
    const weekdays = dateRange.filter(date => !isWeekend(date));

    if (weekdays.length === 0) {
      errors.push('Date range must include at least one weekday (Monday-Friday)');
    }

    if (weekdays.length > 10) {
      errors.push('Date range cannot exceed 10 weekdays');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async createDefaultDish(mealType) {
    // Get a default category for the meal type
    const categoryResult = await require('./database').get(
      'SELECT id FROM dish_categories WHERE type = ? LIMIT 1',
      [mealType]
    );

    if (!categoryResult) {
      console.error(`No category found for meal type: ${mealType}`);
      return null;
    }

    const defaultDishes = {
      '早餐': [
        { name: '小米粥', ingredients: ['小米', '水'], nutrition: { calories: 50, protein: 1.2, carbs: 11, fat: 0.3 } },
        { name: '豆浆', ingredients: ['黄豆', '水'], nutrition: { calories: 35, protein: 3.0, carbs: 2, fat: 1.8 } },
        { name: '煮鸡蛋', ingredients: ['鸡蛋'], nutrition: { calories: 155, protein: 13, carbs: 1.1, fat: 11 } },
        { name: '蒸包子', ingredients: ['面粉', '酵母', '肉馅'], nutrition: { calories: 120, protein: 6, carbs: 18, fat: 3 } },
        { name: '煎饼', ingredients: ['面粉', '鸡蛋', '葱'], nutrition: { calories: 150, protein: 5, carbs: 20, fat: 6 } }
      ],
      '上午加餐': [
        { name: '苹果', ingredients: ['苹果'], nutrition: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
        { name: '香蕉', ingredients: ['香蕉'], nutrition: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
        { name: '橙子', ingredients: ['橙子'], nutrition: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
        { name: '葡萄', ingredients: ['葡萄'], nutrition: { calories: 69, protein: 0.7, carbs: 18, fat: 0.2 } }
      ],
      '午餐': [
        { name: '白米饭', ingredients: ['大米'], nutrition: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
        { name: '红烧肉', ingredients: ['猪肉', '生抽', '老抽', '冰糖'], nutrition: { calories: 250, protein: 25, carbs: 5, fat: 15 } },
        { name: '炒青菜', ingredients: ['青菜', '蒜', '植物油'], nutrition: { calories: 60, protein: 2, carbs: 6, fat: 4 } },
        { name: '番茄鸡蛋汤', ingredients: ['番茄', '鸡蛋', '葱'], nutrition: { calories: 80, protein: 6, carbs: 8, fat: 3 } },
        { name: '清炒时蔬', ingredients: ['时令蔬菜', '蒜'], nutrition: { calories: 45, protein: 2, carbs: 6, fat: 2 } },
        { name: '宫保鸡丁', ingredients: ['鸡肉', '花生', '干辣椒'], nutrition: { calories: 180, protein: 20, carbs: 8, fat: 12 } }
      ],
      '下午加餐': [
        { name: '小饼干', ingredients: ['面粉', '黄油', '糖'], nutrition: { calories: 100, protein: 2, carbs: 15, fat: 4 } },
        { name: '酸奶', ingredients: ['牛奶', '菌种'], nutrition: { calories: 70, protein: 4, carbs: 12, fat: 2 } },
        { name: '果汁', ingredients: ['水果', '水'], nutrition: { calories: 50, protein: 0.5, carbs: 12, fat: 0 } },
        { name: '小蛋糕', ingredients: ['鸡蛋', '面粉', '糖'], nutrition: { calories: 120, protein: 4, carbs: 20, fat: 3 } }
      ],
      '午点': [
        { name: '小馒头', ingredients: ['面粉', '酵母'], nutrition: { calories: 90, protein: 3, carbs: 18, fat: 1 } },
        { name: '蒸蛋糕', ingredients: ['鸡蛋', '面粉', '糖'], nutrition: { calories: 120, protein: 4, carbs: 20, fat: 3 } },
        { name: '牛奶', ingredients: ['牛奶'], nutrition: { calories: 42, protein: 3.4, carbs: 5, fat: 1 } },
        { name: '水果拼盘', ingredients: ['苹果', '香蕉', '橙子'], nutrition: { calories: 70, protein: 1, carbs: 17, fat: 0.2 } }
      ]
    };

    const dishOptions = defaultDishes[mealType] || defaultDishes['午餐'];
    const randomDish = dishOptions[Math.floor(Math.random() * dishOptions.length)];

    const dishData = {
      name: randomDish.name,
      category_id: categoryResult.id,
      description: `${mealType}菜品`,
      ingredients: randomDish.ingredients.map(name => ({ name, quantity: '100g' })),
      nutrition_info: randomDish.nutrition
    };

    try {
      const result = await Dish.create(dishData);
      console.log(`Created default dish: ${randomDish.name} for ${mealType}`);
      return { id: result.id, ...dishData };
    } catch (error) {
      console.error('Error creating default dish:', error);
      return null;
    }
  }
}

module.exports = RecipeGenerator;