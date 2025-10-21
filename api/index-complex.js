const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/static', express.static(path.join(__dirname, '../static')));
app.use(express.static(path.join(__dirname, '..')));

// File upload middleware for Vercel (simulated)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sample data for demonstration
const sampleData = {
  campuses: [
    { id: 1, name: '金星幼儿园总园', code: 'JX001', address: '北京市朝阳区金星路1号', capacity: 200 },
    { id: 2, name: '金星幼儿园分园A', code: 'JX002', address: '北京市朝阳区金星路2号', capacity: 150 },
    { id: 3, name: '金星幼儿园分园B', code: 'JX003', address: '北京市朝阳区金星路3号', capacity: 180 },
    { id: 4, name: '金星幼儿园分园C', code: 'JX004', address: '北京市朝阳区金星路4号', capacity: 120 }
  ],

  dishes: [
    // 早餐主食类
    { id: 1, name: '小米粥', category: '早餐', description: '营养丰富的小米粥，健胃养脾' },
    { id: 2, name: '白米粥', category: '早餐', description: '清淡养胃的白米粥' },
    { id: 3, name: '八宝粥', category: '早餐', description: '营养丰富的八宝粥' },
    { id: 4, name: '肉包子', category: '早餐', description: '鲜肉馅包子' },
    { id: 5, name: '菜包子', category: '早餐', description: '时令蔬菜馅包子' },
    { id: 6, name: '豆沙包', category: '早餐', description: '甜豆沙馅包子' },
    { id: 7, name: '花卷', category: '早餐', description: '葱香花卷' },
    { id: 8, name: '馒头', category: '早餐', description: '松软白馒头' },
    { id: 9, name: '鸡蛋饼', category: '早餐', description: '香嫩鸡蛋饼' },
    { id: 10, name: '煎饼', category: '早餐', description: '传统煎饼果子' },
    { id: 11, name: '面包', category: '早餐', description: '全麦面包片' },
    { id: 12, name: '油条', category: '早餐', description: '香脆油条' },
    { id: 13, name: '豆浆', category: '早餐', description: '新���磨制豆浆' },

    // 早餐配菜
    { id: 14, name: '鸡蛋羹', category: '早餐', description: '嫩滑鸡蛋羹' },
    { id: 15, name: '水煮蛋', category: '早餐', description: '营养水煮蛋' },
    { id: 16, name: '咸鸭蛋', category: '早餐', description: '腌制咸鸭蛋' },
    { id: 17, name: '腌萝卜', category: '早餐', description: '爽口腌萝卜条' },
    { id: 18, name: '榨菜', category: '早餐', description: '下饭榨菜丝' },
    { id: 19, name: '腐乳', category: '早餐', description: '传统腐乳' },

    // 上午加餐水果
    { id: 20, name: '苹果', category: '上午加餐', description: '新鲜脆甜苹果' },
    { id: 21, name: '香蕉', category: '上午加餐', description: '熟透香蕉' },
    { id: 22, name: '橙子', category: '上午加餐', description: '酸甜橙子' },
    { id: 23, name: '梨', category: '上午加餐', description: '清甜脆梨' },
    { id: 24, name: '葡萄', category: '上午加餐', description: '无籽葡萄' },
    { id: 25, name: '草莓', category: '上午加餐', description: '新鲜草莓' },
    { id: 26, name: '桃子', category: '上午加餐', description: '水蜜桃' },
    { id: 27, name: '西瓜', category: '上午加餐', description: '夏日西瓜' },
    { id: 28, name: '哈密瓜', category: '上午加餐', description: '甜哈密瓜' },

    // 上午加餐饮品
    { id: 29, name: '酸奶', category: '上午加餐', description: '原味酸奶' },
    { id: 30, name: '牛奶', category: '上午加餐', description: '纯牛奶' },
    { id: 31, name: '豆浆', category: '上午加餐', description: '温热豆浆' },
    { id: 32, name: '果汁', category: '上午加餐', description: '混合果汁' },

    // 午餐主食
    { id: 33, name: '白米饭', category: '午餐', description: '香软白米饭' },
    { id: 34, name: '糙米饭', category: '午餐', description: '营养糙米饭' },
    { id: 35, name: '蒸蛋羹', category: '午餐', description: '嫩滑蒸蛋羹' },
    { id: 36, name: '面条', category: '午餐', description: '手擀面条' },
    { id: 37, name: '饺子', category: '午餐', description: '手工水饺' },
    { id: 38, name: '包子', category: '午餐', description: '鲜肉包子' },
    { id: 39, name: '花卷', category: '午餐', description: '葱香花卷' },

    // 午餐荤菜
    { id: 40, name: '红烧肉', category: '午餐', description: '红烧五花肉' },
    { id: 41, name: '糖醋里脊', category: '午餐', description: '酸甜糖醋里脊' },
    { id: 42, name: '宫保鸡丁', category: '午餐', description: '经典川菜宫保鸡丁' },
    { id: 43, name: '鱼香肉丝', category: '午餐', description: '传统鱼香肉丝' },
    { id: 44, name: '清蒸鱼', category: '午餐', description: '新鲜清蒸鲈鱼' },
    { id: 45, name: '红烧排骨', category: '午餐', description: '红烧小排' },
    { id: 46, name: '可乐鸡翅', category: '午餐', description: '甜香可乐鸡翅' },
    { id: 47, name: '番茄牛肉', category: '午餐', description: '番茄炖牛肉' },
    { id: 48, name: '麻婆豆腐', category: '午餐', description: '麻辣嫩豆腐' },
    { id: 49, name: '回锅肉', category: '午餐', description: '川味回锅肉' },
    { id: 50, name: '糖醋鱼', category: '午餐', description: '酸甜糖醋鱼' },

    // 午餐素菜
    { id: 51, name: '清炒时蔬', category: '午餐', description: '时令蔬菜小炒' },
    { id: 52, name: '西红柿炒蛋', category: '午餐', description: '经典西红柿炒蛋' },
    { id: 53, name: '蒜蓉菠菜', category: '午餐', description: '蒜香炒菠菜' },
    { id: 54, name: '清炒豆芽', category: '午餐', description: '清爽绿豆芽' },
    { id: 55, name: '醋溜白菜', category: '午餐', description: '酸甜醋溜白菜' },
    { id: 56, name: '干煸四季豆', category: '午餐', description: '香辣四季豆' },
    { id: 57, name: '蒜蓉西兰花', category: '午餐', description: '健康蒜蓉西兰花' },
    { id: 58, name: '地三鲜', category: '午餐', description: '东北地三鲜' },
    { id: 59, name: '干煸土豆丝', category: '午餐', description: '酸辣土豆丝' },

    // 午餐汤品
    { id: 60, name: '西红柿鸡蛋汤', category: '午餐', description: '酸甜开胃汤' },
    { id: 61, name: '紫菜蛋花汤', category: '午餐', description: '清淡紫菜汤' },
    { id: 62, name: '冬瓜排骨汤', category: '午餐', description: '营养冬瓜汤' },
    { id: 63, name: '玉米排骨汤', category: '午餐', description: '甜玉米排骨汤' },
    { id: 64, name: '鸡汤', category: '午餐', description: '滋补鸡汤' },
    { id: 65, name: '鱼汤', category: '午餐', description: '鲜美鱼汤' },

    // 下午加餐点心
    { id: 66, name: '饼干', category: '下午加餐', description: '消化饼干' },
    { id: 67, name: '蛋糕', category: '下午加餐', description: '海绵蛋糕' },
    { id: 68, name: '面包', category: '下午加餐', description: '奶香面包片' },
    { id: 69, name: '蛋挞', category: '下午加餐', description: '葡式蛋挞' },
    { id: 70, name: '曲奇', category: '下午加餐', description: '黄油曲奇' },
    { id: 71, name: '马卡龙', category: '下午加餐', description: '彩色马卡龙' },
    { id: 72, name: '泡芙', category: '下午加餐', description: '奶油泡芙' },

    // 下午加餐饮品
    { id: 73, name: '橙汁', category: '下午加餐', description: '鲜榨橙汁' },
    { id: 74, name: '苹果汁', category: '下午加餐', description: '鲜苹果汁' },
    { id: 75, name: '柠檬水', category: '下午加餐', description: '蜂蜜柠檬水' },
    { id: 76, name: '绿豆汤', category: '下午加餐', description: '清热绿豆汤' },
    { id: 77, name: '银耳汤', category: '下午加餐', description: '滋润银耳汤' },
    { id: 78, name: '酸奶', category: '下午加餐', description: '水果酸奶' },

    // 午点主食
    { id: 79, name: '面条', category: '午点', description: '清汤面条' },
    { id: 80, name: '小馄饨', category: '午点', description: '鲜肉小馄饨' },
    { id: 81, name: '饺子', category: '午点', description: '手工小饺子' },
    { id: 82, name: '包子', category: '午点', description: '素菜包子' },
    { id: 83, name: '馒头', category: '午点', description: '小馒头' },
    { id: 84, name: '花卷', category: '午点', description: '小葱香花卷' },

    // 午点心品
    { id: 85, name: '蛋羹', category: '午点', description: '嫩滑鸡蛋羹' },
    { id: 86, name: '布丁', category: '午点', description: '牛奶布丁' },
    { id: 87, name: '果冻', category: '午点', description: '水果果冻' },
    { id: 88, name: '酸奶', category: '午点', description: '益生菌酸奶' },

    // 午点饮品
    { id: 89, name: '牛奶', category: '午点', description: '温热纯牛奶' },
    { id: 90, name: '豆浆', category: '午点', description: '无糖豆浆' },
    { id: 91, name: '米糊', category: '午点', description: '营养米糊' },
    { id: 92, name: '水果羹', category: '午点', description: '冰糖水果羹' },

    // 午点水果
    { id: 93, name: '水果拼盘', category: '午点', description: '时令水果拼盘' },
    { id: 94, name: '水果沙拉', category: '午点', description: '酸奶水果沙拉' },
    { id: 95, name: '果盘', category: '午点', description: '精美果盘' }
  ],

  ingredients: [
    // Grains (杂粮类)
    { id: 1, name: '大米', category: 'grains', unit: 'g', calories_per_100g: 130 },
    { id: 2, name: '小米', category: 'grains', unit: 'g', calories_per_100g: 140 },
    { id: 3, name: '面粉', category: 'grains', unit: 'g', calories_per_100g: 364 },
    { id: 4, name: '玉米', category: 'grains', unit: 'g', calories_per_100g: 86 },
    { id: 5, name: '燕麦', category: 'grains', unit: 'g', calories_per_100g: 389 },
    { id: 6, name: '红豆', category: 'grains', unit: 'g', calories_per_100g: 324 },
    { id: 7, name: '绿豆', category: 'grains', unit: 'g', calories_per_100g: 316 },
    { id: 8, name: '黑米', category: 'grains', unit: 'g', calories_per_100g: 343 },
    { id: 9, name: '糯米', category: 'grains', unit: 'g', calories_per_100g: 344 },
    { id: 10, name: '糙米', category: 'grains', unit: 'g', calories_per_100g: 111 },
    { id: 11, name: '薏米', category: 'grains', unit: 'g', calories_per_100g: 357 },
    { id: 12, name: '荞麦', category: 'grains', unit: 'g', calories_per_100g: 313 },
    { id: 13, name: '大麦', category: 'grains', unit: 'g', calories_per_100g: 354 },
    { id: 14, name: '小麦', category: 'grains', unit: 'g', calories_per_100g: 339 },
    { id: 15, name: '高粱', category: 'grains', unit: 'g', calories_per_100g: 351 },

    // Vegetables (蔬菜类)
    { id: 16, name: '白菜', category: 'vegetables', unit: 'g', calories_per_100g: 17 },
    { id: 17, name: '西红柿', category: 'vegetables', unit: 'g', calories_per_100g: 18 },
    { id: 18, name: '胡萝卜', category: 'vegetables', unit: 'g', calories_per_100g: 41 },
    { id: 19, name: '黄瓜', category: 'vegetables', unit: 'g', calories_per_100g: 16 },
    { id: 20, name: '菠菜', category: 'vegetables', unit: 'g', calories_per_100g: 23 },
    { id: 21, name: '土豆', category: 'vegetables', unit: 'g', calories_per_100g: 77 },
    { id: 22, name: '冬瓜', category: 'vegetables', unit: 'g', calories_per_100g: 11 },
    { id: 23, name: '茄子', category: 'vegetables', unit: 'g', calories_per_100g: 25 },
    { id: 24, name: '青椒', category: 'vegetables', unit: 'g', calories_per_100g: 22 },
    { id: 25, name: '豆角', category: 'vegetables', unit: 'g', calories_per_100g: 31 },
    { id: 26, name: '西兰花', category: 'vegetables', unit: 'g', calories_per_100g: 34 },
    { id: 27, name: '芹菜', category: 'vegetables', unit: 'g', calories_per_100g: 14 },
    { id: 28, name: '韭菜', category: 'vegetables', unit: 'g', calories_per_100g: 26 },
    { id: 29, name: '豆芽', category: 'vegetables', unit: 'g', calories_per_100g: 44 },
    { id: 30, name: '洋葱', category: 'vegetables', unit: 'g', calories_per_100g: 40 },

    // Fruits (水果类)
    { id: 31, name: '苹果', category: 'fruits', unit: 'g', calories_per_100g: 52 },
    { id: 32, name: '香蕉', category: 'fruits', unit: 'g', calories_per_100g: 89 },
    { id: 33, name: '橙子', category: 'fruits', unit: 'g', calories_per_100g: 47 },
    { id: 34, name: '梨', category: 'fruits', unit: 'g', calories_per_100g: 57 },
    { id: 35, name: '葡萄', category: 'fruits', unit: 'g', calories_per_100g: 69 },
    { id: 36, name: '西瓜', category: 'fruits', unit: 'g', calories_per_100g: 30 },
    { id: 37, name: '草莓', category: 'fruits', unit: 'g', calories_per_100g: 32 },
    { id: 38, name: '桃子', category: 'fruits', unit: 'g', calories_per_100g: 39 },
    { id: 39, name: '樱桃', category: 'fruits', unit: 'g', calories_per_100g: 63 },
    { id: 40, name: '芒果', category: 'fruits', unit: 'g', calories_per_100g: 60 },
    { id: 41, name: '猕猴桃', category: 'fruits', unit: 'g', calories_per_100g: 61 },
    { id: 42, name: '菠萝', category: 'fruits', unit: 'g', calories_per_100g: 50 },

    // Meat (肉类)
    { id: 43, name: '猪肉', category: 'meat', unit: 'g', calories_per_100g: 242 },
    { id: 44, name: '牛肉', category: 'meat', unit: 'g', calories_per_100g: 250 },
    { id: 45, name: '鸡肉', category: 'meat', unit: 'g', calories_per_100g: 165 },
    { id: 46, name: '鸭肉', category: 'meat', unit: 'g', calories_per_100g: 240 },
    { id: 47, name: '羊肉', category: 'meat', unit: 'g', calories_per_100g: 203 },
    { id: 48, name: '鸡蛋', category: 'meat', unit: 'g', calories_per_100g: 155 },
    { id: 49, name: '鸭蛋', category: 'meat', unit: 'g', calories_per_100g: 180 },
    { id: 50, name: '鹌鹑蛋', category: 'meat', unit: 'g', calories_per_100g: 158 },

    // Seafood (海鲜类)
    { id: 51, name: '鱼', category: 'seafood', unit: 'g', calories_per_100g: 127 },
    { id: 52, name: '虾', category: 'seafood', unit: 'g', calories_per_100g: 99 },
    { id: 53, name: '螃蟹', category: 'seafood', unit: 'g', calories_per_100g: 95 },
    { id: 54, name: '贝类', category: 'seafood', unit: 'g', calories_per_100g: 86 },
    { id: 55, name: '鱿鱼', category: 'seafood', unit: 'g', calories_per_100g: 75 },

    // Dairy (乳制品类)
    { id: 56, name: '牛奶', category: 'dairy', unit: 'ml', calories_per_100g: 42 },
    { id: 57, name: '酸奶', category: 'dairy', unit: 'g', calories_per_100g: 59 },
    { id: 58, name: '奶酪', category: 'dairy', unit: 'g', calories_per_100g: 113 },
    { id: 59, name: '黄油', category: 'dairy', unit: 'g', calories_per_100g: 717 },
    { id: 60, name: '奶油', category: 'dairy', unit: 'g', calories_per_100g: 340 }
  ]
};

