# Trading Mind 后端服务

一个简单的 Node.js + Express + MongoDB 后端，提供用户注册/登录和签到功能。

---

## 📁 项目结构

```
backend/
├── server.js           # 入口文件（启动服务器、连接数据库）
├── package.json        # 项目配置和依赖列表
├── models/             # 数据模型（定义数据库表结构）
│   ├── User.js         # 用户模型
│   └── CheckIn.js      # 签到记录模型
├── routes/             # 路由（API 接口）
│   ├── user.js         # 用户相关接口
│   └── checkin.js      # 签到相关接口
└── middleware/         # 中间件
    └── auth.js         # 登录验证中间件
```

---

## 🚀 快速开始（新手必看）

### 第一步：确保你已安装 Node.js

打开命令行，输入以下命令检查：
```bash
node -v
```
如果显示版本号（如 v18.17.0），说明已安装。
如果提示找不到命令，请先去 https://nodejs.org 下载安装 Node.js。

### 第二步：进入 backend 目录

```bash
cd c:\Users\haimi\Desktop\trading_mind_app_new\backend
```

### 第三步：安装依赖

```bash
npm install
```
这会自动下载项目需要的所有依赖包（express、mongoose 等）。

### 第四步：启动服务

```bash
npm start
```

如果看到以下输出，说明启动成功：
```
正在连接 MongoDB 数据库...
✅ MongoDB 数据库连接成功！
✅ 服务器已启动！
👉 访问地址: http://localhost:3000
```

### 第五步：测试接口

打开浏览器访问 http://localhost:3000 ，应该看到：
```json
{"code":200,"message":"Trading Mind API 服务运行正常！","data":{"version":"1.0.0"}}
```

---

## ⚠️ 需要修改的地方

打开 `server.js` 文件，找到以下配置：

```javascript
// 【重要】MongoDB 连接字符串 - 已配置为你的云数据库
const MONGODB_URI = 'mongodb+srv://appuser:4z5z6zt043---@cluster0.l1pyixo.mongodb.net/trading_mind?retryWrites=true&w=majority';

// 【重要】JWT 密钥 - 建议修改为你自己的复杂字符串
const JWT_SECRET = 'trading_mind_secret_key_2024_change_me';
```

---

## 📖 API 接口文档

### 1. 用户注册

- **地址**: `POST http://localhost:3000/api/user/register`
- **请求体**:
```json
{
  "username": "张三",
  "email": "zhangsan@qq.com",
  "password": "123456"
}
```
- **成功响应**:
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "用户ID",
      "username": "张三",
      "email": "zhangsan@qq.com"
    },
    "token": "登录凭证，需要保存"
  }
}
```

### 2. 用户登录

- **地址**: `POST http://localhost:3000/api/user/login`
- **请求体**:
```json
{
  "email": "zhangsan@qq.com",
  "password": "123456"
}
```
- **成功响应**: 同注册接口

### 3. 获取用户信息（需要登录）

- **地址**: `GET http://localhost:3000/api/user/info`
- **请求头**: `Authorization: Bearer <token>`

### 4. 创建签到记录（需要登录）

- **地址**: `POST http://localhost:3000/api/checkin`
- **请求头**: `Authorization: Bearer <token>`
- **请求体**:
```json
{
  "type": "completed",
  "incompleteTasks": [
    {"title": "买点计划", "content": "未执行"}
  ],
  "note": "今天表现不错"
}
```
- **type 说明**:
  - `completed`: 完成签到（遵守交易纪律）
  - `incomplete`: 手欠签到（违反交易纪律）

### 5. 获取签到记录（需要登录）

- **地址**: `GET http://localhost:3000/api/checkin?year=2024&month=1`
- **请求头**: `Authorization: Bearer <token>`

### 6. 获取今日签到状态（需要登录）

- **地址**: `GET http://localhost:3000/api/checkin/today`
- **请求头**: `Authorization: Bearer <token>`

### 7. 获取签到统计（需要登录）

- **地址**: `GET http://localhost:3000/api/checkin/stats`
- **请求头**: `Authorization: Bearer <token>`

---

## 🔧 常见问题

### Q: 启动时提示 "MongoDB 连接失败"
- 检查网络是否能访问外网
- 检查 MongoDB 连接字符串是否正确
- 确认 MongoDB Atlas 中是否允许了你的 IP 访问

### Q: npm install 失败
- 检查是否正确安装了 Node.js
- 尝试使用淘宝镜像: `npm config set registry https://registry.npmmirror.com`

### Q: 接口返回 "请先登录"
- 确保请求头中携带了正确的 token
- 格式: `Authorization: Bearer 你的token`

---

## 📦 使用的依赖包

| 包名 | 作用 |
|------|------|
| express | Web 框架，处理 HTTP 请求 |
| mongoose | MongoDB 数据库操作工具 |
| bcryptjs | 密码加密 |
| jsonwebtoken | 生成和验证登录凭证 |
| cors | 允许跨域请求 |
| nodemon | 开发时自动重启服务 |
