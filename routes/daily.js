/**
 * ========================================
 * 每日记录路由
 * ========================================
 * 处理每日交易计划和交易感悟的增删改查
 * 所有接口都需要用户登录（携带 token）
 */

const express = require('express');
const router = express.Router();
const DailyRecord = require('../models/DailyRecord');
const authMiddleware = require('../middleware/auth');

// ============ 接口1：获取指定日期的记录 ============
router.get('/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.json({
        code: 400,
        message: '日期格式错误，应为 YYYY-MM-DD',
        data: null
      });
    }
    
    // 查找记录
    let record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    // 如果不存在，返回空数据（不自动创建）
    if (!record) {
      return res.json({
        code: 200,
        message: '获取成功',
        data: {
          date: date,
          tradingPlans: [],
          reflection: '',
          exists: false
        }
      });
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        date: record.date,
        tradingPlans: record.tradingPlans,
        reflection: record.reflection,
        exists: true
      }
    });
  } catch (error) {
    console.error('获取每日记录失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口2：保存/更新指定日期的记录 ============
router.put('/:date', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const { tradingPlans, reflection } = req.body;
    
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.json({
        code: 400,
        message: '日期格式错误，应为 YYYY-MM-DD',
        data: null
      });
    }
    
    // 查找或创建记录
    let record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    if (!record) {
      record = new DailyRecord({
        userId: req.user.userId,
        date: date
      });
    }
    
    // 更新交易计划
    if (Array.isArray(tradingPlans)) {
      record.tradingPlans = tradingPlans.map(item => ({
        title: item.title || '',
        content: item.content || ''
      })).filter(item => item.title.trim());
    }
    
    // 更新交易感悟
    if (typeof reflection === 'string') {
      record.reflection = reflection.trim();
    }
    
    await record.save();
    
    res.json({
      code: 200,
      message: '保存成功',
      data: {
        date: record.date,
        tradingPlans: record.tradingPlans,
        reflection: record.reflection
      }
    });
  } catch (error) {
    console.error('保存每日记录失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口3：添加单个交易计划 ============
router.post('/:date/plan', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const { title, content } = req.body;
    
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.json({
        code: 400,
        message: '日期格式错误，应为 YYYY-MM-DD',
        data: null
      });
    }
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找或创建记录
    let record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    if (!record) {
      record = new DailyRecord({
        userId: req.user.userId,
        date: date
      });
    }
    
    // 添加新计划
    record.tradingPlans.push({
      title: title.trim(),
      content: content || ''
    });
    
    await record.save();
    
    // 返回新添加的计划
    const newItem = record.tradingPlans[record.tradingPlans.length - 1];
    
    res.json({
      code: 200,
      message: '添加成功',
      data: {
        item: newItem,
        tradingPlans: record.tradingPlans
      }
    });
  } catch (error) {
    console.error('添加交易计划失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口4：更新单个交易计划 ============
router.put('/:date/plan/:id', authMiddleware, async (req, res) => {
  try {
    const { date, id } = req.params;
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找记录
    const record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    if (!record) {
      return res.json({
        code: 404,
        message: '记录不存在',
        data: null
      });
    }
    
    // 查找并更新计划
    const item = record.tradingPlans.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '计划不存在',
        data: null
      });
    }
    
    item.title = title.trim();
    item.content = content || '';
    
    await record.save();
    
    res.json({
      code: 200,
      message: '更新成功',
      data: {
        item: item,
        tradingPlans: record.tradingPlans
      }
    });
  } catch (error) {
    console.error('更新交易计划失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口5：删除单个交易计划 ============
router.delete('/:date/plan/:id', authMiddleware, async (req, res) => {
  try {
    const { date, id } = req.params;
    
    // 查找记录
    const record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    if (!record) {
      return res.json({
        code: 404,
        message: '记录不存在',
        data: null
      });
    }
    
    // 查找计划
    const item = record.tradingPlans.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '计划不存在',
        data: null
      });
    }
    
    // 删除计划
    record.tradingPlans.pull(id);
    
    await record.save();
    
    res.json({
      code: 200,
      message: '删除成功',
      data: {
        tradingPlans: record.tradingPlans
      }
    });
  } catch (error) {
    console.error('删除交易计划失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口6：保存交易感悟 ============
router.put('/:date/reflection', authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const { reflection } = req.body;
    
    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.json({
        code: 400,
        message: '日期格式错误，应为 YYYY-MM-DD',
        data: null
      });
    }
    
    // 查找或创建记录
    let record = await DailyRecord.findOne({
      userId: req.user.userId,
      date: date
    });
    
    if (!record) {
      record = new DailyRecord({
        userId: req.user.userId,
        date: date
      });
    }
    
    // 更新交易感悟
    record.reflection = (reflection || '').trim();
    
    await record.save();
    
    res.json({
      code: 200,
      message: '保存成功',
      data: {
        reflection: record.reflection
      }
    });
  } catch (error) {
    console.error('保存交易感悟失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

module.exports = router;