// Generate sample recipes
function generateSampleRecipes() {
  const recipes = [];
  const today = new Date();
  const startDate = new Date(today);
  // Set to Monday of current week
  startDate.setDate(today.getDate() - today.getDay() + 1);

  const mealTypes = ['早餐', '上午加餐', '午餐', '下午加餐', '午点'];

  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];

    for (const campus of sampleData.campuses) {
      for (const mealType of mealTypes) {
        const mealDishes = sampleData.dishes.filter(d => d.category === mealType);
        if (mealDishes.length > 0) {
          const randomDish = mealDishes[Math.floor(Math.random() * mealDishes.length)];

          recipes.push({
            id: recipes.length + 1,
            campus_id: campus.id,
            dish_id: randomDish.id,
            date: dateStr,
            meal_type: mealType,
            servings: 100,
            created_at: new Date().toISOString(),
            campus: campus,
            dish: randomDish
          });
        }
      }
    }
  }

  console.log(`Generated ${recipes.length} recipes for this week`);
  return recipes;
}

const sampleRecipes = generateSampleRecipes();

// API Routes
app.get('/api/campuses', (req, res) => {
  console.log('GET /api/campuses - returning', sampleData.campuses.length, 'campuses');
  res.json({ success: true, data: sampleData.campuses });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    data: {
      campuses_count: sampleData.campuses.length,
      dishes_count: sampleData.dishes.length,
      recipes_count: sampleRecipes.length,
      ingredients_count: sampleData.ingredients.length,
      campuses: sampleData.campuses.map(c => ({ id: c.id, name: c.name })),
      dish_categories: [...new Set(sampleData.dishes.map(d => d.category))],
      recipe_dates: [...new Set(sampleRecipes.map(r => r.date))].sort()
    }
  });
});

