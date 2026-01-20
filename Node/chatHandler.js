/* eslint-env node, es2021 */
const pool = require('./help_me_db.js');
const Room = require('./models/Room');
const Message = require('./models/Message');
//socket.emit 个人错误提示
//io.to(room).emit 指定房间包含自己，对话转发
//socket.io(roon).emit “谁加入了房间”，这个东西自己看不到
//io.emit  系统公告，全站广播

const getChatHistory = async (queryParams) => {
  try {
    const { roomId, page = 1, pageSize = 20, startTime, endTime } = queryParams;
    
    const query = {}; // 默认为空对象，表示查询所有文档
    if (roomId) {
      query.roomId = roomId; // 如果传了 roomId，才加上筛选条件
    }

    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(size) || size < 1 || size > 100) {
      return { success: false, message: '分页参数错误（page≥1，pageSize 1-100）' };
    }

    if (startTime) {
      const start = new Date(startTime);
      if (!isNaN(start.getTime())) query.sendTime = { $gte: start };
    }
    if (endTime) {
      const end = new Date(endTime);
      if (!isNaN(end.getTime())) {
        query.sendTime = query.sendTime ? { ...query.sendTime, $lte: end } : { $lte: end };
      }
    }

    const skip = (pageNum - 1) * size;

    const historyMessages = await Message.find(query)
      .sort({ sendTime: 1 })
      .skip(skip)
      .limit(size)
      .lean();

    const total = await Message.countDocuments(query);

    const formattedMessages = historyMessages.map(msg => ({
      id: msg._id.toString(),
      roomId: msg.roomId,
      senderId: msg.senderId,
      text: msg.text,
      sendTime: new Date(msg.sendTime).toLocaleString(),
      userName: msg.userName 
    }));

    // 返回结果
    return {
      success: true,
      message: '查询历史消息成功',
      data: {
        messages: formattedMessages,
        pagination: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) }
      }
    };

  } catch (error) {
    console.log("读取历史消息失败：", error);
    return { success: false, message: '读取失败：' + error.message };
  }
};
module.exports.registerChatHandler = (io, socket) => {

  //join the room
  const joinRoom = (roomId) => {
    //🚨需要JWT验证确认身份再真正对接后端？(1-16 Node穿入Fake身份）
    //先用Node 写好的身份，告诉客户端（前端）我是谁
    socket.emit('myself', socket.user);


    if (!roomId) return;
    socket.join(roomId);

    //share the room id to all socket functions!
    socket.currentRoom = roomId;

    const joined = `connect to room ${roomId} SUCCESS ✅`;
    console.log(joined);

    //send connectSuccess Msg
    io.to(roomId).emit('connectSuccess', {
        text: joined,
        senderId: 'system_bot',
        userName: '系统通知',
        timestamp: new Date(),
      }
    );
  }

  //get the msg from client
  //add async - part7
  const handleChatMsg = async (msg) => {
    try {
      const roomId = socket.currentRoom;

      //an easy check for room id
      if(!roomId) {
        console.log("User didn't joined any room!");
        return;
      }

      const messageData = {
        roomId: roomId,
        text: msg.text,
        senderId: socket.user.id,
        userName: socket.user.name,
        timestamp: new Date(),
      }

      //a simple console to check the node actually get the msg details
      console.log(`[${messageData.timestamp}] ${messageData.userName}: ${messageData.text}`);

      //📃write into MongoDB 1-16
      await Message.create(messageData);

      //转发给对应房间号的客户端1-16
      io.to(roomId).emit('chat message', messageData);
    }
    catch (error) {
      console.log(error);
    }
  }

  //监听器
  socket.on('joinRoom', joinRoom);
  socket.on('chat message', handleChatMsg);
}

module.exports.getChatHistory = getChatHistory;