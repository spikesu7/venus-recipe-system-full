const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const database = require('./utils/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
async function initializeApp() {
  try {
    await database.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'venus-recipe-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Start server
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`金星食谱管理系统 running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    if (process.env.NODE_ENV === 'production') {
      console.log(`Production URL: https://your-app-url.onrender.com`);
    } else {
      console.log(`Local URL: http://localhost:${PORT}`);
    }
    console.log('Database: SQLite');
  });
}).catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

module.exports = app;