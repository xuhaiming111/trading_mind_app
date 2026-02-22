/**
 * ========================================
 * 用户路由 (User Routes)
 * ========================================
 * 这个文件处理所有用户相关的接口：
 * 1. POST /api/user/send-code  - 发送短信验证码
 * 2. POST /api/user/register   - 用户注册（需要验证码）
 * 3. POST /api/user/login      - 用户登录
 * 4. GET  /api/user/info       - 获取用户信息（需要登录）
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendSmsCode, verifySmsCode } = require('../utils/sms');

const router = express.Router();

// ============ 接口1：发送短信验证码 ============
// 请求方式: POST
// 请求地址: /api/user/send-code
// 请求体: { phone: "13812345678" }

router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // 验证手机号
    if (!phone) {
      return res.json({
        code: 400,
        message: '请输入手机号',
        data: null
      });
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.json({
        code: 400,
        message: '请输入正确的手机号',
        data: null
      });
    }
    
    // 发送验证码
    const result = await sendSmsCode(phone);
    
    res.json({
      code: result.success ? 200 : 400,
      message: result.message,
      data: null
    });
    
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.json({
      code: 500,
      message: '发送失败，请稍后重试',
      data: null
    });
  }
});

// ============ 接口2：用户注册（需要验证码） ============
// 请求方式: POST
// 请求地址: /api/user/register
// 请求体: { username: "张三", phone: "13812345678", password: "123456", code: "123456" }

router.post('/register', async (req, res) => {
  try {
    const { username, phone, password, code } = req.body;
    
    // 参数校验
    if (!username || !phone || !password || !code) {
      return res.json({
        code: 400,
        message: '用户名、手机号、密码和验证码都是必填项',
        data: null
      });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.json({
        code: 400,
        message: '请输入正确的手机号',
        data: null
      });
    }
    
    // 验证短信验证码
    const verifyResult = verifySmsCode(phone, code);
    if (!verifyResult.success) {
      return res.json({
        code: 400,
        message: verifyResult.message,
        data: null
      });
    }
    
    // 检查用户名是否已被使用
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.json({
        code: 400,
        message: '用户名已被使用，请换一个',
        data: null
      });
    }
    
    // 检查手机号是否已被注册
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.json({
        code: 400,
        message: '该手机号已注册，请直接登录',
        data: null
      });
    }
    
    // 创建新用户
    const user = new User({
      username,
      phone,
      password
    });
    
    await user.save();
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user._id },
      req.app.get('JWT_SECRET'),
      { expiresIn: '7d' }
    );
    
    res.json({
      code: 200,
      message: '注册成功',
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
    console.error('注册错误:', error);
    res.json({
      code: 500,
      message: '注册失败: ' + error.message,
      data: null
    });
  }
});

// ============ 接口3：用户登录 ============
// 请求方式: POST
// 请求地址: /api/user/login
// 请求体: { phone: "13812345678", password: "123456" }

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.json({
        code: 400,
        message: '手机号和密码都是必填项',
        data: null
      });
    }
    
    const user = await User.findOne({ phone });
    
    if (!user) {
      return res.json({
        code: 401,
        message: '手机号或密码错误',
        data: null
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.json({
        code: 401,
        message: '手机号或密码错误',
        data: null
      });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      req.app.get('JWT_SECRET'),
      { expiresIn: '7d' }
    );
    
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

// ============ 接口4：获取当前用户信息 ============
// 请求方式: GET
// 请求地址: /api/user/info
// 请求头: Authorization: Bearer <token>

router.get('/info', authMiddleware, async (req, res) => {
  try {
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

module.exports = router;
