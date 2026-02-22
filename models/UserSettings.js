/**
 * ========================================
 * 用户设置数据模型
 * ========================================
 * 存储用户的交易原则、交易功课、交易计划
 * 每个用户只有一条设置记录
 */

const mongoose = require('mongoose');

// 预设原则的 Schema（包含选中状态）
const presetPrincipleSchema = new mongoose.Schema({
  index: {
    type: Number,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// 交易功课/计划项的 Schema
const tradingItemSchema = new mongoose.Schema({
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

// 用户设置的主 Schema
const userSettingsSchema = new mongoose.Schema({
  // 关联的用户 ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // 预设原则的选中状态（存储索引和选中状态）
  presetPrinciples: {
    type: [presetPrincipleSchema],
    default: [{ index: 0, isSelected: true }]
  },
  
  // 自定义原则列表（字符串数组）
  customPrinciples: {
    type: [String],
    default: []
  },
  
  // 交易功课列表
  tradingHomework: {
    type: [tradingItemSchema],
    default: [
      { title: '判断情绪周期', content: '最高连扳数量，涨停个股数量，跌停个股数量' },
      { title: '判断政策面', content: '' },
      { title: '判断板块', content: '' }
    ]
  },
  
  // 交易计划列表
  tradingPlans: {
    type: [tradingItemSchema],
    default: [
      { title: '候选股票', content: '' },
      { title: '买点计划', content: '' },
      { title: '卖出计划', content: '' }
    ]
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

// 每次保存前更新 updatedAt 字段
userSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 创建并导出模型
module.exports = mongoose.model('UserSettings', userSettingsSchema);
