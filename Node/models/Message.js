const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    ref: 'Room',
  },
  // 发送者ID
  senderId: {
    type: Number,
    required: true,
  },
  // 消息类型：text | image | location
  messageType: {
    type: String,
    enum: ['text', 'image', 'location'],
    default: 'text'
  },
  // 聊天内容（文本消息必填）
  text: {
    type: String,
    default: '',
  },
  // 图片URL（图片消息使用）
  imageUrl: {
    type: String,
    default: '',
  },
  // 位置信息（位置消息使用）
  location: {
    lng: { type: Number },
    lat: { type: Number },
    address: { type: String },
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
