/**
 * ========================================
 * 每日交易记录数据模型
 * ========================================
 * 存储用户每天的交易计划和交易感悟
 * 每个用户每天只有一条记录
 */

const mongoose = require('mongoose');

// 交易计划项的 Schema
const planItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: '',
    trim: true
  }
}, { _id: true });

// 每日记录的主 Schema
const dailyRecordSchema = new mongoose.Schema({
  // 关联的用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 日期（格式：YYYY-MM-DD）
  date: {
    type: String,
    required: true
  },
  
  // 当日交易计划列表
  tradingPlans: {
    type: [planItemSchema],
    default: []
  },
  
  // 交易感悟/心得
  reflection: {
    type: String,
    default: '',
    trim: true
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 创建复合索引，确保每个用户每天只有一条记录
dailyRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

// 每次保存前更新 updatedAt 字段
dailyRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建并导出模型
module.exports = mongoose.model('DailyRecord', dailyRecordSchema);
