/**
 * ========================================
 * 签到记录数据模型 (CheckIn Model)
 * ========================================
 * 这个文件定义了签到记录在数据库中的数据结构
 * 每次用户签到，就会在数据库中创建一条记录
 */

const mongoose = require('mongoose');

// ============ 定义签到数据结构（Schema） ============

const checkInSchema = new mongoose.Schema({
  // 用户ID - 记录这条签到属于哪个用户
  // ref: 'User' 表示这个字段关联到 User 模型，方便以后联表查询
  userId: {
    type: mongoose.Schema.Types.ObjectId,  // MongoDB 的特殊 ID 类型
    ref: 'User',                           // 关联到 User 表
    required: true                         // 必填
  },
  
  // 签到日期，格式: "2024-01-15"
  // 用字符串存储，方便比较和查询
  date: {
    type: String,
    required: true
  },
  
  // 签到类型
  // completed: 完成签到（遵守了交易纪律）
  // incomplete: 手欠签到（违反了交易纪律）
  type: {
    type: String,
    enum: ['completed', 'incomplete'],  // 只能是这两个值之一
    required: true
  },
  
  // 是否完成当日计划
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  // 未完成的任务列表
  // 这是一个数组，每个元素包含任务标题和内容
  incompleteTasks: [{
    title: String,    // 任务标题，比如 "买点计划"
    content: String   // 任务内容，比如 "计划买入 xxx 股票"
  }],
  
  // 备注
  note: {
    type: String,
    default: ''
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ============ 创建复合唯一索引 ============
// 这行代码确保：同一个用户在同一天只能有一条签到记录
// 比如 userId=123 + date="2024-01-15" 这个组合在数据库中只能有一条

checkInSchema.index({ userId: 1, date: 1 }, { unique: true });

// ============ 创建并导出模型 ============

const CheckIn = mongoose.model('CheckIn', checkInSchema);

module.exports = CheckIn;