app.get('/api/dishes', (req, res) => {
  res.json({ success: true, data: sampleData.dishes });
});

app.get('/api/ingredients', (req, res) => {
  res.json({ success: true, data: sampleData.ingredients });
});

app.get('/api/recipes', (req, res) => {
  const { campus_id, start_date, end_date } = req.query;
  let filteredRecipes = [...sampleRecipes];

  if (campus_id) {
    filteredRecipes = filteredRecipes.filter(r => r.campus_id == campus_id);
  }

  if (start_date && end_date) {
    filteredRecipes = filteredRecipes.filter(r =>
      r.date >= start_date && r.date <= end_date
    );
  }

  res.json({ success: true, data: filteredRecipes });
});

app.get('/api/statistics/grains', (req, res) => {
  const grains = sampleData.ingredients.filter(i => i.category === 'grains');
  const statistics = grains.map(grain => ({
    ingredient: grain,
    total_quantity: Math.floor(Math.random() * 1000) + 500,
    unit: grain.unit,
    usage_details: sampleData.campuses.map(campus => ({
      campus_id: campus.id,
      campus_name: campus.name,
      quantity: Math.floor(Math.random() * 300) + 100,
      unit: grain.unit
    }))
  }));

  res.json({ success: true, data: statistics });
});

app.get('/api/statistics/fruits', (req, res) => {
  const fruits = sampleData.ingredients.filter(i => i.category === 'fruits');
  const statistics = fruits.map(fruit => ({
    ingredient: fruit,
    total_quantity: Math.floor(Math.random() * 800) + 400,
    unit: fruit.unit,
    usage_details: sampleData.campuses.map(campus => ({
      campus_id: campus.id,
      campus_name: campus.name,
      quantity: Math.floor(Math.random() * 200) + 80,
      unit: fruit.unit
    }))
  }));

  res.json({ success: true, data: statistics });
});

