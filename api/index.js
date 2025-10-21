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

// Sample data
const sampleData = {
  campuses: [
    { id: 1, name: '金星幼儿园总园', code: 'JX001', address: '北京市朝阳区金星路1号', capacity: 200 },
    { id: 2, name: '金星幼儿园分园A', code: 'JX002', address: '北京市朝阳区金星路2号', capacity: 150 },
    { id: 3, name: '金星幼儿园分园B', code: 'JX003', address: '北京市朝阳区金星路3号', capacity: 180 },
    { id: 4, name: '金星幼儿园分园C', code: 'JX004', address: '北京市朝阳区金星路4号', capacity: 120 }
  ],

  dishes: [
    // 早餐
    { id: 1, name: '小米粥', category: '早餐', description: '营养丰富的小米粥' },
    { id: 2, name: '鸡蛋羹', category: '早餐', description: '嫩滑的鸡蛋羹' },
    { id: 3, name: '包子', category: '早餐', description: '肉包子' },
    { id: 4, name: '豆浆', category: '早餐', description: '新鲜豆浆' },

    // 上午加餐
    { id: 5, name: '苹果', category: '上午加餐', description: '新鲜苹果' },
    { id: 6, name: '香蕉', category: '上午加餐', description: '熟透的香蕉' },
    { id: 7, name: '酸奶', category: '上午加餐', description: '原味酸奶' },

    // 午餐
    { id: 8, name: '米饭', category: '午餐', description: '白米饭' },
    { id: 9, name: '红烧肉', category: '午餐', description: '红烧五花肉' },
    { id: 10, name: '清炒时蔬', category: '午餐', description: '时令蔬菜' },
    { id: 11, name: '西红柿鸡蛋汤', category: '午餐', description: '酸甜开胃汤' },

    // 下午加餐
    { id: 12, name: '饼干', category: '下午加餐', description: '消化饼干' },
    { id: 13, name: '橙汁', category: '下午加餐', description: '鲜榨橙汁' },

    // 午点
    { id: 14, name: '面条', category: '午点', description: '清汤面条' },
    { id: 15, name: '牛奶', category: '午点', description: '纯牛奶' }
  ],

  ingredients: [
    { id: 1, name: '大米', category: 'grains', unit: 'g', calories_per_100g: 130 },
    { id: 2, name: '小米', category: 'grains', unit: 'g', calories_per_100g: 140 },
    { id: 3, name: '面粉', category: 'grains', unit: 'g', calories_per_100g: 364 },
    { id: 4, name: '白菜', category: 'vegetables', unit: 'g', calories_per_100g: 17 },
    { id: 5, name: '西红柿', category: 'vegetables', unit: 'g', calories_per_100g: 18 },
    { id: 6, name: '苹果', category: 'fruits', unit: 'g', calories_per_100g: 52 },
    { id: 7, name: '猪肉', category: 'meat', unit: 'g', calories_per_100g: 242 },
    { id: 8, name: '牛奶', category: 'dairy', unit: 'ml', calories_per_100g: 42 }
  ]
};

// Generate sample recipes
function generateSampleRecipes() {
  const recipes = [];
  const today = new Date();
  const startDate = new Date(today);
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

  return recipes;
}

const sampleRecipes = generateSampleRecipes();

// API Routes
app.get('/api/campuses', (req, res) => {
  res.json({ success: true, data: sampleData.campuses });
});

app.get('/api/debug', (req, res) => {
  res.json({
    success: true,
    data: {
      campuses_count: sampleData.campuses.length,
      dishes_count: sampleData.dishes.length,
      recipes_count: sampleRecipes.length,
      ingredients_count: sampleData.ingredients.length,
      status: 'API working correctly'
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

// Statistics endpoints
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
    i.category === 'meat' || i.category === 'dairy'
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