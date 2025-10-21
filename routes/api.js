const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const RecipeGenerator = require('../utils/recipeGenerator');
const Campus = require('../models/Campus');
const Recipe = require('../models/Recipe');
const Statistics = require('../models/Statistics');
const ExcelImporter = require('../utils/excelImporter');
const { cacheManager, cacheMiddleware, CacheKeys, CacheInvalidation } = require('../utils/cache');
const Dish = require('../models/Dish');

// Initialize recipe generator
const recipeGenerator = new RecipeGenerator();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持上传Excel文件 (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// API routes for recipe generation
router.post('/generate-recipes', async (req, res) => {
  try {
    const { campuses, startDate, endDate } = req.body;

    // Validate request
    const validation = recipeGenerator.validateGenerationRequest(campuses, startDate, endDate);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Generate recipes
    const result = await recipeGenerator.generateRecipes(campuses, startDate, endDate);

    // Invalidate cache after successful generation
    if (result.success && result.generationId) {
      CacheInvalidation.invalidateAfterGeneration(result.generationId);
    }

    res.json({
      success: true,
      message: 'Recipe generation completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Recipe generation failed',
      error: error.message
    });
  }
});

// API routes for statistics
router.get('/statistics/grains', async (req, res) => {
  try {
    const { generationId } = req.query;

    if (!generationId) {
      // Get latest generation with statistics
      const latestGen = await Statistics.getLatestGenerationWithStatistics();
      if (!latestGen) {
        return res.json({
          success: true,
          data: [],
          message: 'No statistics available'
        });
      }
      const stats = await Statistics.calculateGrainsStatistics(latestGen.id);
      return res.json({
        success: true,
        data: stats,
        generationId: latestGen.id
      });
    }

    const stats = await Statistics.calculateGrainsStatistics(generationId);
    res.json({
      success: true,
      data: stats,
      generationId
    });

  } catch (error) {
    console.error('Grains statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/statistics/fruits', async (req, res) => {
  try {
    const { generationId } = req.query;

    if (!generationId) {
      const latestGen = await Statistics.getLatestGenerationWithStatistics();
      if (!latestGen) {
        return res.json({
          success: true,
          data: [],
          message: 'No statistics available'
        });
      }
      const stats = await Statistics.calculateFruitsStatistics(latestGen.id);
      return res.json({
        success: true,
        data: stats,
        generationId: latestGen.id
      });
    }

    const stats = await Statistics.calculateFruitsStatistics(generationId);
    res.json({
      success: true,
      data: stats,
      generationId
    });

  } catch (error) {
    console.error('Fruits statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/statistics/meat', async (req, res) => {
  try {
    const { generationId } = req.query;

    if (!generationId) {
      const latestGen = await Statistics.getLatestGenerationWithStatistics();
      if (!latestGen) {
        return res.json({
          success: true,
          data: [],
          message: 'No statistics available'
        });
      }
      const stats = await Statistics.calculateMeatSeafoodStatistics(latestGen.id);
      return res.json({
        success: true,
        data: stats,
        generationId: latestGen.id
      });
    }

    const stats = await Statistics.calculateMeatSeafoodStatistics(generationId);
    res.json({
      success: true,
      data: stats,
      generationId
    });

  } catch (error) {
    console.error('Meat statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes for campus management
router.get('/campuses', cacheMiddleware(3600000), async (req, res) => {
  try {
    // Check cache first
    const cachedData = cacheManager.get(CacheKeys.campuses);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const campuses = await Campus.getAll();
    const responseData = {
      success: true,
      data: campuses
    };

    // Cache the response
    cacheManager.set(CacheKeys.campuses, campuses, 3600000); // 1 hour

    res.json(responseData);
  } catch (error) {
    console.error('Campus retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes for recipe retrieval
router.get('/recipes', async (req, res) => {
  try {
    const { campusId, mealType } = req.query;

    let recipes;
    if (campusId || mealType) {
      recipes = await Recipe.getAllRecipes(
        campusId ? parseInt(campusId) : null,
        null, // No date filtering
        null  // No date filtering
      );

      // Filter by meal type if provided
      if (mealType) {
        recipes = recipes.filter(recipe => recipe.meal_type === mealType);
      }
    } else {
      recipes = await Recipe.getAllRecipes();
    }

    res.json({
      success: true,
      data: recipes
    });

  } catch (error) {
    console.error('Recipe retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes for generations
router.get('/generations', async (req, res) => {
  try {
    const sql = 'SELECT * FROM recipe_generations ORDER BY generation_date DESC';
    const generations = await require('../utils/database').all(sql);
    res.json({
      success: true,
      data: generations
    });
  } catch (error) {
    console.error('Generations retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API routes for recipe editing
router.get('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.getById(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Recipe retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.put('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dish_id, dish_name, date, meal_type, servings, ingredient_quantities } = req.body;

    // Support both dish_id and dish_name for flexibility
    let finalDishId = dish_id;

    // If dish_name is provided, find the corresponding dish_id
    if (dish_name && !dish_id) {
      const dish = await Dish.getByName(dish_name);
      if (!dish) {
        return res.status(400).json({
          success: false,
          message: `菜品 "${dish_name}" 不存在`
        });
      }
      finalDishId = dish.id;
    }

    // Validate required fields
    if (!finalDishId || !date || !meal_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dish_id or dish_name, date, meal_type'
      });
    }

    // Check if recipe exists
    const existingRecipe = await Recipe.getById(id);
    if (!existingRecipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Update recipe
    const result = await Recipe.update(id, {
      dish_id: finalDishId,
      date,
      meal_type,
      servings: servings || 100,
      ingredient_quantities
    });

    // Invalidate cache after successful update
    if (existingRecipe.generation_id) {
      CacheInvalidation.invalidateAfterGeneration(existingRecipe.generation_id);
    }

    res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: { id, changes: result.changes }
    });

  } catch (error) {
    console.error('Recipe update error:', error);
    res.status(500).json({
      success: false,
      message: 'Recipe update failed',
      error: error.message
    });
  }
});

router.delete('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if recipe exists
    const existingRecipe = await Recipe.getById(id);
    if (!existingRecipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Delete recipe
    const result = await Recipe.delete(id);

    // Invalidate cache after successful deletion
    if (existingRecipe.generation_id) {
      CacheInvalidation.invalidateAfterGeneration(existingRecipe.generation_id);
    }

    res.json({
      success: true,
      message: 'Recipe deleted successfully',
      data: { id, changes: result.changes }
    });

  } catch (error) {
    console.error('Recipe deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Recipe deletion failed',
      error: error.message
    });
  }
});

// API route to get all recipes (for management)
router.get('/recipes', async (req, res) => {
  try {
    const { campusId, startDate, endDate } = req.query;
    const recipes = await Recipe.getAllRecipes(
      campusId ? parseInt(campusId) : null,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: recipes
    });

  } catch (error) {
    console.error('Recipes retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API route to get available dishes for editing
router.get('/dishes', async (req, res) => {
  try {
    const { mealType } = req.query;

    let sql = `
      SELECT d.*, dc.name as category_name, dc.type as meal_type_category
      FROM dishes d
      JOIN dish_categories dc ON d.category_id = dc.id
    `;

    const params = [];

    if (mealType) {
      sql += ' WHERE dc.type = ?';
      params.push(mealType);
    }

    sql += ' ORDER BY d.name';

    const dishes = await require('../utils/database').all(sql, params);

    res.json({
      success: true,
      data: dishes
    });

  } catch (error) {
    console.error('Dishes retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API route to create recipe with custom dish
router.post('/recipes', async (req, res) => {
  try {
    const { campus_id, dish_name, date, meal_type, servings = 100 } = req.body;

    // Validate required fields
    if (!campus_id || !dish_name || !date || !meal_type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: campus_id, dish_name, date, meal_type'
      });
    }

    // Check if dish already exists
    let dish = await Dish.getByName(dish_name);

    // If dish doesn't exist, create a new one
    if (!dish) {
      // Get a default category for the meal type
      const categoryResult = await require('../utils/database').get(
        'SELECT id FROM dish_categories WHERE type = ? LIMIT 1',
        [meal_type]
      );

      if (!categoryResult) {
        return res.status(400).json({
          success: false,
          message: 'No category found for meal type: ' + meal_type
        });
      }

      const dishData = {
        name: dish_name,
        category_id: categoryResult.id,
        description: `自定义${meal_type}菜品`,
        ingredients: [],
        nutrition_info: {}
      };

      const dishResult = await Dish.create(dishData);
      dish = { id: dishResult.id, name: dish_name };
    }

    // Create recipe
    const recipeData = {
      campus_id: parseInt(campus_id),
      dish_id: dish.id,
      date,
      meal_type,
      servings: parseInt(servings),
      ingredient_quantities: {}
    };

    const result = await Recipe.create(recipeData);

    // Create generation record for the recipe
    const generationData = {
      start_date: date,
      end_date: date,
      notes: `手动添加食谱: ${dish_name}`
    };

    const generationResult = await Recipe.createGeneration(generationData);

    // Update recipe with generation_id
    await require('../utils/database').run(
      'UPDATE recipes SET generation_id = ? WHERE id = ?',
      [generationResult.id, result.id]
    );

    // Invalidate cache
    CacheInvalidation.invalidateAfterGeneration(generationResult.id);

    res.json({
      success: true,
      message: '食谱创建成功',
      data: {
        recipe_id: result.id,
        dish_id: dish.id,
        dish_name: dish.name,
        generation_id: generationResult.id
      }
    });

  } catch (error) {
    console.error('Recipe creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Recipe creation failed',
      error: error.message
    });
  }
});


module.exports = router;