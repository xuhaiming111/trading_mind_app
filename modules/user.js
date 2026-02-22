/**
 * ========================================
 * 用户路由 (User Routes)
 * ========================================
 * 这个文件处理所有用户相关的接口：
 * 1. POST /api/user/register - 用户注册（手机号）
 * 2. POST /api/user/login    - 用户登录（手机号）
 * 3. GET  /api/user/info     - 获取用户信息（需要登录）
 */

const express = require('express');
const jwt = require('jsonwebtoken');    // JWT 用于生成登录凭证 token
const User = require('../models/User'); // 引入用户模型
const authMiddleware = require('../middleware/auth'); // 引入认证中间件

// 创建路由器
const router = express.Router();

// ============ 接口1：用户注册 ============
// 请求方式: POST
// 请求地址: /api/user/register
// 请求体: { username: "张三", phone: "13812345678", password: "123456" }

router.post('/register', async (req, res) => {
  try {
    // 1. 从请求体中获取用户提交的数据
    const { username, phone, password } = req.body;
    
    // 2. 参数校验 - 检查必填字段是否存在
    if (!username || !phone || !password) {
      return res.json({
        code: 400,
        message: '用户名、手机号和密码都是必填项',
        data: null
      });
    }
    
    // 3. 验证手机号格式（中国大陆11位手机号）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.json({
        code: 400,
        message: '请输入正确的手机号',
        data: null
      });
    }
    
    // 4. 检查用户名是否已被使用
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.json({
        code: 400,
        message: '用户名已被使用，请换一个',
        data: null
      });
    }
    
    // 5. 检查手机号是否已被注册
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.json({
        code: 400,
        message: '该手机号已注册，请直接登录',
        data: null
      });
    }
    
    // 6. 创建新用户
    // 密码会在 User 模型的 pre('save') 钩子中自动加密
    const user = new User({
      username,
      phone,
      password   // 这里是明文密码，保存时会自动加密
    });
    
    // 7. 保存到数据库
    await user.save();
    
    // 8. 生成 JWT token（登录凭证）
    // jwt.sign(数据, 密钥, 配置) 生成 token
    // 数据里放 userId，这样后面可以通过 token 知道是哪个用户
    const token = jwt.sign(
      { userId: user._id },           // 要存入 token 的数据
      req.app.get('JWT_SECRET'),      // 从 app 获取密钥
      { expiresIn: '7d' }             // token 7 天后过期
    );
    
    // 9. 返回成功结果
    res.json({
      code: 200,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone
        },
        token: token   // 前端需要保存这个 token
      }
    });
    
  } catch (error) {
    // 捕获错误
    console.error('注册错误:', error);
    res.json({
      code: 500,
      message: '注册失败: ' + error.message,
      data: null
    });
  }
});

// ============ 接口2：用户登录 ============
// 请求方式: POST
// 请求地址: /api/user/login
// 请求体: { phone: "13812345678", password: "123456" }

router.post('/login', async (req, res) => {
  try {
    // 1. 获取请求参数
    const { phone, password } = req.body;
    
    // 2. 参数校验
    if (!phone || !password) {
      return res.json({
        code: 400,
        message: '手机号和密码都是必填项',
        data: null
      });
    }
    
    // 3. 查找用户
    // 根据手机号查找，找到返回用户文档，找不到返回 null
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.json({
        code: 401,
        message: '手机号或密码错误',
        data: null
      });
    }
    
    // 4. 验证密码
    // 调用 User 模型中定义的 comparePassword 方法
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.json({
        code: 401,
        message: '手机号或密码错误',
        data: null
      });
    }
    
    // 5. 生成 token
    const token = jwt.sign(
      { userId: user._id },
      req.app.get('JWT_SECRET'),
      { expiresIn: '7d' }
    );
    
    // 6. 返回成功结果
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone
        },
        token: token
      }
    });
    
  } catch (error) {
    console.error('登录错误:', error);
    res.json({
      code: 500,
      message: '登录失败: ' + error.message,
      data: null
    });
  }
});

// ============ 接口3：获取当前用户信息 ============
// 请求方式: GET
// 请求地址: /api/user/info
// 请求头: Authorization: Bearer <token>
// 这个接口需要登录后才能访问，所以使用 authMiddleware 中间件验证 token

router.get('/info', authMiddleware, async (req, res) => {
  try {
    // authMiddleware 验证成功后，会把用户信息放到 req.user 中
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.json({
      code: 500,
      message: '获取用户信息失败',
      data: null
    });
  }
});

// 导出路由器
module.exports = router;