app.get('/api/statistics/meat', (req, res) => {
  const meatSeafood = sampleData.ingredients.filter(i =>
    i.category === 'meat' || i.category === 'seafood'
  );
  const statistics = meatSeafood.map(item => ({
    ingredient: item,
    total_quantity: Math.floor(Math.random() * 600) + 300,
    unit: item.unit,
    usage_details: sampleData.campuses.map(campus => ({
      campus_id: campus.id,
      campus_name: campus.name,
      quantity: Math.floor(Math.random() * 150) + 50,
      unit: item.unit
    }))
  }));

  res.json({ success: true, data: statistics });
});

app.get('/api/generations', (req, res) => {
  const generations = [{
    id: 1,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    generation_date: new Date().toISOString(),
    status: 'completed',
    total_recipes: sampleRecipes.length,
    notes: '金星食谱管理系统数据'
  }];

  res.json({ success: true, data: generations });
});

// === CRUD Operations for Full Functionality ===

// Create new recipe
app.post('/api/recipes', (req, res) => {
  try {
    const { campus_id, dish_id, date, meal_type, servings = 100 } = req.body;

    // Validation
    if (!campus_id || !dish_id || !date || !meal_type) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    const campus = sampleData.campuses.find(c => c.id === campus_id);
    const dish = sampleData.dishes.find(d => d.id === dish_id);

    if (!campus || !dish) {
      return res.status(400).json({
        success: false,
        message: '园区或菜品不存在'
      });
    }

    const newRecipe = {
      id: sampleRecipes.length + 1,
      campus_id,
      dish_id,
      date,
      meal_type,
      servings,
      created_at: new Date().toISOString(),
      campus,
      dish
    };

    sampleRecipes.push(newRecipe);

    res.json({
      success: true,
      message: '食谱添加成功',
      data: newRecipe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加食谱失败: ' + error.message
    });
  }
});

