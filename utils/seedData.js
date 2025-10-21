const database = require('./database');

class SeedData {
  static async createDishCategories() {
    const categories = [
      { name: '早餐主食', type: 'breakfast' },
      { name: '早餐配菜', type: 'breakfast' },
      { name: '午餐主食', type: 'lunch' },
      { name: '午餐荤菜', type: 'lunch' },
      { name: '午餐素菜', type: 'lunch' },
      { name: '午餐汤品', type: 'lunch' },
      { name: '晚餐主食', type: 'dinner' },
      { name: '晚餐荤菜', type: 'dinner' },
      { name: '晚餐素菜', type: 'dinner' },
      { name: '晚餐汤品', type: 'dinner' }
    ];

    try {
      for (const category of categories) {
        await database.run(
          'INSERT OR IGNORE INTO dish_categories (name, type) VALUES (?, ?)',
          [category.name, category.type]
        );
      }
      console.log('Dish categories seeded successfully');
    } catch (error) {
      console.error('Error seeding dish categories:', error);
    }
  }

  static async createDishes() {
    const dishes = [
      // 早餐 dishes
      { name: '小笼包', category_name: '早餐主食', ingredients: [
        { name: '面粉', quantity: 80 },
        { name: '猪肉', quantity: 30 },
        { name: '白菜', quantity: 20 }
      ]},
      { name: '豆浆', category_name: '早餐配菜', ingredients: [
        { name: '黄豆', quantity: 50 },
        { name: '水', quantity: 200 }
      ]},
      { name: '蒸蛋羹', category_name: '早餐配菜', ingredients: [
        { name: '鸡蛋', quantity: 60 },
        { name: '水', quantity: 100 }
      ]},
      { name: '小米粥', category_name: '早餐主食', ingredients: [
        { name: '小米', quantity: 40 },
        { name: '水', quantity: 300 }
      ]},
      { name: '煮鸡蛋', category_name: '早餐配菜', ingredients: [
        { name: '鸡蛋', quantity: 50 }
      ]},
      { name: '牛奶', category_name: '早餐配菜', ingredients: [
        { name: '牛奶', quantity: 200 }
      ]},
      { name: '燕麦粥', category_name: '早餐主食', ingredients: [
        { name: '燕麦', quantity: 50 },
        { name: '牛奶', quantity: 150 }
      ]},
      { name: '蒸红薯', category_name: '早餐主食', ingredients: [
        { name: '红薯', quantity: 150 }
      ]},

      // 午餐 dishes
      { name: '红烧肉', category_name: '午餐荤菜', ingredients: [
        { name: '猪肉', quantity: 80 },
        { name: '冰糖', quantity: 10 },
        { name: '生抽', quantity: 15 }
      ]},
      { name: '宫保鸡丁', category_name: '午餐荤菜', ingredients: [
        { name: '鸡肉', quantity: 70 },
        { name: '花生', quantity: 20 },
        { name: '干辣椒', quantity: 5 }
      ]},
      { name: '清蒸鱼', category_name: '午餐荤菜', ingredients: [
        { name: '鱼', quantity: 100 },
        { name: '生姜', quantity: 5 },
        { name: '葱', quantity: 5 }
      ]},
      { name: '西红柿炒蛋', category_name: '午餐素菜', ingredients: [
        { name: '西红柿', quantity: 120 },
        { name: '鸡蛋', quantity: 60 },
        { name: '葱', quantity: 5 }
      ]},
      { name: '清炒白菜', category_name: '午餐素菜', ingredients: [
        { name: '白菜', quantity: 150 },
        { name: '蒜', quantity: 5 }
      ]},
      { name: '胡萝卜炒肉丝', category_name: '午餐荤菜', ingredients: [
        { name: '猪肉', quantity: 50 },
        { name: '胡萝卜', quantity: 80 },
        { name: '青椒', quantity: 30 }
      ]},
      { name: '冬瓜排骨汤', category_name: '午餐汤品', ingredients: [
        { name: '排骨', quantity: 60 },
        { name: '冬瓜', quantity: 100 },
        { name: '生姜', quantity: 3 }
      ]},
      { name: '紫菜蛋花汤', category_name: '午餐汤品', ingredients: [
        { name: '紫菜', quantity: 10 },
        { name: '鸡蛋', quantity: 30 },
        { name: '虾皮', quantity: 5 }
      ]},
      { name: '白米饭', category_name: '午餐主食', ingredients: [
        { name: '大米', quantity: 100 }
      ]},
      { name: '蒸蛋', category_name: '午餐素菜', ingredients: [
        { name: '鸡蛋', quantity: 60 },
        { name: '水', quantity: 80 }
      ]},

      // 晚餐 dishes
      { name: '青椒肉丝', category_name: '晚餐荤菜', ingredients: [
        { name: '猪肉', quantity: 60 },
        { name: '青椒', quantity: 100 },
        { name: '蒜', quantity: 5 }
      ]},
      { name: '蒸蛋羹', category_name: '晚餐素菜', ingredients: [
        { name: '鸡蛋', quantity: 50 },
        { name: '水', quantity: 120 }
      ]},
      { name: '清炒菠菜', category_name: '晚餐素菜', ingredients: [
        { name: '菠菜', quantity: 120 },
        { name: '蒜', quantity: 3 }
      ]},
      { name: '小米粥', category_name: '晚餐主食', ingredients: [
        { name: '小米', quantity: 40 },
        { name: '水', quantity: 250 }
      ]},
      { name: '蒸饺', category_name: '晚餐主食', ingredients: [
        { name: '面粉', quantity: 70 },
        { name: '猪肉', quantity: 40 },
        { name: '白菜', quantity: 30 }
      ]},
      { name: '虾仁蒸蛋', category_name: '晚餐荤菜', ingredients: [
        { name: '虾仁', quantity: 50 },
        { name: '鸡蛋', quantity: 55 },
        { name: '水', quantity: 80 }
      ]},
      { name: '白粥', category_name: '晚餐主食', ingredients: [
        { name: '大米', quantity: 40 },
        { name: '水', quantity: 300 }
      ]},
      { name: '萝卜汤', category_name: '晚餐汤品', ingredients: [
        { name: '萝卜', quantity: 100 },
        { name: '生姜', quantity: 5 }
      ]},
      { name: '炒青菜', category_name: '晚餐素菜', ingredients: [
        { name: '青菜', quantity: 130 },
        { name: '蒜', quantity: 3 }
      ]},
      { name: '蒸南瓜', category_name: '晚餐主食', ingredients: [
        { name: '南瓜', quantity: 120 }
      ]},
      { name: '豆腐汤', category_name: '晚餐汤品', ingredients: [
        { name: '豆腐', quantity: 80 },
        { name: '紫菜', quantity: 5 },
        { name: '虾皮', quantity: 3 }
      ]},
      { name: '炒土豆丝', category_name: '晚餐素菜', ingredients: [
        { name: '土豆', quantity: 120 },
        { name: '青椒', quantity: 30 },
        { name: '醋', quantity: 10 }
      ]},
      { name: '蒸鸡', category_name: '晚餐荤菜', ingredients: [
        { name: '鸡肉', quantity: 80 },
        { name: '生姜', quantity: 5 },
        { name: '葱', quantity: 5 }
      ]},
      { name: '银耳莲子汤', category_name: '晚餐汤品', ingredients: [
        { name: '银耳', quantity: 15 },
        { name: '莲子', quantity: 20 },
        { name: '冰糖', quantity: 8 }
      ]},
      { name: '黑米粥', category_name: '晚餐主食', ingredients: [
        { name: '黑米', quantity: 45 },
        { name: '大米', quantity: 15 },
        { name: '水', quantity: 280 }
      ]},
      { name: '炒三丝', category_name: '晚餐素菜', ingredients: [
        { name: '胡萝卜', quantity: 50 },
        { name: '青椒', quantity: 50 },
        { name: '豆干', quantity: 40 }
      ]},
      { name: '蒸蛋饺', category_name: '晚餐荤菜', ingredients: [
        { name: '鸡蛋', quantity: 40 },
        { name: '猪肉', quantity: 50 },
        { name: '白菜', quantity: 20 }
      ]},
      { name: '绿豆粥', category_name: '晚餐主食', ingredients: [
        { name: '绿豆', quantity: 40 },
        { name: '大米', quantity: 20 },
        { name: '水', quantity: 300 }
      ]},
      { name: '冬瓜汤', category_name: '晚餐汤品', ingredients: [
        { name: '冬瓜', quantity: 120 },
        { name: '虾皮', quantity: 5 }
      ]},
      { name: '蒸玉米', category_name: '晚餐主食', ingredients: [
        { name: '玉米', quantity: 150 }
      ]}
    ];

    try {
      for (const dish of dishes) {
        // Get category ID
        const category = await database.get(
          'SELECT id FROM dish_categories WHERE name = ?',
          [dish.category_name]
        );

        if (category) {
          await database.run(
            'INSERT OR IGNORE INTO dishes (name, category_id, description, ingredients) VALUES (?, ?, ?, ?)',
            [
              dish.name,
              category.id,
              `${dish.name} - 适合幼儿园营养餐`,
              JSON.stringify(dish.ingredients)
            ]
          );
        }
      }
      console.log('Dishes seeded successfully');
    } catch (error) {
      console.error('Error seeding dishes:', error);
    }
  }

