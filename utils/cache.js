class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeouts = new Map();
    this.defaultTTL = 3600000; // 1 hour in milliseconds
  }

  set(key, value, ttl = this.defaultTTL) {
    // If key already exists, clear existing timeout
    if (this.cacheTimeouts.has(key)) {
      clearTimeout(this.cacheTimeouts.get(key));
    }

    // Store value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timeout
    const timeout = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.cacheTimeouts.set(key, timeout);
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);

    if (this.cacheTimeouts.has(key)) {
      clearTimeout(this.cacheTimeouts.get(key));
      this.cacheTimeouts.delete(key);
    }
  }

  clear() {
    // Clear all timeouts
    for (const timeout of this.cacheTimeouts.values()) {
      clearTimeout(timeout);
    }

    this.cache.clear();
    this.cacheTimeouts.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }

  size() {
    return this.cache.size;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      activeEntries: this.cache.size - expiredCount,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Estimate memory usage (rough estimate)
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 64; // overhead for timestamp and ttl
    }

    return (totalSize / 1024).toFixed(2) + ' KB';
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    return expiredKeys.length;
  }

  // Get keys matching a pattern
  getKeys(pattern) {
    const regex = new RegExp(pattern);
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  // Delete keys matching a pattern
  deleteByPattern(pattern) {
    const keys = this.getKeys(pattern);
    keys.forEach(key => this.delete(key));
    return keys.length;
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Cache middleware for Express
function cacheMiddleware(ttl = 3600000) {
  return (req, res, next) => {
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cachedData = cacheManager.get(cacheKey);

    if (cachedData) {
      res.set('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      cacheManager.set(cacheKey, data, ttl);
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };

    next();
  };
}

// Function to create cache keys for different data types
const CacheKeys = {
  campuses: 'campuses:all',
  dishes: (type = null) => type ? `dishes:type:${type}` : 'dishes:all',
  ingredients: (category = null) => category ? `ingredients:category:${category}` : 'ingredients:all',
  recipes: (generationId, campusId = null) => {
    return campusId ? `recipes:generation:${generationId}:campus:${campusId}` : `recipes:generation:${generationId}`;
  },
  statistics: (generationId, category) => `statistics:generation:${generationId}:category:${category}`,
  generations: 'generations:all',
  weeklySchedule: (campusId, startDate) => `schedule:campus:${campusId}:week:${startDate}`
};

// Cache invalidation functions
const CacheInvalidation = {
  invalidateCampuses: () => cacheManager.delete(CacheKeys.campuses),

  invalidateDishes: (type = null) => {
    if (type) {
      cacheManager.delete(CacheKeys.dishes(type));
    } else {
      cacheManager.deleteByPattern('dishes:*');
    }
  },

  invalidateIngredients: (category = null) => {
    if (category) {
      cacheManager.delete(CacheKeys.ingredients(category));
    } else {
      cacheManager.deleteByPattern('ingredients:*');
    }
  },

  invalidateRecipes: (generationId = null) => {
    if (generationId) {
      cacheManager.deleteByPattern(`recipes:generation:${generationId}:*`);
    } else {
      cacheManager.deleteByPattern('recipes:*');
    }
  },

  invalidateStatistics: (generationId = null) => {
    if (generationId) {
      cacheManager.deleteByPattern(`statistics:generation:${generationId}:*`);
    } else {
      cacheManager.deleteByPattern('statistics:*');
    }
  },

  invalidateSchedule: (campusId = null) => {
    if (campusId) {
      cacheManager.deleteByPattern(`schedule:campus:${campusId}:*`);
    } else {
      cacheManager.deleteByPattern('schedule:*');
    }
  },

  // Invalidate all cache
  invalidateAll: () => cacheManager.clear(),

  // Invalidate cache after recipe generation
  invalidateAfterGeneration: (generationId) => {
    CacheInvalidation.invalidateRecipes(generationId);
    CacheInvalidation.invalidateStatistics(generationId);
    CacheInvalidation.invalidateSchedule();
  }
};

// Automatic cleanup interval (every 10 minutes)
setInterval(() => {
  const cleanedUp = cacheManager.cleanup();
  if (cleanedUp > 0) {
    console.log(`Cache cleanup: removed ${cleanedUp} expired entries`);
  }
}, 600000);

module.exports = {
  cacheManager,
  cacheMiddleware,
  CacheKeys,
  CacheInvalidation
};