// Update recipe
app.put('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { campus_id, dish_id, date, meal_type, servings } = req.body;

    const recipeIndex = sampleRecipes.findIndex(r => r.id === parseInt(id));

    if (recipeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '食谱不存在'
      });
    }

    const campus = sampleData.campuses.find(c => c.id === campus_id);
    const dish = sampleData.dishes.find(d => d.id === dish_id);

    if (!campus || !dish) {
      return res.status(400).json({
        success: false,
        message: '园区或菜品不存在'
      });
    }

    const updatedRecipe = {
      ...sampleRecipes[recipeIndex],
      campus_id,
      dish_id,
      date,
      meal_type,
      servings,
      campus,
      dish,
      updated_at: new Date().toISOString()
    };

    sampleRecipes[recipeIndex] = updatedRecipe;

    res.json({
      success: true,
      message: '食谱更新成功',
      data: updatedRecipe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新食谱失败: ' + error.message
    });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recipeIndex = sampleRecipes.findIndex(r => r.id === parseInt(id));

    if (recipeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '食谱不存在'
      });
    }

    const deletedRecipe = sampleRecipes.splice(recipeIndex, 1)[0];

    res.json({
      success: true,
      message: '食谱删除成功',
      data: deletedRecipe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除食谱失败: ' + error.message
    });
  }
});

