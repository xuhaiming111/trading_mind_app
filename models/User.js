/**
 * ========================================
 * 用户数据模型 (User Model)
 * ========================================
 * 这个文件定义了用户在数据库中的数据结构
 * 就像 Excel 表格的列定义一样，规定了用户表有哪些字段
 */

const mongoose = require('mongoose');   // 引入 mongoose
const bcrypt = require('bcryptjs');     // 引入 bcryptjs，用于密码加密

// ============ 定义用户数据结构（Schema） ============
// Schema 就是数据模板，规定每个字段的类型、是否必填、验证规则等

const userSchema = new mongoose.Schema({
  // 用户名字段
  username: {
    type: String,           // 数据类型是字符串
    required: true,         // 必填项
    unique: true,           // 唯一，不能重复（不能有两个相同用户名）
    trim: true,             // 自动去除首尾空格
    minlength: 2,           // 最少 2 个字符
    maxlength: 20           // 最多 20 个字符
  },
  
  // 手机号字段
  phone: {
    type: String,
    required: true,
    unique: true,           // 手机号不能重复
    trim: true,
    // 验证手机号格式（中国大陆11位手机号）
    match: [/^1[3-9]\d{9}$/, '手机号格式不正确']
  },
  
  // 密码字段（存储的是加密后的密码）
  password: {
    type: String,
    required: true,
    minlength: 6            // 密码最少 6 位
  },
  
  // 创建时间（自动记录用户注册时间）
  createdAt: {
    type: Date,
    default: Date.now       // 默认值是当前时间
  }
});

// ============ 中间件：保存前自动加密密码 ============
// pre('save') 表示在保存到数据库之前执行
// 这样用户注册时，我们只需要传入明文密码，这里会自动加密

userSchema.pre('save', async function(next) {
  // this 指向当前要保存的用户文档
  
  // 如果密码没有被修改，就跳过加密（比如只是修改了用户名）
  if (!this.isModified('password')) {
    return next();
  }
  
  // bcrypt.genSalt(10) 生成一个"盐"，10 表示加密强度
  // 盐是一个随机字符串，让相同的密码加密后结果也不同，更安全
  const salt = await bcrypt.genSalt(10);
  
  // bcrypt.hash() 用盐对密码进行加密
  // 比如 "123456" 会变成类似 "$2a$10$X7..." 的字符串
  this.password = await bcrypt.hash(this.password, salt);
  
  next(); // 继续执行保存操作
});

// ============ 实例方法：验证密码是否正确 ============
// 登录时用这个方法比对用户输入的密码和数据库中的加密密码

userSchema.methods.comparePassword = async function(inputPassword) {
  // bcrypt.compare() 会自动把输入的明文密码加密后与数据库中的密码比较
  // 返回 true 或 false
  return await bcrypt.compare(inputPassword, this.password);
};

// ============ 创建并导出模型 ============
// mongoose.model('User', userSchema) 基于 Schema 创建 Model
// Model 就像是一个类，可以用它来操作数据库（增删改查）

const User = mongoose.model('User', userSchema);

module.exports = User;
