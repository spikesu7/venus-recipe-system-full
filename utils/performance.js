class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.memoryUsageHistory = [];
    this.maxHistorySize = 100;
  }

  // Start timing an operation
  startTimer(operationName) {
    const startTime = process.hrtime.bigint();
    return {
      operationName,
      startTime,
      end: () => this.endTimer(startTime, operationName)
    };
  }

  // End timing and record metrics
  endTimer(startTime, operationName) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    this.recordMetric(operationName, duration);
    return duration;
  }

  // Record a performance metric
  recordMetric(operationName, duration) {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        recentDurations: []
      });
    }

    const metric = this.metrics.get(operationName);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = metric.totalDuration / metric.count;

    // Keep only recent 50 durations for trend analysis
    metric.recentDurations.push(duration);
    if (metric.recentDurations.length > 50) {
      metric.recentDurations.shift();
    }

    // Log slow operations
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }

    return metric;
  }

  // Get metrics for an operation
  getMetrics(operationName) {
    return this.metrics.get(operationName);
  }

  // Get all metrics
  getAllMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics.entries()) {
      result[name] = {
        ...metric,
        recentAvg: metric.recentDurations.length > 0
          ? metric.recentDurations.reduce((a, b) => a + b, 0) / metric.recentDurations.length
          : 0
      };
    }
    return result;
  }

  // Record memory usage
  recordMemoryUsage() {
    const usage = process.memoryUsage();
    const timestamp = Date.now();

    const memoryData = {
      timestamp,
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    };

    this.memoryUsageHistory.push(memoryData);

    // Keep only recent history
    if (this.memoryUsageHistory.length > this.maxHistorySize) {
      this.memoryUsageHistory.shift();
    }

    return memoryData;
  }

  // Get memory usage history
  getMemoryUsageHistory(limit = 50) {
    return this.memoryUsageHistory.slice(-limit);
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    return process.memoryUsage();
  }

  // Check for memory leaks (simplified)
  checkMemoryLeaks() {
    if (this.memoryUsageHistory.length < 10) {
      return { hasLeak: false, message: 'Insufficient data' };
    }

    const recent = this.memoryUsageHistory.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    const heapGrowth = newest.heapUsed - oldest.heapUsed;
    const growthRate = heapGrowth / oldest.heapUsed;

    if (growthRate > 0.5) { // 50% growth in recent samples
      return {
        hasLeak: true,
        message: `Heap usage grew by ${(growthRate * 100).toFixed(2)}% in recent samples`,
        growthRate,
        heapGrowth
      };
    }

    return { hasLeak: false, growthRate };
  }

  // Get performance summary
  getPerformanceSummary() {
    const metrics = this.getAllMetrics();
    const memoryUsage = this.getCurrentMemoryUsage();
    const memoryLeakCheck = this.checkMemoryLeaks();

    return {
      timestamp: new Date().toISOString(),
      operations: Object.keys(metrics).length,
      slowOperations: Object.entries(metrics)
        .filter(([name, metric]) => metric.avgDuration > this.slowQueryThreshold)
        .map(([name, metric]) => ({ name, avgDuration: metric.avgDuration })),
      memoryUsage: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB'
      },
      memoryLeak: memoryLeakCheck,
      topSlowOperations: Object.entries(metrics)
        .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
        .slice(0, 5)
        .map(([name, metric]) => ({
          name,
          avgDuration: metric.avgDuration.toFixed(2) + 'ms',
          count: metric.count,
          maxDuration: metric.maxDuration.toFixed(2) + 'ms'
        }))
    };
  }

  // Reset all metrics
  reset() {
    this.metrics.clear();
    this.memoryUsageHistory = [];
  }

  // Export metrics for monitoring systems
  exportMetrics() {
    return {
      timestamp: Date.now(),
      metrics: this.getAllMetrics(),
      memory: this.getMemoryUsageHistory(),
      summary: this.getPerformanceSummary()
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Performance monitoring middleware
function performanceMiddleware(operationName) {
  return (req, res, next) => {
    const timer = performanceMonitor.startTimer(operationName || `${req.method} ${req.route?.path || req.path}`);

    // Override res.end to capture completion
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = timer.end();
      res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      originalEnd.apply(this, args);
    };

    next();
  };
}

// Automatic memory monitoring
setInterval(() => {
  performanceMonitor.recordMemoryUsage();
  const leakCheck = performanceMonitor.checkMemoryLeaks();
  if (leakCheck.hasLeak) {
    console.warn('Memory leak detected:', leakCheck.message);
  }
}, 30000); // Check every 30 seconds

// Performance monitoring for database operations
function monitorDatabaseOperation(operationName, operation) {
  return async (...args) => {
    const timer = performanceMonitor.startTimer(`DB:${operationName}`);
    try {
      const result = await operation(...args);
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  };
}

module.exports = {
  performanceMonitor,
  performanceMiddleware,
  monitorDatabaseOperation
};