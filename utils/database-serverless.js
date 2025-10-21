// Vercel Serverless compatible database
// Uses in-memory data for demonstration purposes

class ServerlessDatabase {
  constructor() {
    this.isInitialized = false;
    this.data = {
      campuses: [],
      dishes: [],
      ingredients: [],
      recipes: [],
      generations: []
    };
  }

  async connect() {
    console.log('Serverless database connected (in-memory mode)');
    return Promise.resolve();
  }

  async initialize() {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    console.log('Initializing serverless database with demo data...');
    await this.createInMemoryData();
    this.isInitialized = true;
    console.log('Serverless database initialized successfully');
  }

  async createInMemoryData() {
    // Sample campuses
    this.data.campuses = [
      { id: 1, name: '金星幼儿园总园', code: 'JX001', address: '北京市朝阳区金星路1号', capacity: 200 },
      { id: 2, name: '金星幼儿园分园A', code: 'JX002', address: '北京市朝阳区金星路2号', capacity: 150 },
      { id: 3, name: '金星幼儿园分园B', code: 'JX003', address: '北京市朝阳区金星路3号', capacity: 180 },
      { id: 4, name: '金星幼儿园分园C', code: 'JX004', address: '北京市朝阳区金星路4号', capacity: 120 }
    ];

    // Sample dishes
    this.data.dishes = [
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
      { id: 12, name: '宫保鸡丁', category: '午餐', description: '经典川菜' },
      { id: 13, name: '清蒸鱼', category: '午餐', description: '新鲜海鲈鱼' },

      // 下午加餐
      { id: 14, name: '饼干', category: '下午加餐', description: '消化饼干' },
      { id: 15, name: '橙汁', category: '下午加餐', description: '鲜榨橙汁' },
      { id: 16, name: '蛋糕', category: '下午加餐', description: '海绵蛋糕' },

      // 午点
      { id: 17, name: '面条', category: '午点', description: '清汤面条' },
      { id: 18, name: '小馄饨', category: '午点', description: '鲜肉小馄饨' },
      { id: 19, name: '牛奶', category: '午点', description: '纯牛奶' },
      { id: 20, name: '水果拼盘', category: '午点', description: '时令水果' }
    ];

    // Sample ingredients
    this.data.ingredients = [
      // Grains
      { id: 1, name: '大米', category: 'grains', unit: 'g', calories_per_100g: 130 },
      { id: 2, name: '小米', category: 'grains', unit: 'g', calories_per_100g: 140 },
      { id: 3, name: '面粉', category: 'grains', unit: 'g', calories_per_100g: 364 },

      // Vegetables
      { id: 4, name: '白菜', category: 'vegetables', unit: 'g', calories_per_100g: 17 },
      { id: 5, name: '西红柿', category: 'vegetables', unit: 'g', calories_per_100g: 18 },
      { id: 6, name: '胡萝卜', category: 'vegetables', unit: 'g', calories_per_100g: 41 },

      // Fruits
      { id: 7, name: '苹果', category: 'fruits', unit: 'g', calories_per_100g: 52 },
      { id: 8, name: '香蕉', category: 'fruits', unit: 'g', calories_per_100g: 89 },
      { id: 9, name: '橙子', category: 'fruits', unit: 'g', calories_per_100g: 47 },

      // Meat
      { id: 10, name: '猪肉', category: 'meat', unit: 'g', calories_per_100g: 242 },
      { id: 11, name: '鸡肉', category: 'meat', unit: 'g', calories_per_100g: 165 },
      { id: 12, name: '鸡蛋', category: 'meat', unit: 'g', calories_per_100g: 155 },

      // Dairy
      { id: 13, name: '牛奶', category: 'dairy', unit: 'ml', calories_per_100g: 42 },
      { id: 14, name: '酸奶', category: 'dairy', unit: 'g', calories_per_100g: 59 }
    ];

    // Generate sample recipes for this week
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Start of week

    const mealTypes = ['早餐', '上午加餐', '午餐', '下午加餐', '午点'];

    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const campus of this.data.campuses) {
        for (const mealType of mealTypes) {
          const mealDishes = this.data.dishes.filter(d => d.category === mealType);
          if (mealDishes.length > 0) {
            const randomDish = mealDishes[Math.floor(Math.random() * mealDishes.length)];

            this.data.recipes.push({
              id: this.data.recipes.length + 1,
              campus_id: campus.id,
              dish_id: randomDish.id,
              date: dateStr,
              meal_type: mealType,
              servings: 100,
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }

    // Create a sample generation
    this.data.generations.push({
      id: 1,
      start_date: startDate.toISOString().split('T')[0],
      end_date: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      generation_date: new Date().toISOString(),
      status: 'completed',
      total_recipes: this.data.recipes.length,
      notes: '示例食谱数据 - Vercel演示版本'
    });
  }

  // Database-like methods for compatibility
  async run(sql, params = []) {
    // Simplified implementation for INSERT/UPDATE/DELETE operations
    console.log('Serverless DB - Run:', sql, params);
    return Promise.resolve({ id: 1, changes: 1 });
  }

  async get(sql, params = []) {
    // Simplified implementation for SELECT single row
    console.log('Serverless DB - Get:', sql, params);

    if (sql.includes('campuses')) {
      return this.data.campuses[0];
    }
    if (sql.includes('generations') && sql.includes('ORDER BY')) {
      return this.data.generations[this.data.generations.length - 1];
    }
    return null;
  }

  async all(sql, params = []) {
    // Simplified implementation for SELECT multiple rows
    console.log('Serverless DB - All:', sql, params);

    if (sql.includes('campuses')) {
      return this.data.campuses;
    }
    if (sql.includes('dishes')) {
      return this.data.dishes;
    }
    if (sql.includes('ingredients')) {
      return this.data.ingredients;
    }
    if (sql.includes('generations')) {
      return this.data.generations;
    }
    if (sql.includes('recipes')) {
      let recipes = [...this.data.recipes];

      // Apply filters if present
      if (sql.includes('WHERE')) {
        if (sql.includes('campus_id')) {
          const campusId = params.find(p => typeof p === 'number');
          if (campusId) {
            recipes = recipes.filter(r => r.campus_id === campusId);
          }
        }
        if (sql.includes('date >=') && sql.includes('date <=')) {
          const [startDate, endDate] = params.filter(p => typeof p === 'string');
          recipes = recipes.filter(r => r.date >= startDate && r.date <= endDate);
        }
      }

      return recipes;
    }

    return [];
  }

  async close() {
    console.log('Serverless database connection closed');
    return Promise.resolve();
  }
}

// Create and export singleton instance
const database = new ServerlessDatabase();
module.exports = database;