const database = require('../utils/database');

class Ingredient {
  static async getAll(category = null) {
    let sql = 'SELECT * FROM ingredients';
    const params = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name';

    try {
      return await database.all(sql, params);
    } catch (error) {
      console.error('Error getting ingredients:', error);
      throw error;
    }
  }

  static async getById(id) {
    const sql = 'SELECT * FROM ingredients WHERE id = ?';
    try {
      return await database.get(sql, [id]);
    } catch (error) {
      console.error('Error getting ingredient by id:', error);
      throw error;
    }
  }

  static async getByName(name) {
    const sql = 'SELECT * FROM ingredients WHERE name = ?';
    try {
      return await database.get(sql, [name]);
    } catch (error) {
      console.error('Error getting ingredient by name:', error);
      throw error;
    }
  }

  static async getByCategory(category) {
    const sql = 'SELECT * FROM ingredients WHERE category = ? ORDER BY name';
    try {
      return await database.all(sql, [category]);
    } catch (error) {
      console.error('Error getting ingredients by category:', error);
      throw error;
    }
  }

  static async create(ingredientData) {
    const { name, category, unit, calories_per_100g } = ingredientData;
    const sql = 'INSERT INTO ingredients (name, category, unit, calories_per_100g) VALUES (?, ?, ?, ?)';

    try {
      return await database.run(sql, [name, category, unit || 'g', calories_per_100g || 0]);
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  }

  static async update(id, ingredientData) {
    const { name, category, unit, calories_per_100g } = ingredientData;
    const sql = 'UPDATE ingredients SET name = ?, category = ?, unit = ?, calories_per_100g = ? WHERE id = ?';

    try {
      return await database.run(sql, [name, category, unit, calories_per_100g, id]);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM ingredients WHERE id = ?';
    try {
      return await database.run(sql, [id]);
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  static async getCategories() {
    const sql = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM ingredients
      GROUP BY category
      ORDER BY category
    `;

    try {
      return await database.all(sql);
    } catch (error) {
      console.error('Error getting ingredient categories:', error);
      throw error;
    }
  }

  static async getUsageStatistics(generationId) {
    const sql = `
      SELECT
        i.category,
        SUM(ri.quantity) as total_quantity,
        i.unit,
        COUNT(DISTINCT ri.recipe_id) as recipe_count
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      JOIN recipes r ON ri.recipe_id = r.id
      WHERE r.generation_id = ?
      GROUP BY i.category, i.unit
      ORDER BY total_quantity DESC
    `;

    try {
      return await database.all(sql, [generationId]);
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      throw error;
    }
  }

  static async getCategorizedUsageStatistics(generationId, category) {
    const sql = `
      SELECT
        i.name,
        i.category,
        SUM(ri.quantity) as total_quantity,
        i.unit,
        COUNT(DISTINCT ri.recipe_id) as recipe_count
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      JOIN recipes r ON ri.recipe_id = r.id
      WHERE r.generation_id = ? AND i.category = ?
      GROUP BY i.id, i.name, i.category, i.unit
      ORDER BY total_quantity DESC
    `;

    try {
      return await database.all(sql, [generationId, category]);
    } catch (error) {
      console.error('Error getting categorized usage statistics:', error);
      throw error;
    }
  }
}

module.exports = Ingredient;