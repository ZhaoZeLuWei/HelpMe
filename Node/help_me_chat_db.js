const mongoose = require("mongoose");

// 从环境变量读取 MongoDB 连接串，不再硬编码
const mongoURI = process.env.CHAT_MONGO_URI; // 默认连接到本地 MongoDB 的 helpmechat 数据库

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);

    console.log("MongoDB 已成功连接到 HelpMeChat 数据库！");
  } catch (err) {
    console.error("MongoDB连接失败：", err.message);
    console.log("继续启动服务器，MongoDB功能将不可用");
  }
};

module.exports = connectDB;
