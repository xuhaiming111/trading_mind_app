/**
 * ========================================
 * 用户设置路由
 * ========================================
 * 处理交易原则、交易功课、交易计划的增删改查
 * 所有接口都需要用户登录（携带 token）
 */

const express = require('express');
const router = express.Router();
const UserSettings = require('../models/UserSettings');
const authMiddleware = require('../middleware/auth');

// 默认的交易功课和计划（用于新用户或没有数据的老用户）
const DEFAULT_HOMEWORK = [
  { title: '判断情绪周期', content: '最高连扳数量，涨停个股数量，跌停个股数量' },
  { title: '判断政策面', content: '' },
  { title: '判断板块', content: '' }
];

const DEFAULT_PLANS = [
  { title: '候选股票', content: '' },
  { title: '买点计划', content: '' },
  { title: '卖出计划', content: '' }
];

// ============ 接口1：获取用户设置 ============
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 查找用户设置，如果不存在则创建默认设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      // 创建默认设置
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
      await settings.save();
    } else {
      // 对于已存在的用户，如果功课或计划为空，使用默认值
      let needSave = false;
      
      if (!settings.tradingHomework || settings.tradingHomework.length === 0) {
        settings.tradingHomework = DEFAULT_HOMEWORK;
        needSave = true;
      }
      
      if (!settings.tradingPlans || settings.tradingPlans.length === 0) {
        settings.tradingPlans = DEFAULT_PLANS;
        needSave = true;
      }
      
      if (needSave) {
        await settings.save();
      }
    }
    
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        presetPrinciples: settings.presetPrinciples,
        customPrinciples: settings.customPrinciples,
        tradingHomework: settings.tradingHomework,
        tradingPlans: settings.tradingPlans
      }
    });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口2：保存交易原则（预设+自定义） ============
router.put('/principles', authMiddleware, async (req, res) => {
  try {
    const { presetPrinciples, customPrinciples } = req.body;
    
    // 查找或创建用户设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      // 新用户，创建完整的默认设置
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
    }
    
    // 更新预设原则选中状态
    if (Array.isArray(presetPrinciples)) {
      settings.presetPrinciples = presetPrinciples;
    }
    
    // 更新自定义原则
    if (Array.isArray(customPrinciples)) {
      settings.customPrinciples = customPrinciples.filter(p => p && p.trim());
    }
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易原则保存成功',
      data: {
        presetPrinciples: settings.presetPrinciples,
        customPrinciples: settings.customPrinciples
      }
    });
  } catch (error) {
    console.error('保存交易原则失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口3：保存交易功课列表 ============
router.put('/homework', authMiddleware, async (req, res) => {
  try {
    const { tradingHomework } = req.body;
    
    if (!Array.isArray(tradingHomework)) {
      return res.json({
        code: 400,
        message: '参数格式错误',
        data: null
      });
    }
    
    // 查找或创建用户设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
    }
    
    // 更新交易功课
    settings.tradingHomework = tradingHomework.map(item => ({
      title: item.title || '',
      content: item.content || ''
    })).filter(item => item.title.trim());
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易功课保存成功',
      data: {
        tradingHomework: settings.tradingHomework
      }
    });
  } catch (error) {
    console.error('保存交易功课失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口4：保存交易计划列表 ============
router.put('/plans', authMiddleware, async (req, res) => {
  try {
    const { tradingPlans } = req.body;
    
    if (!Array.isArray(tradingPlans)) {
      return res.json({
        code: 400,
        message: '参数格式错误',
        data: null
      });
    }
    
    // 查找或创建用户设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
    }
    
    // 更新交易计划
    settings.tradingPlans = tradingPlans.map(item => ({
      title: item.title || '',
      content: item.content || ''
    })).filter(item => item.title.trim());
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易计划保存成功',
      data: {
        tradingPlans: settings.tradingPlans
      }
    });
  } catch (error) {
    console.error('保存交易计划失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口5：添加单个交易功课 ============
router.post('/homework', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找或创建用户设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
    }
    
    // 添加新功课
    settings.tradingHomework.push({
      title: title.trim(),
      content: content || ''
    });
    
    await settings.save();
    
    // 返回新添加的功课（包含 _id）
    const newItem = settings.tradingHomework[settings.tradingHomework.length - 1];
    
    res.json({
      code: 200,
      message: '交易功课添加成功',
      data: {
        item: newItem,
        tradingHomework: settings.tradingHomework
      }
    });
  } catch (error) {
    console.error('添加交易功课失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口6：添加单个交易计划 ============
router.post('/plans', authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找或创建用户设置
    let settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      settings = new UserSettings({
        userId: req.user.userId,
        tradingHomework: DEFAULT_HOMEWORK,
        tradingPlans: DEFAULT_PLANS
      });
    }
    
    // 添加新计划
    settings.tradingPlans.push({
      title: title.trim(),
      content: content || ''
    });
    
    await settings.save();
    
    // 返回新添加的计划（包含 _id）
    const newItem = settings.tradingPlans[settings.tradingPlans.length - 1];
    
    res.json({
      code: 200,
      message: '交易计划添加成功',
      data: {
        item: newItem,
        tradingPlans: settings.tradingPlans
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

// ============ 接口7：更新单个交易功课 ============
router.put('/homework/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找用户设置
    const settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      return res.json({
        code: 404,
        message: '设置不存在',
        data: null
      });
    }
    
    // 查找并更新功课
    const item = settings.tradingHomework.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '功课不存在',
        data: null
      });
    }
    
    item.title = title.trim();
    item.content = content || '';
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易功课更新成功',
      data: {
        item: item,
        tradingHomework: settings.tradingHomework
      }
    });
  } catch (error) {
    console.error('更新交易功课失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口8：更新单个交易计划 ============
router.put('/plans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    if (!title || !title.trim()) {
      return res.json({
        code: 400,
        message: '标题不能为空',
        data: null
      });
    }
    
    // 查找用户设置
    const settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      return res.json({
        code: 404,
        message: '设置不存在',
        data: null
      });
    }
    
    // 查找并更新计划
    const item = settings.tradingPlans.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '计划不存在',
        data: null
      });
    }
    
    item.title = title.trim();
    item.content = content || '';
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易计划更新成功',
      data: {
        item: item,
        tradingPlans: settings.tradingPlans
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

// ============ 接口9：删除单个交易功课 ============
router.delete('/homework/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找用户设置
    const settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      return res.json({
        code: 404,
        message: '设置不存在',
        data: null
      });
    }
    
    // 查找功课
    const item = settings.tradingHomework.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '功课不存在',
        data: null
      });
    }
    
    // 删除功课
    settings.tradingHomework.pull(id);
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易功课删除成功',
      data: {
        tradingHomework: settings.tradingHomework
      }
    });
  } catch (error) {
    console.error('删除交易功课失败:', error);
    res.json({
      code: 500,
      message: '服务器错误',
      data: null
    });
  }
});

// ============ 接口10：删除单个交易计划 ============
router.delete('/plans/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找用户设置
    const settings = await UserSettings.findOne({ userId: req.user.userId });
    
    if (!settings) {
      return res.json({
        code: 404,
        message: '设置不存在',
        data: null
      });
    }
    
    // 查找计划
    const item = settings.tradingPlans.id(id);
    
    if (!item) {
      return res.json({
        code: 404,
        message: '计划不存在',
        data: null
      });
    }
    
    // 删除计划
    settings.tradingPlans.pull(id);
    
    await settings.save();
    
    res.json({
      code: 200,
      message: '交易计划删除成功',
      data: {
        tradingPlans: settings.tradingPlans
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

module.exports = router;
