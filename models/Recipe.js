const database = require('../utils/database');

class Recipe {
  static async create(recipeData) {
    const { campus_id, dish_id, date, meal_type, generation_id, servings, ingredient_quantities } = recipeData;

    const sql = `
      INSERT INTO recipes (campus_id, dish_id, date, meal_type, generation_id, servings, ingredient_quantities)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      console.log('Creating recipe with ingredient_quantities:', ingredient_quantities);
      const result = await database.run(sql, [
        campus_id,
        dish_id,
        date,
        meal_type,
        generation_id,
        servings || 100,
        JSON.stringify(ingredient_quantities || {})
      ]);

      // Create recipe_ingredients records for statistics
      if (ingredient_quantities && Object.keys(ingredient_quantities).length > 0) {
        await this.createRecipeIngredients(result.id, ingredient_quantities);
      }

      return result;
    } catch (error) {
      // Handle UNIQUE constraint violation by updating existing recipe
      if (error.code === 'SQLITE_CONSTRAINT') {
        console.log('Recipe already exists, updating existing recipe');
        return await this.upsertRecipe(recipeData);
      }
      console.error('Error creating recipe:', error);
      throw error;
    }
  }

  static async upsertRecipe(recipeData) {
    const { campus_id, dish_id, date, meal_type, generation_id, servings, ingredient_quantities } = recipeData;

    // First get the existing recipe ID
    const existingRecipe = await this.getByCampusDateAndMeal(campus_id, date, meal_type);
    if (!existingRecipe) {
      throw new Error('Cannot find existing recipe to update');
    }

    const sql = `
      UPDATE recipes
      SET dish_id = ?, generation_id = ?, servings = ?, ingredient_quantities = ?
      WHERE campus_id = ? AND date = ? AND meal_type = ?
    `;

    try {
      const result = await database.run(sql, [
        dish_id,
        generation_id,
        servings || 100,
        JSON.stringify(ingredient_quantities || {}),
        campus_id,
        date,
        meal_type
      ]);

      // Update recipe_ingredients records for statistics
      if (ingredient_quantities && Object.keys(ingredient_quantities).length > 0) {
        // Delete existing recipe_ingredients
        await this.deleteRecipeIngredients(existingRecipe.id);
        // Create new recipe_ingredients records
        await this.createRecipeIngredients(existingRecipe.id, ingredient_quantities);
      }

      return { id: existingRecipe.id, changes: result.changes };
    } catch (error) {
      console.error('Error upserting recipe:', error);
      throw error;
    }
  }

  static async createRecipeIngredients(recipeId, ingredientQuantities) {
    const Ingredient = require('./Ingredient');

    for (const [ingredientName, quantityData] of Object.entries(ingredientQuantities)) {
      try {
        // Get ingredient from database
        const ingredient = await Ingredient.getByName(ingredientName);
        if (ingredient) {
          const sql = `
            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
            VALUES (?, ?, ?, ?)
          `;

          await database.run(sql, [
            recipeId,
            ingredient.id,
            quantityData.quantity || 0,
            quantityData.unit || 'g'
          ]);
        }
      } catch (error) {
        console.error(`Error creating recipe ingredient for ${ingredientName}:`, error);
        // Continue with other ingredients even if one fails
      }
    }
  }

  static async getByGeneration(generationId) {
    const sql = `
      SELECT r.*, c.name as campus_name, d.name as dish_name, dc.type as meal_type_category
      FROM recipes r
      JOIN campuses c ON r.campus_id = c.id
      JOIN dishes d ON r.dish_id = d.id
      JOIN dish_categories dc ON d.category_id = dc.id
      WHERE r.generation_id = ?
      ORDER BY c.name, r.date, r.meal_type
    `;

    try {
      const recipes = await database.all(sql, [generationId]);
      // Parse JSON fields
      return recipes.map(recipe => {
        if (recipe.ingredient_quantities) {
          recipe.ingredient_quantities = JSON.parse(recipe.ingredient_quantities);
        }
        return recipe;
      });
    } catch (error) {
      console.error('Error getting recipes by generation:', error);
      throw error;
    }
  }

  static async getByCampusAndDateRange(campusId, startDate, endDate) {
    const sql = `
      SELECT r.*, d.name as dish_name, dc.name as category_name, dc.type as meal_type_category
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      JOIN dish_categories dc ON d.category_id = dc.id
      WHERE r.campus_id = ? AND r.date BETWEEN ? AND ?
      ORDER BY r.date, r.meal_type
    `;

    try {
      const recipes = await database.all(sql, [campusId, startDate, endDate]);
      return recipes.map(recipe => {
        if (recipe.ingredient_quantities) {
          recipe.ingredient_quantities = JSON.parse(recipe.ingredient_quantities);
        }
        return recipe;
      });
    } catch (error) {
      console.error('Error getting recipes by campus and date range:', error);
      throw error;
    }
  }

  static async getByCampusDateAndMeal(campusId, date, mealType) {
    const sql = `
      SELECT r.*, d.name as dish_name, d.ingredients as dish_ingredients
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      WHERE r.campus_id = ? AND r.date = ? AND r.meal_type = ?
    `;

    try {
      const recipe = await database.get(sql, [campusId, date, mealType]);
      if (recipe) {
        if (recipe.ingredient_quantities) {
          recipe.ingredient_quantities = JSON.parse(recipe.ingredient_quantities);
        }
        if (recipe.dish_ingredients) {
          recipe.dish_ingredients = JSON.parse(recipe.dish_ingredients);
        }
      }
      return recipe;
    } catch (error) {
      console.error('Error getting recipe by campus, date and meal:', error);
      throw error;
    }
  }

  static async getLatestGeneration() {
    const sql = 'SELECT * FROM recipe_generations ORDER BY generation_date DESC LIMIT 1';
    try {
      return await database.get(sql);
    } catch (error) {
      console.error('Error getting latest generation:', error);
      throw error;
    }
  }

  static async getGenerationById(generationId) {
    const sql = 'SELECT * FROM recipe_generations WHERE id = ?';
    try {
      return await database.get(sql, [generationId]);
    } catch (error) {
      console.error('Error getting generation by id:', error);
      throw error;
    }
  }

  static async createGeneration(generationData) {
    const { start_date, end_date, notes } = generationData;
    const sql = 'INSERT INTO recipe_generations (start_date, end_date, notes) VALUES (?, ?, ?)';

    try {
      return await database.run(sql, [start_date, end_date, notes]);
    } catch (error) {
      console.error('Error creating recipe generation:', error);
      throw error;
    }
  }

  static async updateGenerationStatus(generationId, status, totalRecipes = 0) {
    const sql = 'UPDATE recipe_generations SET status = ?, total_recipes = ? WHERE id = ?';

    try {
      return await database.run(sql, [status, totalRecipes, generationId]);
    } catch (error) {
      console.error('Error updating generation status:', error);
      throw error;
    }
  }

  static async deleteByGeneration(generationId) {
    const sql = 'DELETE FROM recipes WHERE generation_id = ?';
    try {
      return await database.run(sql, [generationId]);
    } catch (error) {
      console.error('Error deleting recipes by generation:', error);
      throw error;
    }
  }

  static async getUsedDishesInWeek(campusId, startDate, endDate) {
    const sql = `
      SELECT DISTINCT r.dish_id, d.name
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      WHERE r.campus_id = ? AND r.date BETWEEN ? AND ?
    `;

    try {
      return await database.all(sql, [campusId, startDate, endDate]);
    } catch (error) {
      console.error('Error getting used dishes in week:', error);
      throw error;
    }
  }

  static async getIngredientQuantitiesByGeneration(generationId, ingredientCategory = null) {
    let sql = `
      SELECT
        r.campus_id,
        c.name as campus_name,
        ri.ingredient_id,
        i.name as ingredient_name,
        i.category as ingredient_category,
        i.unit,
        SUM(ri.quantity) as total_quantity
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      JOIN campuses c ON r.campus_id = c.id
      WHERE r.generation_id = ?
    `;

    const params = [generationId];

    if (ingredientCategory) {
      sql += ' AND i.category = ?';
      params.push(ingredientCategory);
    }

    sql += ' GROUP BY r.campus_id, ri.ingredient_id, i.name, i.category, i.unit ORDER BY c.name, i.category, i.name';

    try {
      return await database.all(sql, params);
    } catch (error) {
      console.error('Error getting ingredient quantities:', error);
      throw error;
    }
  }

  static async getById(id) {
    const sql = `
      SELECT r.*, d.name as dish_name, d.ingredients as dish_ingredients, c.name as campus_name
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      JOIN campuses c ON r.campus_id = c.id
      WHERE r.id = ?
    `;

    try {
      const recipe = await database.get(sql, [id]);
      if (recipe) {
        if (recipe.ingredient_quantities) {
          recipe.ingredient_quantities = JSON.parse(recipe.ingredient_quantities);
        }
        if (recipe.dish_ingredients) {
          recipe.dish_ingredients = JSON.parse(recipe.dish_ingredients);
        }
      }
      return recipe;
    } catch (error) {
      console.error('Error getting recipe by id:', error);
      throw error;
    }
  }

  static async update(id, recipeData) {
    const { dish_id, date, meal_type, servings, ingredient_quantities } = recipeData;

    const sql = `
      UPDATE recipes
      SET dish_id = ?, date = ?, meal_type = ?, servings = ?, ingredient_quantities = ?
      WHERE id = ?
    `;

    try {
      console.log('Updating recipe with ingredient_quantities:', ingredient_quantities);
      const result = await database.run(sql, [
        dish_id,
        date,
        meal_type,
        servings || 100,
        JSON.stringify(ingredient_quantities || {}),
        id
      ]);

      // Update recipe_ingredients records for statistics
      if (ingredient_quantities && Object.keys(ingredient_quantities).length > 0) {
        // Delete existing recipe_ingredients
        await this.deleteRecipeIngredients(id);
        // Create new recipe_ingredients records
        await this.createRecipeIngredients(id, ingredient_quantities);
      }

      return result;
    } catch (error) {
      console.error('Error updating recipe:', error);
      throw error;
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM recipes WHERE id = ?';

    try {
      // Delete related recipe_ingredients first
      await this.deleteRecipeIngredients(id);

      // Delete the recipe
      const result = await database.run(sql, [id]);
      return result;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      throw error;
    }
  }

  static async deleteRecipeIngredients(recipeId) {
    const sql = 'DELETE FROM recipe_ingredients WHERE recipe_id = ?';
    try {
      await database.run(sql, [recipeId]);
    } catch (error) {
      console.error('Error deleting recipe ingredients:', error);
      throw error;
    }
  }

  static async getAllRecipes(campusId = null, startDate = null, endDate = null) {
    let sql = `
      SELECT r.*, d.name as dish_name, c.name as campus_name, dc.type as meal_type_category
      FROM recipes r
      JOIN dishes d ON r.dish_id = d.id
      JOIN campuses c ON r.campus_id = c.id
      JOIN dish_categories dc ON d.category_id = dc.id
      WHERE 1=1
    `;

    const params = [];

    if (campusId) {
      sql += ' AND r.campus_id = ?';
      params.push(campusId);
    }

    if (startDate) {
      sql += ' AND r.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND r.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY r.date DESC, r.meal_type, c.name';

    try {
      const recipes = await database.all(sql, params);
      return recipes.map(recipe => {
        if (recipe.ingredient_quantities) {
          recipe.ingredient_quantities = JSON.parse(recipe.ingredient_quantities);
        }
        return recipe;
      });
    } catch (error) {
      console.error('Error getting all recipes:', error);
      throw error;
    }
  }
}

module.exports = Recipe;