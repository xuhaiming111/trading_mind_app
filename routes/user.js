/**
 * ========================================
 * 用户路由 (User Routes)
 * ========================================
 * 这个文件处理所有用户相关的接口：
 * 1. POST /api/user/send-code      - 发送短信验证码
 * 2. POST /api/user/register       - 用户注册（只需手机号+验证码）
 * 3. POST /api/user/login          - 用户登录
 * 4. GET  /api/user/info           - 获取用户信息（需要登录）
 * 5. PUT  /api/user/username       - 修改用户名（需要登录）
 * 6. PUT  /api/user/password       - 修改密码（需要登录）
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendSmsCode, verifySmsCode } = require('../utils/sms');

const router = express.Router();

/**
 * 生成随机用户名
 * 格式：用户 + 8位随机数字
 */
function generateRandomUsername() {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return `用户${randomNum}`;
}

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

// ============ 接口2：用户注册（简化版：只需手机号+验证码） ============
// 请求方式: POST
// 请求地址: /api/user/register
// 请求体: { phone: "13812345678", code: "123456" }
// 说明：用户名自动生成，密码默认为 123456

router.post('/register', async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    // 参数校验
    if (!phone || !code) {
      return res.json({
        code: 400,
        message: '手机号和验证码都是必填项',
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
    
    // 检查手机号是否已被注册
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.json({
        code: 400,
        message: '该手机号已注册，请直接登录',
        data: null
      });
    }
    
    // 生成随机用户名
    let username = generateRandomUsername();
    // 确保用户名唯一
    while (await User.findOne({ username })) {
      username = generateRandomUsername();
    }
    
    // 创建新用户（默认密码：123456）
    const user = new User({
      username,
      phone,
      password: '123456'
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

// ============ 接口5：修改用户名 ============
// 请求方式: PUT
// 请求地址: /api/user/username
// 请求头: Authorization: Bearer <token>
// 请求体: { username: "新用户名" }

router.put('/username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.json({
        code: 400,
        message: '请输入新用户名',
        data: null
      });
    }
    
    if (username.length < 2 || username.length > 20) {
      return res.json({
        code: 400,
        message: '用户名长度需要在2-20个字符之间',
        data: null
      });
    }
    
    // 检查用户名是否已被使用
    const existingUser = await User.findOne({ username, _id: { $ne: req.user.userId } });
    if (existingUser) {
      return res.json({
        code: 400,
        message: '该用户名已被使用',
        data: null
      });
    }
    
    // 更新用户名
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username },
      { new: true }
    );
    
    res.json({
      code: 200,
      message: '用户名修改成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          phone: user.phone
        }
      }
    });
    
  } catch (error) {
    console.error('修改用户名错误:', error);
    res.json({
      code: 500,
      message: '修改失败: ' + error.message,
      data: null
    });
  }
});

// ============ 接口6：修改密码 ============
// 请求方式: PUT
// 请求地址: /api/user/password
// 请求头: Authorization: Bearer <token>
// 请求体: { oldPassword: "旧密码", newPassword: "新密码" }

router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.json({
        code: 400,
        message: '请输入旧密码和新密码',
        data: null
      });
    }
    
    if (newPassword.length < 6) {
      return res.json({
        code: 400,
        message: '新密码至少需要6个字符',
        data: null
      });
    }
    
    // 获取用户
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.json({
        code: 404,
        message: '用户不存在',
        data: null
      });
    }
    
    // 验证旧密码
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.json({
        code: 400,
        message: '旧密码错误',
        data: null
      });
    }
    
    // 更新密码
    user.password = newPassword;
    await user.save();
    
    res.json({
      code: 200,
      message: '密码修改成功',
      data: null
    });
    
  } catch (error) {
    console.error('修改密码错误:', error);
    res.json({
      code: 500,
      message: '修改失败: ' + error.message,
      data: null
    });
  }
});

module.exports = router;
