# 金星食谱管理系统 - Render部署指南

## 🚀 快速部署到Render

### 前置条件
1. GitHub账户
2. Render账户 (https://render.com)

### 部署步骤

#### 1. 推送代码到GitHub
```bash
git add .
git commit -m "准备Render部署"
git push origin main
```

#### 2. 在Render创建新服务
1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New +" → "Web Service"
3. 连接GitHub仓库
4. 选择配置：
   - **Name**: `venus-recipe-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

#### 3. 配置环境变量
在Render控制台添加以下环境变量：
```
NODE_ENV=production
PORT=10000
SESSION_SECRET=your-secret-key-here
DB_PATH=./data/venus_recipe.db
```

#### 4. 部署完成
- Render会自动构建和部署
- 部署完成后访问: `https://venus-recipe-system.onrender.com`

## 📁 项目结构
```
金星食谱/
├── app.js                 # 主应用文件
├── package.json           # 项目配置
├── render.yaml           # Render配置文件
├── Procfile              # Render启动文件
├── .env.production       # 生产环境变量模板
├── data/                 # 数据库目录
├── models/               # 数据模型
├── routes/               # 路由定义
├── utils/                # 工具函数
├── views/                # EJS模板
└── public/               # 静态资源
```

## 🔧 功能特性

### 完整功能版本
- ✅ **5餐制管理**: 早餐、上午加餐、午餐、下午加餐、午点
- ✅ **多园区支持**: 真实的数据库管理
- ✅ **营养统计**: 动态统计分析
- ✅ **食谱管理**: 增删改查功能
- ✅ **数据持久化**: SQLite数据库
- ✅ **文件上传**: Excel导入功能
- ✅ **用户会话**: 登录状态管理

## 🆘 故障排除

### 常见问题
1. **部署失败**: 检查package.json和启动脚本
2. **数据库错误**: 确保data目录有写入权限
3. **端口问题**: Render使用动态端口，不要硬编码

### 监控日志
在Render控制台查看实时日志，诊断问题。

---

**金星食谱管理系统** - 完整功能的云端版本！