// Create new dish
app.post('/api/dishes', (req, res) => {
  try {
    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: '菜品名称和类别不能为空'
      });
    }

    const newDish = {
      id: sampleData.dishes.length + 1,
      name,
      category,
      description: description || ''
    };

    sampleData.dishes.push(newDish);

    res.json({
      success: true,
      message: '菜品添加成功',
      data: newDish
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加菜品失败: ' + error.message
    });
  }
});

// Update dish
app.put('/api/dishes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;

    const dishIndex = sampleData.dishes.findIndex(d => d.id === parseInt(id));

    if (dishIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    const updatedDish = {
      ...sampleData.dishes[dishIndex],
      name,
      category,
      description: description || '',
      updated_at: new Date().toISOString()
    };

    sampleData.dishes[dishIndex] = updatedDish;

    res.json({
      success: true,
      message: '菜品更新成功',
      data: updatedDish
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新菜品失败: ' + error.message
    });
  }
});

// Delete dish
app.delete('/api/dishes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dishIndex = sampleData.dishes.findIndex(d => d.id === parseInt(id));

    if (dishIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    const deletedDish = sampleData.dishes.splice(dishIndex, 1)[0];

    res.json({
      success: true,
      message: '菜品删除成功',
      data: deletedDish
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除菜品失败: ' + error.message
    });
  }
});

