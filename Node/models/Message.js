const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    ref: "Room", // 关联Room模型
  },
  // 发送者ID
  senderId: {
    type: Number,
    required: true,
  },
  // 聊天内容
  text: {
    type: String,
    required: true,
  },
  // 发送时间
  sendTime: {
    type: Date,
    default: Date.now,
  },
  // 用户名
  userName: {
    type: String,
    default: "",
  },
  // 目标用户ID（为空表示所有人都可见，有值则只有指定用户可见）
  targetUserId: {
    type: Number,
    default: null,
  },
});

// 导出Model（对应MongoDB中的messages集合）
module.exports = mongoose.model("Message", MessageSchema);
