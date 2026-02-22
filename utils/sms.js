/**
 * ========================================
 * 阿里云短信服务工具
 * ========================================
 * 用于发送短信验证码
 */

const crypto = require('crypto');
const https = require('https');

// 阿里云短信配置
const SMS_CONFIG = {
  accessKeyId: process.env.SMS_ACCESS_KEY_ID || 'LTAI5tEW3nCt5UkpJFcc3rxV',
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || 'GhBjlxyMCYxfmsL22tgv322hoGyAXC',
  signName: 'TradingMind',           // 短信签名
  templateCode: 'SMS_332215523'      // 短信模板CODE
};

// 存储验证码（实际生产环境应该用 Redis）
const verificationCodes = new Map();

/**
 * 生成6位随机验证码
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 阿里云API签名
 */
function sign(params, secret) {
  // 1. 按参数名排序
  const sortedKeys = Object.keys(params).sort();
  
  // 2. 构造待签名字符串
  const stringToSign = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // 3. 计算签名
  const hmac = crypto.createHmac('sha1', secret + '&');
  hmac.update('GET&%2F&' + encodeURIComponent(stringToSign));
  return hmac.digest('base64');
}

/**
 * 发送短信验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{success: boolean, message: string, code?: string}>}
 */
async function sendSmsCode(phone) {
  return new Promise((resolve) => {
    try {
      // 生成验证码
      const code = generateCode();
      
      // 构造请求参数
      const params = {
        AccessKeyId: SMS_CONFIG.accessKeyId,
        Action: 'SendSms',
        Format: 'JSON',
        PhoneNumbers: phone,
        SignName: SMS_CONFIG.signName,
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: Math.random().toString(36).substring(2),
        SignatureVersion: '1.0',
        TemplateCode: SMS_CONFIG.templateCode,
        TemplateParam: JSON.stringify({ code: code }),
        Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
        Version: '2017-05-25'
      };
      
      // 计算签名
      params.Signature = sign(params, SMS_CONFIG.accessKeySecret);
      
      // 构造请求URL
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const options = {
        hostname: 'dysmsapi.aliyuncs.com',
        path: '/?' + queryString,
        method: 'GET'
      };
      
      // 发送请求
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('阿里云短信响应:', result);
            
            if (result.Code === 'OK') {
              // 存储验证码，5分钟有效
              verificationCodes.set(phone, {
                code: code,
                expireAt: Date.now() + 5 * 60 * 1000
              });
              
              resolve({
                success: true,
                message: '验证码已发送'
              });
            } else {
              resolve({
                success: false,
                message: result.Message || '发送失败'
              });
            }
          } catch (e) {
            resolve({
              success: false,
              message: '解析响应失败'
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('发送短信错误:', error);
        resolve({
          success: false,
          message: '网络错误'
        });
      });
      
      req.end();
      
    } catch (error) {
      console.error('发送短信异常:', error);
      resolve({
        success: false,
        message: '发送失败'
      });
    }
  });
}

/**
 * 验证短信验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {{success: boolean, message: string}}
 */
function verifySmsCode(phone, code) {
  const stored = verificationCodes.get(phone);
  
  if (!stored) {
    return { success: false, message: '请先获取验证码' };
  }
  
  if (Date.now() > stored.expireAt) {
    verificationCodes.delete(phone);
    return { success: false, message: '验证码已过期，请重新获取' };
  }
  
  if (stored.code !== code) {
    return { success: false, message: '验证码错误' };
  }
  
  // 验证成功后删除验证码
  verificationCodes.delete(phone);
  return { success: true, message: '验证成功' };
}

module.exports = {
  sendSmsCode,
  verifySmsCode,
  generateCode
};
