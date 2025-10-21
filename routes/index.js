const express = require('express');
const router = express.Router();

// Main dashboard page
router.get('/', (req, res) => {
  res.render('index', {
    title: '金星食谱管理系统',
    activeTab: 'recipe'
  });
});

// Recipe generation page
router.get('/recipe', (req, res) => {
  res.render('index', {
    title: '食谱生成',
    activeTab: 'recipe'
  });
});

// Grains statistics page
router.get('/grains', (req, res) => {
  res.render('index', {
    title: '杂粮用量统计',
    activeTab: 'grains'
  });
});

// Fruits statistics page
router.get('/fruits', (req, res) => {
  res.render('index', {
    title: '水果用量统计',
    activeTab: 'fruits'
  });
});

// Meat statistics page
router.get('/meat', (req, res) => {
  res.render('index', {
    title: '肉类海鲜用量统计',
    activeTab: 'meat'
  });
});

module.exports = router;