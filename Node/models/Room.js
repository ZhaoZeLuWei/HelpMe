const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },

  // 关联的事件ID（系统通知房间可为空）
  eventId: {
    type: Number,
  },
  // 会话创建者ID（系统通知房间可为空）
  creatorId: {
    type: Number,
  },
  // 聊天对象ID（开启聊天的人）（系统通知房间可为空）
  partnerId: {
    type: Number,
  },
  // 最后一条消息内容
  lastMsg: {
    type: String,
    default: "",
  },
  // 最后时间
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // 每个用户的未读消息数
  unreadCount: {
    type: Map,
    of: Number,
    default: {}, // 初始化为空对象
  },
});

// 导出Model（对应MongoDB中的rooms集合）
module.exports = mongoose.model("Room", RoomSchema);