// Create new campus
app.post('/api/campuses', (req, res) => {
  try {
    const { name, code, address, capacity } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: '园区名称和代码不能为空'
      });
    }

    const newCampus = {
      id: sampleData.campuses.length + 1,
      name,
      code,
      address: address || '',
      capacity: capacity || 100,
      created_at: new Date().toISOString()
    };

    sampleData.campuses.push(newCampus);

    res.json({
      success: true,
      message: '园区添加成功',
      data: newCampus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '添加园区失败: ' + error.message
    });
  }
});

// File upload simulation (for Excel import)
app.post('/api/import/excel', (req, res) => {
  try {
    // In a real application, you would process the uploaded Excel file here
    // For Vercel demo, we'll simulate the import process
    const { filename, data } = req.body;

    if (!filename || !data) {
      return res.status(400).json({
        success: false,
        message: '请提供文件名和数据'
      });
    }

    // Simulate processing time
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Excel文件导入成功',
        data: {
          filename,
          imported_count: Math.floor(Math.random() * 50) + 10,
          processing_time: '2.3秒'
        }
      });
    }, 1000);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

// Export recipes to Excel format
app.get('/api/export/recipes', (req, res) => {
  try {
    const { campus_id, start_date, end_date } = req.query;
    let filteredRecipes = [...sampleRecipes];

    if (campus_id) {
      filteredRecipes = filteredRecipes.filter(r => r.campus_id == campus_id);
    }

    if (start_date && end_date) {
      filteredRecipes = filteredRecipes.filter(r =>
        r.date >= start_date && r.date <= end_date
      );
    }

    // Simulate Excel data generation
    const exportData = {
      filename: `recipes_${new Date().toISOString().split('T')[0]}.xlsx`,
      data: filteredRecipes.map(recipe => ({
        日期: recipe.date,
        园区: recipe.campus?.name,
        餐次: recipe.meal_type,
        菜品: recipe.dish?.name,
        描述: recipe.dish?.description,
        份数: recipe.servings
      })),
      total_count: filteredRecipes.length
    };

    res.json({
      success: true,
      message: '数据导出成功',
      data: exportData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: '导出失败: ' + error.message
    });
  }
});

// Main route - serve the HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Fallback for other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Export for Vercel
module.exports = app;