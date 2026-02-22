/**
 * ========================================
 * Trading Mind 后端服务 - 入口文件
 * ========================================
 * 这是整个后端的启动文件，负责：
 * 1. 连接 MongoDB 数据库
 * 2. 配置 Express 服务器
 * 3. 注册所有的 API 路由
 */

// ============ 引入依赖包 ============
const express = require('express');     // Express 是 Node.js 的 Web 框架，用来创建服务器和处理请求
const mongoose = require('mongoose');   // Mongoose 是操作 MongoDB 数据库的工具
const cors = require('cors');           // CORS 允许前端跨域访问后端接口

// ============ 创建 Express 应用 ============
const app = express();

// ============ 配置项（你需要根据实际情况修改这里） ============

// 【重要】MongoDB 连接字符串
// 本地数据库: 'mongodb://localhost:27017/trading_mind'
// 当前使用本地数据库（云数据库网络不通，先用本地）
const MONGODB_URI = 'mongodb://localhost:27017/trading_mind';

// 【重要】JWT 密钥 - 用于生成用户登录凭证，请修改为你自己的复杂字符串
const JWT_SECRET = 'trading_mind_secret_key_2024_change_me';

// 服务器端口号
const PORT = 3000;

// 把配置挂载到 app 上，这样其他文件也能用
app.set('JWT_SECRET', JWT_SECRET);

// ============ 中间件配置 ============

// 允许所有来源的跨域请求（前端 Flutter 可以访问）
app.use(cors());

// 解析请求体中的 JSON 数据
// 比如前端发送 {"email": "test@qq.com"}, 后端就能通过 req.body.email 获取
app.use(express.json());

// ============ 注册路由 ============

// 用户相关接口（注册、登录）
// 访问路径: /api/user/register, /api/user/login
app.use('/api/user', require('./routes/user'));

// 签到相关接口
// 访问路径: /api/checkin/...
app.use('/api/checkin', require('./routes/checkin'));

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

// mongoose.connect() 连接数据库，返回一个 Promise
mongoose.connect(MONGODB_URI)
  .then(() => {
    // 连接成功后执行
    console.log('✅ MongoDB 数据库连接成功！');
    
    // 启动 HTTP 服务器，监听指定端口
    app.listen(PORT, () => {
      console.log(`✅ 服务器已启动！`);
      console.log(`👉 访问地址: http://localhost:${PORT}`);
      console.log(`👉 用户接口: http://localhost:${PORT}/api/user`);
      console.log(`👉 签到接口: http://localhost:${PORT}/api/checkin`);
    });
  })
  .catch((error) => {
    // 连接失败
    console.error('❌ MongoDB 连接失败:', error.message);
    console.log('请检查：');
    console.log('1. MongoDB 连接字符串是否正确');
    console.log('2. 网络是否能访问 MongoDB Atlas');
    console.log('3. 数据库用户名密码是否正确');
    process.exit(1); // 退出程序
  });