  static async createAdditionalIngredients() {
    const ingredients = [
      // Additional ingredients for recipes
      { name: '青椒', category: 'vegetables', unit: 'g', calories_per_100g: 22 },
      { name: '土豆', category: 'vegetables', unit: 'g', calories_per_100g: 77 },
      { name: '萝卜', category: 'vegetables', unit: 'g', calories_per_100g: 16 },
      { name: '冬瓜', category: 'vegetables', unit: 'g', calories_per_100g: 11 },
      { name: '南瓜', category: 'vegetables', unit: 'g', calories_per_100g: 26 },
      { name: '青菜', category: 'vegetables', unit: 'g', calories_per_100g: 15 },
      { name: '菠菜', category: 'vegetables', unit: 'g', calories_per_100g: 23 },
      { name: '胡萝���', category: 'vegetables', unit: 'g', calories_per_100g: 41 },
      { name: '白菜', category: 'vegetables', unit: 'g', calories_per_100g: 17 },
      { name: '西红柿', category: 'vegetables', unit: 'g', calories_per_100g: 18 },
      { name: '黄瓜', category: 'vegetables', unit: 'g', calories_per_100g: 16 },
      { name: '豆干', category: 'vegetables', unit: 'g', calories_per_100g: 140 },
      { name: '豆腐', category: 'vegetables', unit: 'g', calories_per_100g: 76 },
      { name: '紫菜', category: 'vegetables', unit: 'g', calories_per_100g: 207 },
      { name: '银耳', category: 'vegetables', unit: 'g', calories_per_100g: 200 },
      { name: '莲子', category: 'grains', unit: 'g', calories_per_100g: 344 },
      { name: '花生', category: 'grains', unit: 'g', calories_per_100g: 567 },
      { name: '干辣椒', category: 'seasonings', unit: 'g', calories_per_100g: 318 },
      { name: '生姜', category: 'seasonings', unit: 'g', calories_per_100g: 0 },
      { name: '蒜', category: 'seasonings', unit: 'g', calories_per_100g: 133 },
      { name: '葱', category: 'vegetables', unit: 'g', calories_per_100g: 32 },
      { name: '冰糖', category: 'seasonings', unit: 'g', calories_per_100g: 397 },
      { name: '生抽', category: 'seasonings', unit: 'ml', calories_per_100g: 60 },
      { name: '醋', category: 'seasonings', unit: 'ml', calories_per_100g: 18 },
      { name: '虾皮', category: 'seafood', unit: 'g', calories_per_100g: 195 },
      { name: '排骨', category: 'meat', unit: 'g', calories_per_100g: 260 },
      { name: '面粉', category: 'grains', unit: 'g', calories_per_100g: 364 },
      { name: '红薯', category: 'grains', unit: 'g', calories_per_100g: 86 },
      { name: '水', category: 'other', unit: 'ml', calories_per_100g: 0 },
      { name: '黄豆', category: 'grains', unit: 'g', calories_per_100g: 446 },
      { name: '玉米', category: 'grains', unit: 'g', calories_per_100g: 365 },
      { name: '小笼包', category: 'other', unit: 'g', calories_per_100g: 280 },
      { name: '蒸饺', category: 'other', unit: 'g', calories_per_100g: 260 }
    ];

    try {
      for (const ingredient of ingredients) {
        await database.run(
          'INSERT OR IGNORE INTO ingredients (name, category, unit, calories_per_100g) VALUES (?, ?, ?, ?)',
          [ingredient.name, ingredient.category, ingredient.unit, ingredient.calories_per_100g]
        );
      }
      console.log('Additional ingredients seeded successfully');
    } catch (error) {
      console.error('Error seeding additional ingredients:', error);
    }
  }

  static async seedAll() {
    try {
      console.log('Starting database seeding...');
      await this.createDishCategories();
      await this.createDishes();
      await this.createAdditionalIngredients();
      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Database seeding failed:', error);
    }
  }
}

module.exports = SeedData;