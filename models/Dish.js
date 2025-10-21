const database = require('../utils/database');

class Dish {
  static async getAll(activeOnly = true) {
    let sql = 'SELECT d.*, dc.name as category_name, dc.type as meal_type FROM dishes d LEFT JOIN dish_categories dc ON d.category_id = dc.id';
    if (activeOnly) {
      sql += ' WHERE d.is_active = 1';
    }
    sql += ' ORDER BY dc.type, d.name';

    try {
      return await database.all(sql);
    } catch (error) {
      console.error('Error getting dishes:', error);
      throw error;
    }
  }

  static async getByMealType(mealType, activeOnly = true) {
    let sql = `
      SELECT d.*, dc.name as category_name
      FROM dishes d
      LEFT JOIN dish_categories dc ON d.category_id = dc.id
      WHERE dc.type = ?
    `;

    if (activeOnly) {
      sql += ' AND d.is_active = 1';
    }
    sql += ' ORDER BY d.name';

    try {
      return await database.all(sql, [mealType]);
    } catch (error) {
      console.error('Error getting dishes by meal type:', error);
      throw error;
    }
  }

  static async getById(id) {
    const sql = 'SELECT d.*, dc.name as category_name, dc.type as meal_type FROM dishes d LEFT JOIN dish_categories dc ON d.category_id = dc.id WHERE d.id = ?';
    try {
      const dish = await database.get(sql, [id]);
      if (dish) {
        // Parse JSON fields
        if (dish.ingredients) {
          dish.ingredients = JSON.parse(dish.ingredients);
        }
        if (dish.nutrition_info) {
          dish.nutrition_info = JSON.parse(dish.nutrition_info);
        }
      }
      return dish;
    } catch (error) {
      console.error('Error getting dish by id:', error);
      throw error;
    }
  }

  static async getRandomByMealType(mealType, excludeIds = []) {
    let sql = `
      SELECT d.* FROM dishes d
      LEFT JOIN dish_categories dc ON d.category_id = dc.id
      WHERE dc.type = ? AND d.is_active = 1
    `;

    const params = [mealType];

    if (excludeIds.length > 0) {
      sql += ' AND d.id NOT IN (' + excludeIds.map(() => '?').join(',') + ')';
      params.push(...excludeIds);
    }

    sql += ' ORDER BY RANDOM() LIMIT 1';

    try {
      return await database.get(sql, params);
    } catch (error) {
      console.error('Error getting random dish by meal type:', error);
      throw error;
    }
  }

  static async create(dishData) {
    const { name, category_id, description, ingredients, nutrition_info } = dishData;
    const sql = 'INSERT INTO dishes (name, category_id, description, ingredients, nutrition_info) VALUES (?, ?, ?, ?, ?)';

    try {
      return await database.run(sql, [
        name,
        category_id,
        description,
        JSON.stringify(ingredients || []),
        JSON.stringify(nutrition_info || {})
      ]);
    } catch (error) {
      console.error('Error creating dish:', error);
      throw error;
    }
  }

  static async update(id, dishData) {
    const { name, category_id, description, ingredients, nutrition_info, is_active } = dishData;
    const sql = 'UPDATE dishes SET name = ?, category_id = ?, description = ?, ingredients = ?, nutrition_info = ?, is_active = ? WHERE id = ?';

    try {
      return await database.run(sql, [
        name,
        category_id,
        description,
        JSON.stringify(ingredients || []),
        JSON.stringify(nutrition_info || {}),
        is_active,
        id
      ]);
    } catch (error) {
      console.error('Error updating dish:', error);
      throw error;
    }
  }

  static async delete(id) {
    // Soft delete by setting is_active to false
    const sql = 'UPDATE dishes SET is_active = 0 WHERE id = ?';
    try {
      return await database.run(sql, [id]);
    } catch (error) {
      console.error('Error deleting dish:', error);
      throw error;
    }
  }

  static async getUsedInDateRange(campusId, startDate, endDate) {
    const sql = `
      SELECT DISTINCT d.*
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      WHERE r.campus_id = ? AND r.date BETWEEN ? AND ?
      ORDER BY r.date, r.meal_type
    `;

    try {
      return await database.all(sql, [campusId, startDate, endDate]);
    } catch (error) {
      console.error('Error getting used dishes:', error);
      throw error;
    }
  }

  static async getByName(name) {
    const sql = 'SELECT * FROM dishes WHERE name = ? AND is_active = 1';
    try {
      return await database.get(sql, [name]);
    } catch (error) {
      console.error('Error getting dish by name:', error);
      throw error;
    }
  }
}

module.exports = Dish;