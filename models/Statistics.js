const database = require('../utils/database');

class Statistics {
  static async calculateIngredientStatistics(generationId, ingredientCategory) {
    // First get all campuses to ensure we return data for all campuses
    const campusesSql = 'SELECT id, name FROM campuses ORDER BY name';
    const campuses = await database.all(campusesSql);

    // Get actual ingredient usage data
    const sql = `
      SELECT
        r.campus_id,
        c.name as campus_name,
        i.name as ingredient_name,
        i.category,
        i.unit,
        SUM(ri.quantity) as total_quantity
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      JOIN ingredients i ON ri.ingredient_id = i.id
      JOIN campuses c ON r.campus_id = c.id
      WHERE r.generation_id = ? AND i.category = ?
      GROUP BY r.campus_id, ri.ingredient_id, i.name, i.category, i.unit
      ORDER BY c.name, total_quantity DESC
    `;

    try {
      const ingredientData = await database.all(sql, [generationId, ingredientCategory]);

      // Group data by campus
      const campusData = {};
      ingredientData.forEach(item => {
        if (!campusData[item.campus_id]) {
          campusData[item.campus_id] = {
            campus_id: item.campus_id,
            campus_name: item.campus_name,
            ingredients: []
          };
        }
        campusData[item.campus_id].ingredients.push({
          ingredient_name: item.ingredient_name,
          category: item.category,
          unit: item.unit,
          total_quantity: item.total_quantity
        });
      });

      // Create results for all campuses, including those with zero usage
      const results = [];
      campuses.forEach(campus => {
        if (campusData[campus.id]) {
          // Campus has ingredient data, return detailed breakdown
          campusData[campus.id].ingredients.forEach(ingredient => {
            results.push({
              campus_id: campus.id,
              campus_name: campus.name,
              ingredient_name: ingredient.ingredient_name,
              category: ingredient.category,
              unit: ingredient.unit,
              total_quantity: ingredient.total_quantity
            });
          });
        } else {
          // Campus has no ingredient data for this category, return zero
          results.push({
            campus_id: campus.id,
            campus_name: campus.name,
            ingredient_name: '无相关食材',
            category: ingredientCategory,
            unit: 'g',
            total_quantity: 0
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Error calculating ingredient statistics:', error);
      throw error;
    }
  }

  static async calculateGrainsStatistics(generationId) {
    return this.calculateIngredientStatistics(generationId, 'grains');
  }

  static async calculateFruitsStatistics(generationId) {
    return this.calculateIngredientStatistics(generationId, 'fruits');
  }

  static async calculateMeatSeafoodStatistics(generationId) {
    // Get both meat and seafood categories
    const meatStats = await this.calculateIngredientStatistics(generationId, 'meat');
    const seafoodStats = await this.calculateIngredientStatistics(generationId, 'seafood');

    // Combine and sort by campus and quantity
    const combinedStats = [...meatStats, ...seafoodStats].sort((a, b) => {
      if (a.campus_name !== b.campus_name) {
        return a.campus_name.localeCompare(b.campus_name);
      }
      return b.total_quantity - a.total_quantity;
    });

    // Group by campus to ensure we don't have duplicate "无相关食材" entries for the same campus
    const campusGrouped = {};
    combinedStats.forEach(stat => {
      if (!campusGrouped[stat.campus_id]) {
        campusGrouped[stat.campus_id] = [];
      }
      campusGrouped[stat.campus_id].push(stat);
    });

    // Flatten the grouped data, ensuring at most one "无相关食材" per campus
    const results = [];
    Object.values(campusGrouped).forEach(campusStats => {
      const hasRealIngredients = campusStats.some(stat => stat.total_quantity > 0);
      if (hasRealIngredients) {
        results.push(...campusStats);
      } else {
        // Only add one "无相关食材" entry for this campus
        const zeroEntry = campusStats.find(stat => stat.total_quantity === 0);
        if (zeroEntry) {
          results.push(zeroEntry);
        }
      }
    });

    return results;
  }

  static async cacheStatistics(generationId, ingredientCategory, campusId, totalQuantity, unit) {
    const sql = `
      INSERT OR REPLACE INTO statistics_cache
      (generation_id, ingredient_category, campus_id, total_quantity, unit, calculated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    try {
      return await database.run(sql, [generationId, ingredientCategory, campusId, totalQuantity, unit]);
    } catch (error) {
      console.error('Error caching statistics:', error);
      throw error;
    }
  }

  static async getCachedStatistics(generationId, ingredientCategory) {
    const sql = `
      SELECT sc.*, c.name as campus_name
      FROM statistics_cache sc
      LEFT JOIN campuses c ON sc.campus_id = c.id
      WHERE sc.generation_id = ? AND sc.ingredient_category = ?
      ORDER BY c.name
    `;

    try {
      return await database.all(sql, [generationId, ingredientCategory]);
    } catch (error) {
      console.error('Error getting cached statistics:', error);
      throw error;
    }
  }

  static async generateAndCacheAllStatistics(generationId) {
    const categories = ['grains', 'fruits', 'meat', 'seafood'];
    const results = {};

    try {
      for (const category of categories) {
        let stats;
        if (category === 'meat' || category === 'seafood') {
          // Combine meat and seafood statistics
          if (category === 'meat') {
            continue; // Skip individual meat, will handle with seafood
          }
          stats = await this.calculateMeatSeafoodStatistics(generationId);
          categories.forEach(cat => {
            if (cat === 'meat' || cat === 'seafood') {
              const catStats = stats.filter(s => s.category === cat);
              this.cacheCategoryStatistics(generationId, cat, catStats);
            }
          });
          results['meat_seafood'] = stats;
        } else {
          stats = await this.calculateIngredientStatistics(generationId, category);
          await this.cacheCategoryStatistics(generationId, category, stats);
          results[category] = stats;
        }
      }

      return results;
    } catch (error) {
      console.error('Error generating and caching statistics:', error);
      throw error;
    }
  }

  static async cacheCategoryStatistics(generationId, category, stats) {
    // Get all campuses to ensure we cache zero values for campuses with no data
    const campusesSql = 'SELECT id, name FROM campuses ORDER BY name';
    const campuses = await database.all(campusesSql);

    // Group by campus and calculate totals
    const campusTotals = {};
    stats.forEach(stat => {
      if (!campusTotals[stat.campus_id]) {
        campusTotals[stat.campus_id] = {
          total_quantity: 0,
          unit: stat.unit
        };
      }
      campusTotals[stat.campus_id].total_quantity += stat.total_quantity;
    });

    // Ensure all campuses have an entry in the cache, even with zero values
    for (const campus of campuses) {
      const campusData = campusTotals[campus.id] || {
        total_quantity: 0,
        unit: 'g' // Default unit
      };

      await this.cacheStatistics(
        generationId,
        category,
        campus.id,
        campusData.total_quantity,
        campusData.unit
      );
    }
  }

  static async getStatisticsSummary(generationId) {
    const sql = `
      SELECT
        ingredient_category,
        SUM(total_quantity) as grand_total,
        unit,
        COUNT(*) as campus_count
      FROM statistics_cache
      WHERE generation_id = ?
      GROUP BY ingredient_category, unit
      ORDER BY ingredient_category
    `;

    try {
      return await database.all(sql, [generationId]);
    } catch (error) {
      console.error('Error getting statistics summary:', error);
      throw error;
    }
  }

  static async getLatestGenerationWithStatistics() {
    const sql = `
      SELECT rg.*,
             COUNT(DISTINCT sc.ingredient_category) as statistics_categories
      FROM recipe_generations rg
      LEFT JOIN statistics_cache sc ON rg.id = sc.generation_id
      WHERE rg.status = 'completed'
      GROUP BY rg.id
      HAVING statistics_categories > 0
      ORDER BY rg.generation_date DESC
      LIMIT 1
    `;

    try {
      return await database.get(sql);
    } catch (error) {
      console.error('Error getting latest generation with statistics:', error);
      throw error;
    }
  }

  static async clearCacheForGeneration(generationId) {
    const sql = 'DELETE FROM statistics_cache WHERE generation_id = ?';
    try {
      return await database.run(sql, [generationId]);
    } catch (error) {
      console.error('Error clearing cache for generation:', error);
      throw error;
    }
  }
}

module.exports = Statistics;