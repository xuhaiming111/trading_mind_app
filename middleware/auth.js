/**
 * ========================================
 * 认证中间件 (Auth Middleware)
 * ========================================
 * 这个中间件用于验证用户的登录状态
 * 工作原理：
 * 1. 从请求头获取 token
 * 2. 验证 token 是否有效
 * 3. 如果有效，把用户信息放到 req.user 中，继续执行后续代码
 * 4. 如果无效，返回错误信息
 * 
 * 使用方法：
 * 在需要登录才能访问的路由上加上这个中间件
 * 比如: router.get('/info', authMiddleware, handler)
 */

const jwt = require('jsonwebtoken');

// 中间件是一个函数，接收 req, res, next 三个参数
const authMiddleware = (req, res, next) => {
  try {
    // 1. 从请求头获取 Authorization 字段
    // 前端请求时需要设置: headers: { Authorization: 'Bearer xxxxx' }
    const authHeader = req.header('Authorization');
    
    // 2. 检查是否存在
    if (!authHeader) {
      return res.json({
        code: 401,
        message: '请先登录（未提供 token）',
        data: null
      });
    }
    
    // 3. 提取 token
    // Authorization 的格式通常是 "Bearer xxxxxx"
    // 我们需要把 "Bearer " 去掉，只要后面的 token 部分
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7); // 从第7个字符开始截取（去掉 "Bearer "）
    } else {
      token = authHeader; // 如果没有 Bearer 前缀，直接使用
    }
    
    // 4. 验证 token
    // jwt.verify() 会验证 token 是否有效，是否过期
    // 如果验证失败会抛出错误
    const decoded = jwt.verify(token, req.app.get('JWT_SECRET'));
    
    // 5. 把解码后的用户信息放到 req.user 中
    // 这样后续的路由处理函数就能通过 req.user 获取当前用户信息
    req.user = {
      userId: decoded.userId
    };
    
    // 6. 调用 next() 继续执行下一个中间件或路由处理函数
    next();
    
  } catch (error) {
    // 处理各种错误情况
    
    if (error.name === 'TokenExpiredError') {
      // token 已过期
      return res.json({
        code: 401,
        message: '登录已过期，请重新登录',
        data: null
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      // token 无效（格式错误、被篡改等）
      return res.json({
        code: 401,
        message: 'token 无效，请重新登录',
        data: null
      });
    }
    
    // 其他未知错误
    return res.json({
      code: 500,
      message: '认证失败: ' + error.message,
      data: null
    });
  }
};

module.exports = authMiddleware;
