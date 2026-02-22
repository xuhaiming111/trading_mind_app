/**
 * ========================================
 * 签到路由 (CheckIn Routes)
 * ========================================
 * 这个文件处理所有签到相关的接口：
 * 1. POST /api/checkin       - 创建签到记录
 * 2. GET  /api/checkin       - 获取签到记录列表（按月）
 * 3. GET  /api/checkin/today - 获取今日签到状态
 * 4. GET  /api/checkin/stats - 获取签到统计数据
 * 
 * 注意：所有签到接口都需要登录（携带 token）
 */

const express = require('express');
const CheckIn = require('../models/CheckIn');        // 引入签到模型
const authMiddleware = require('../middleware/auth'); // 引入认证中间件

// 创建路由器
const router = express.Router();

// 所有签到路由都需要先验证 token
// router.use() 会对这个路由器下的所有路由生效
router.use(authMiddleware);

// ============ 接口1：创建签到记录 ============
// 请求方式: POST
// 请求地址: /api/checkin
// 请求头: Authorization: Bearer <token>
// 请求体: { type: "completed", incompleteTasks: [], note: "" }

router.post('/', async (req, res) => {
  try {
    // 1. 获取请求参数
    const { type, incompleteTasks, note, date } = req.body;
    
    // 2. 参数校验
    if (!type) {
      return res.json({
        code: 400,
        message: '签到类型不能为空（completed 或 incomplete）',
        data: null
      });
    }
    
    // 验证 type 值是否合法
    if (!['completed', 'incomplete'].includes(type)) {
      return res.json({
        code: 400,
        message: '签到类型必须是 completed（完成）或 incomplete（手欠）',
        data: null
      });
    }
    
    // 3. 获取签到日期
    // 如果前端传了 date 就用传的，否则用今天的日期
    // toISOString() 返回 "2024-01-15T08:30:00.000Z"，取前10个字符就是日期
    const checkInDate = date || new Date().toISOString().slice(0, 10);
    
    // 4. 检查今天是否已经签到
    // 通过 userId + date 的组合查找
    const existingCheckIn = await CheckIn.findOne({
      userId: req.user.userId,
      date: checkInDate
    });
    
    if (existingCheckIn) {
      return res.json({
        code: 400,
        message: '今天已经签到过了，不能重复签到',
        data: {
          existingRecord: {
            id: existingCheckIn._id,
            date: existingCheckIn.date,
            type: existingCheckIn.type
          }
        }
      });
    }
    
    // 5. 创建签到记录
    const checkIn = new CheckIn({
      userId: req.user.userId,           // 从 token 中获取的用户 ID
      date: checkInDate,
      type: type,
      isCompleted: type === 'completed', // completed 时为 true
      incompleteTasks: incompleteTasks || [],
      note: note || ''
    });
    
    // 6. 保存到数据库
    await checkIn.save();
    
    // 7. 返回成功结果
    res.json({
      code: 200,
      message: type === 'completed' ? '签到成功！继续保持交易纪律！' : '已记录手欠行为，下次注意！',
      data: {
        checkIn: {
          id: checkIn._id,
          date: checkIn.date,
          type: checkIn.type,
          isCompleted: checkIn.isCompleted,
          incompleteTasks: checkIn.incompleteTasks,
          note: checkIn.note
        }
      }
    });
    
  } catch (error) {
    console.error('签到错误:', error);
    
    // 处理重复签到错误（数据库唯一索引冲突）
    if (error.code === 11000) {
      return res.json({
        code: 400,
        message: '该日期已有签到记录',
        data: null
      });
    }
    
    res.json({
      code: 500,
      message: '签到失败: ' + error.message,
      data: null
    });
  }
});

// ============ 接口2：获取签到记录列表（按月查询） ============
// 请求方式: GET
// 请求地址: /api/checkin?year=2024&month=1
// 请求头: Authorization: Bearer <token>

