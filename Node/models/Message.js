const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true, 
    ref: 'Room' // 关联Room模型
  },
  // 发送者ID
  senderId: {
    type: Number,
    required: true
  },
  // 聊天内容
  text: {
    type: String,
    required: true
  },
  // 发送时间
  sendTime: {
    type: Date,
    default: Date.now
  }
});

// 导出Model（对应MongoDB中的messages集合）
module.exports = mongoose.model('Message', MessageSchema);