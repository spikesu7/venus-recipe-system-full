# 金星食谱管理系统 - Vercel部署指南

## 🚀 快速部署到Vercel

### 前置条件
- GitHub账户
- Vercel账户 (https://vercel.com)

### 🌟 为什么选择Vercel？
- ✅ **国内可直接访问** - 无需VPN
- ✅ **速度快** - 全球CDN加速
- ✅ **免费** - 个人项目免费使用
- ✅ **自动部署** - Git推送后自动更新
- ✅ **Node.js支持完美** - 无服务器函数

---

## 📋 部署步骤

### 第1步：注册Vercel账户
1. **访问**：https://vercel.com
2. **点击 "Sign Up"**
3. **选择 "Continue with GitHub"**（推荐）
4. **授权Vercel访问GitHub**
5. **完善个人信息**

### 第2步：导入项目
1. **登录后进入Dashboard**
2. **点击 "Add New..." → "Project"**
3. **选择GitHub仓库**：`venus-recipe-system-full`
4. **点击 "Import"**

### 第3步：配置部署参数
Vercel会自动检测到Node.js项目，使用以下配置：

| 配置项 | 设置值 |
|--------|--------|
| **Framework Preset** | Other |
| **Root Directory** | ./ |
| **Build Command** | `npm install` |
| **Output Directory** | (留空) |
| **Install Command** | `npm install` |
| **Development Command** | `npm start` |

### 第4步：设置环境变量
在 **"Environment Variables"** 部分添加：

```
NODE_ENV=production
SESSION_SECRET=your-secure-secret-key-change-this
DB_PATH=./data/venus_recipe.db
```

### 第5步：完成部署
1. **点击 "Deploy"**
2. **等待部署完成**（1-3分钟）
3. **获得网站地址**：`https://venus-recipe-system-xxx.vercel.app`

---

## 🎯 部署完成

### 访问网站
部署成功后，您会获得类似这样的地址：
```
https://venus-recipe-system-a1b2c3d4.vercel.app
```

### 🌟 网站功能
- ✅ **完整5餐制管理**
- ✅ **多园区支持**
- ✅ **数据库存储**
- ✅ **增删改查功能**
- ✅ **营养统计**
- ✅ **Excel导入**

---

## 🔄 自动部署

部署后，每次推送代码到GitHub主分支，Vercel会自动重新部署！

```bash
git add .
git commit -m "更新功能"
git push origin main
```

---

## 🆘 常见问题

### Q: 部署失败怎么办？
A: 检查以下项目：
1. package.json配置是否正确
2. 所有依赖是否已安装
3. 环境变量是否设置正确

### Q: 如何自定义域名？
A: 在Vercel控制台的Domain设置中添加您的域名

### Q: 数据库会丢失吗？
A: Vercel无服务器环境中，每次部署可能会重置数据。建议：
1. 使用外部数据库服务
2. 或接受数据重置（演示用途）

---

## 🎉 完成！

您的金星食谱管理系统现在已部署到云端，国内用户无需VPN即可快速访问！

**金星食谱管理系统** - 让营养管理更简单、更科学、更高效！