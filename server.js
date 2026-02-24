/**
 * ========================================
 * Trading Mind 后端服务 - 入口文件
 * ========================================
 * 这是整个后端的启动文件，负责：
 * 1. 连接 MongoDB 数据库
 * 2. 配置 Express 服务器
 * 3. 注册所有的 API 路由
 * 
 * 支持本地开发和 Render 云部署
 */

// ============ 引入依赖包 ============
const express = require('express');     // Express 是 Node.js 的 Web 框架，用来创建服务器和处理请求
const mongoose = require('mongoose');   // Mongoose 是操作 MongoDB 数据库的工具
const cors = require('cors');           // CORS 允许前端跨域访问后端接口

// ============ 创建 Express 应用 ============
const app = express();

// ============ 配置项 ============

// MongoDB 连接字符串
// Render 部署时会从环境变量读取，本地开发时使用默认值
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trading_mind';

// JWT 密钥 - 用于生成用户登录凭证
const JWT_SECRET = process.env.JWT_SECRET || 'QWEDSA123';

// 服务器端口号（Render 会自动设置 PORT 环境变量）
const PORT = process.env.PORT || 3000;

// 把配置挂载到 app 上，这样其他文件也能用
app.set('JWT_SECRET', JWT_SECRET);

// ============ 中间件配置 ============

// 允许所有来源的跨域请求（前端 Flutter 可以访问）
app.use(cors());

// 解析请求体中的 JSON 数据
app.use(express.json());

// ============ 注册路由 ============

// 用户相关接口（注册、登录）
app.use('/api/user', require('./routes/user'));

// 签到相关接口
app.use('/api/checkin', require('./routes/checkin'));

// 用户设置接口（交易原则、功课、计划）
app.use('/api/settings', require('./routes/settings'));

// 每日记录接口（交易计划、交易感悟）
app.use('/api/daily', require('./routes/daily'));

// 根路由 - 用来测试服务器是否正常运行
app.get('/', (req, res) => {
  res.json({
    code: 200,
    message: 'Trading Mind API 服务运行正常！',
    data: {
      version: '1.0.0',
      time: new Date().toLocaleString('zh-CN')
    }
  });
});

// ============ 连接数据库并启动服务器 ============

console.log('正在连接 MongoDB 数据库...');
console.log('环境:', process.env.NODE_ENV || 'development');

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB 数据库连接成功！');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ 服务器已启动，端口: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  });
