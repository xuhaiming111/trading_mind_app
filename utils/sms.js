/**
 * ========================================
 * 阿里云短信服务工具
 * ========================================
 * 用于发送短信验证码
 */

const crypto = require('crypto');
const https = require('https');

// 模拟模式：仅当明确为 'false'（字符串）时关闭，其余情况均为模拟
const _smsMockEnv = (process.env.SMS_MOCK_MODE || '').toLowerCase();
const USE_MOCK_MODE = _smsMockEnv !== 'false' && _smsMockEnv !== '0';

// 阿里云短信配置（从环境变量读取，确保安全）
const SMS_CONFIG = {
  accessKeyId: process.env.SMS_ACCESS_KEY_ID,
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
  signName: process.env.SMS_SIGN_NAME || '',
  templateCode: process.env.SMS_TEMPLATE_CODE || '',
  // 模板变量名，需与阿里云模板里的变量一致（常见为 code 或 verification_code）
  templateParamName: process.env.SMS_TEMPLATE_PARAM_NAME || 'code'
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
      // ========== 模拟模式 ==========
      // 验证码固定为 123456，方便测试
      if (USE_MOCK_MODE) {
        const mockCode = '123456';
        console.log(`[模拟模式] 手机号: ${phone}, 验证码: ${mockCode}`);
        
        // 存储验证码，5分钟有效
        verificationCodes.set(phone, {
          code: mockCode,
          expireAt: Date.now() + 5 * 60 * 1000
        });
        
        return resolve({
          success: true,
          message: '验证码已发送（测试模式：123456）'
        });
      }
      
      // ========== 正式模式（阿里云短信） ==========
      // 检查配置是否完整
      if (!SMS_CONFIG.accessKeyId || !SMS_CONFIG.accessKeySecret) {
        console.error('短信配置缺失，请在环境变量中配置 SMS_ACCESS_KEY_ID 和 SMS_ACCESS_KEY_SECRET');
        return resolve({
          success: false,
          message: '短信服务未配置'
        });
      }
      if (!SMS_CONFIG.signName || !SMS_CONFIG.templateCode) {
        console.error('短信配置缺失，请配置 SMS_SIGN_NAME 和 SMS_TEMPLATE_CODE');
        return resolve({
          success: false,
          message: '短信服务未配置'
        });
      }
      
      // 生成验证码
      const code = generateCode();
      const templateParam = { [SMS_CONFIG.templateParamName]: code };
      
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
        TemplateParam: JSON.stringify(templateParam),
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

// 启动时打印当前短信模式（便于确认是否接入真实短信）
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'test') {
  const mode = USE_MOCK_MODE ? '模拟（验证码固定 123456）' : '阿里云真实短信';
  console.log('[短信] SMS_MOCK_MODE=', process.env.SMS_MOCK_MODE, '=> 当前模式:', mode);
}

/** 获取短信配置状态（不暴露密钥，仅用于排查 Render 环境变量是否生效） */
function getSmsStatus() {
  const raw = process.env.SMS_MOCK_MODE || '';
  return {
    mockMode: USE_MOCK_MODE,
    rawSMS_MOCK_MODE: raw === '' ? '(未设置)' : raw,
    hasAccessKey: !!SMS_CONFIG.accessKeyId,
    hasSecret: !!SMS_CONFIG.accessKeySecret,
    hasSignName: !!SMS_CONFIG.signName,
    hasTemplateCode: !!SMS_CONFIG.templateCode,
    smsReady: !USE_MOCK_MODE && !!SMS_CONFIG.accessKeyId && !!SMS_CONFIG.accessKeySecret && !!SMS_CONFIG.signName && !!SMS_CONFIG.templateCode
  };
}

module.exports = {
  sendSmsCode,
  verifySmsCode,
  generateCode,
  getSmsStatus
};
