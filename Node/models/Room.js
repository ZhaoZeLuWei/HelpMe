const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  _id: {
    type: String,
   required: true,
    unique: true 
   },
  
  // 关联的事件ID
  eventId: {
    type: Number,
    required: true
  },
  // 会话创建者ID
  creatorId: {
    type: Number,
    required: true
  },
  // 聊天对象ID（开启聊天的人）
  partnerId: {
    type: Number,
    required: true
  },
  // 最后一条消息内容
  lastMsg: {
    type: String,
    default: ''
  },
  // 最后时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 导出Model（对应MongoDB中的rooms集合）
module.exports = mongoose.model('Room', RoomSchema);