router.get('/', async (req, res) => {
  try {
    // 1. 获取查询参数
    // 如果没传就用当前年月
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1); // getMonth() 从 0 开始
    
    // 2. 构造日期范围
    // padStart(2, '0') 把数字补成两位，比如 1 变成 "01"
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;  // 月初
    const endDate = `${year}-${monthStr}-31`;    // 月末（31 日可以覆盖所有月份）
    
    // 3. 查询数据库
    // find() 查找所有符合条件的记录
    // $gte: 大于等于, $lte: 小于等于
    const records = await CheckIn.find({
      userId: req.user.userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }); // sort 按日期升序排列
    
    // 4. 统计完成/未完成数量
    const completedCount = records.filter(r => r.isCompleted).length;
    const incompleteCount = records.filter(r => !r.isCompleted).length;
    
    // 5. 返回结果
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        year: year,
        month: month,
        total: records.length,           // 总签到天数
        completedCount: completedCount,  // 完成天数
        incompleteCount: incompleteCount,// 手欠天数
        records: records.map(r => ({     // 签到记录列表
          id: r._id,
          date: r.date,
          type: r.type,
          isCompleted: r.isCompleted,
          incompleteTasks: r.incompleteTasks,
          note: r.note
        }))
      }
    });
    
  } catch (error) {
    console.error('获取签到记录错误:', error);
    res.json({
      code: 500,
      message: '获取签到记录失败',
      data: null
    });
  }
});

// ============ 接口3：获取今日签到状态 ============
// 请求方式: GET
// 请求地址: /api/checkin/today
// 用途：前端可以用这个接口判断今天是否已签到

router.get('/today', async (req, res) => {
  try {
    // 获取今天的日期字符串
    const today = new Date().toISOString().slice(0, 10);
    
    // 查找今天的签到记录
    const record = await CheckIn.findOne({
      userId: req.user.userId,
      date: today
    });
    
    if (record) {
      // 今天已签到
      res.json({
        code: 200,
        message: '今天已签到',
        data: {
          hasCheckedIn: true,
          record: {
            id: record._id,
            date: record.date,
            type: record.type,
            isCompleted: record.isCompleted,
            incompleteTasks: record.incompleteTasks,
            note: record.note
          }
        }
      });
    } else {
      // 今天未签到
      res.json({
        code: 200,
        message: '今天还未签到',
        data: {
          hasCheckedIn: false,
          record: null
        }
      });
    }
    
  } catch (error) {
    console.error('获取今日签到状态错误:', error);
    res.json({
      code: 500,
      message: '获取今日签到状态失败',
      data: null
    });
  }
});

// ============ 接口4：获取签到统计数据 ============
// 请求方式: GET
// 请求地址: /api/checkin/stats
// 返回：本月统计、总体统计、连续签到天数

router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // 1. 获取本月统计
    const monthStr = String(month).padStart(2, '0');
    const monthStart = `${year}-${monthStr}-01`;
    const monthEnd = `${year}-${monthStr}-31`;
    
    const monthlyRecords = await CheckIn.find({
      userId: req.user.userId,
      date: { $gte: monthStart, $lte: monthEnd }
    });
    
    // 2. 获取所有签到记录（用于计算总体统计和连续签到）
    const allRecords = await CheckIn.find({
      userId: req.user.userId
    }).sort({ date: -1 }); // 按日期降序，最新的在前面
    
    // 3. 计算连续签到天数
    let streak = 0;
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // 获取所有签到日期
    const checkInDates = allRecords.map(r => r.date);
    
    // 如果今天或昨天有签到，才计算连续签到
    if (checkInDates.includes(today) || checkInDates.includes(yesterday)) {
      // 从最近一次签到开始往前数
      let checkDate = checkInDates.includes(today) ? today : yesterday;
      
      while (checkInDates.includes(checkDate)) {
        streak++;
        // 往前推一天
        const prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - 1);
        checkDate = prevDate.toISOString().slice(0, 10);
      }
    }
    
    // 4. 返回统计数据
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        // 本月统计
        monthly: {
          total: monthlyRecords.length,
          completed: monthlyRecords.filter(r => r.isCompleted).length,
          incomplete: monthlyRecords.filter(r => !r.isCompleted).length
        },
        // 总体统计
        overall: {
          total: allRecords.length,
          completed: allRecords.filter(r => r.isCompleted).length,
          incomplete: allRecords.filter(r => !r.isCompleted).length
        },
        // 连续签到天数
        streak: streak
      }
    });
    
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.json({
      code: 500,
      message: '获取统计数据失败',
      data: null
    });
  }
});

// 导出路由器
module.exports = router;
