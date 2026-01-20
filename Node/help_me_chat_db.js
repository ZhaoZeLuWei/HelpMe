const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/HelpMeChat';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);

    console.log('MongoDB 已成功连接到 HelpMeChat 数据库！');
  } catch (err) {
    console.error('MongoDB连接失败：', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;