const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(
        path.join(__dirname, '../data/venus_recipe.db'),
        (err) => {
          if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
          } else {
            console.log('Connected to SQLite database.');
            resolve();
          }
        }
      );
    });
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.insertSeedData();

    // Load additional seed data for dishes
    const SeedData = require('./seedData');
    await SeedData.seedAll();
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const tables = `
        -- Campuses table
        CREATE TABLE IF NOT EXISTS campuses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          code TEXT NOT NULL UNIQUE,
          address TEXT,
          capacity INTEGER DEFAULT 100,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Dish categories
        CREATE TABLE IF NOT EXISTS dish_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL CHECK(type IN ('早餐', '上午加餐', '午餐', '下午加餐', '午点'))
        );

        -- Dishes table
        CREATE TABLE IF NOT EXISTS dishes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category_id INTEGER,
          description TEXT,
          ingredients TEXT, -- JSON array of ingredients
          nutrition_info TEXT, -- JSON object with nutrition data
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES dish_categories(id)
        );

        -- Ingredients table
        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL CHECK(category IN ('grains', 'vegetables', 'meat', 'seafood', 'fruits', 'dairy', 'seasonings', 'other')),
          unit TEXT DEFAULT 'g',
          calories_per_100g REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Recipe generations table
        CREATE TABLE IF NOT EXISTS recipe_generations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          generation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
          total_recipes INTEGER DEFAULT 0,
          notes TEXT
        );

        -- Recipes table
        CREATE TABLE IF NOT EXISTS recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campus_id INTEGER NOT NULL,
          dish_id INTEGER NOT NULL,
          date DATE NOT NULL,
          meal_type TEXT NOT NULL CHECK(meal_type IN ('早餐', '上午加餐', '午餐', '下午加餐', '午点')),
          generation_id INTEGER,
          servings INTEGER DEFAULT 100,
          ingredient_quantities TEXT, -- JSON object with ingredient quantities
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (campus_id) REFERENCES campuses(id),
          FOREIGN KEY (dish_id) REFERENCES dishes(id),
          FOREIGN KEY (generation_id) REFERENCES recipe_generations(id),
          UNIQUE(campus_id, date, meal_type)
        );

        -- Recipe ingredients (junction table for detailed tracking)
        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipe_id INTEGER NOT NULL,
          ingredient_id INTEGER NOT NULL,
          quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          FOREIGN KEY (recipe_id) REFERENCES recipes(id),
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
        );

        -- Statistics cache table
        CREATE TABLE IF NOT EXISTS statistics_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          generation_id INTEGER NOT NULL,
          ingredient_category TEXT NOT NULL,
          campus_id INTEGER,
          total_quantity REAL NOT NULL,
          unit TEXT NOT NULL,
          calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (generation_id) REFERENCES recipe_generations(id),
          FOREIGN KEY (campus_id) REFERENCES campuses(id),
          UNIQUE(generation_id, ingredient_category, campus_id)
        );
      `;

      this.db.exec(tables, (err) => {
        if (err) {
          console.error('Error creating tables:', err.message);
          reject(err);
        } else {
          console.log('Database tables created successfully.');
          resolve();
        }
      });
    });
  }

  async insertSeedData() {
    return new Promise((resolve, reject) => {
      // Check if data already exists
      this.db.get("SELECT COUNT(*) as count FROM campuses", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count > 0) {
          console.log('Seed data already exists.');
          resolve();
          return;
        }

        const seedData = `
          -- Insert campuses
          INSERT OR IGNORE INTO campuses (name, code, address, capacity) VALUES
          ('金星幼儿园总园', 'JX001', '北京市朝阳区金星路1号', 200),
          ('金星幼儿园分园A', 'JX002', '北京市朝阳区金星路2号', 150),
          ('金星幼儿园分园B', 'JX003', '北京市朝阳区金星路3号', 180),
          ('金星幼儿园分园C', 'JX004', '北京市朝阳区金星路4号', 120);

          -- Insert dish categories
          INSERT OR IGNORE INTO dish_categories (name, type) VALUES
          ('早餐主食', '早餐'),
          ('早餐配菜', '早餐'),
          ('上午加餐水果', '上午加餐'),
          ('午餐主食', '午餐'),
          ('午餐荤菜', '午餐'),
          ('午餐素菜', '午餐'),
          ('午餐汤品', '午餐'),
          ('下午加餐点心', '下午加餐'),
          ('下午加餐饮品', '下午加餐'),
          ('午点主食', '午点'),
          ('午点心品', '午点'),
          ('午点饮品', '午点'),
          ('午点水果', '午点');

          -- Insert ingredients
          INSERT OR IGNORE INTO ingredients (name, category, unit, calories_per_100g) VALUES
          -- Grains (杂粮)
          ('大米', 'grains', 'g', 130),
          ('小米', 'grains', 'g', 140),
          ('玉米', 'grains', 'g', 86),
          ('燕麦', 'grains', 'g', 389),
          ('红豆', 'grains', 'g', 324),
          ('绿豆', 'grains', 'g', 316),
          ('黑米', 'grains', 'g', 343),
          ('糯米', 'grains', 'g', 344),

          -- Vegetables
          ('白菜', 'vegetables', 'g', 17),
          ('萝卜', 'vegetables', 'g', 16),
          ('胡萝卜', 'vegetables', 'g', 41),
          ('黄瓜', 'vegetables', 'g', 16),
          ('西红柿', 'vegetables', 'g', 18),
          ('菠菜', 'vegetables', 'g', 23),
          ('土豆', 'vegetables', 'g', 77),
          ('冬瓜', 'vegetables', 'g', 11),

          -- Fruits (水果)
          ('苹果', 'fruits', 'g', 52),
          ('香蕉', 'fruits', 'g', 89),
          ('橙子', 'fruits', 'g', 47),
          ('梨', 'fruits', 'g', 57),
          ('葡萄', 'fruits', 'g', 69),
          ('西瓜', 'fruits', 'g', 30),
          ('草莓', 'fruits', 'g', 32),
          ('桃子', 'fruits', 'g', 39),

          -- Meat (肉类)
          ('猪肉', 'meat', 'g', 242),
          ('牛肉', 'meat', 'g', 250),
          ('鸡肉', 'meat', 'g', 165),
          ('鸭肉', 'meat', 'g', 240),

          -- Seafood (海鲜)
          ('鱼', 'seafood', 'g', 127),
          ('虾', 'seafood', 'g', 99),
          ('螃蟹', 'seafood', 'g', 95),

          -- Dairy
          ('牛奶', 'dairy', 'ml', 42),
          ('酸奶', 'dairy', 'g', 59),
          ('鸡蛋', 'dairy', 'g', 155);
        `;

        this.db.exec(seedData, (err) => {
          if (err) {
            console.error('Error inserting seed data:', err.message);
            reject(err);
          } else {
            console.log('Seed data inserted successfully.');
            resolve();
          }
        });
      });
    });
  }

  // Helper method to run queries
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed.');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Create and export singleton instance
const database = new Database();
module.exports = database;