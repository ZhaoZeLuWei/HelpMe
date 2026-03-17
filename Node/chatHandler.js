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

const getRoomList = async (queryParams) => {
  try {
    const { page = 1, pageSize = 20, userId, eventId, roomId } = queryParams;

    const query = {};

    if (roomId) {
      query._id = roomId;
    } else if (eventId) {
      query.eventId = eventId;
    } else if (userId) {
      const loginUserId = Number(userId);
      query.$or = [
        { creatorId: loginUserId },
        { partnerId: loginUserId },
      ];
    }

    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);

    if (isNaN(pageNum) || pageNum < 1 || isNaN(size) || size < 1 || size > 100) {
      return { success: false, message: '分页参数错误' };
    }

    const skip = (pageNum - 1) * size;

    // 查询房间
    const rooms = await Room.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(size)
      .lean();

    const total = await Room.countDocuments(query);

    // 收集房间涉及的用户ID和事件ID
    const userIds = new Set();
    const eventIds = new Set();

    rooms.forEach(room => {
      userIds.add(Number(room.creatorId));
      userIds.add(Number(room.partnerId));
      eventIds.add(Number(room.eventId));
    });

    // 一次性查询用户信息
    const [users] = await pool.query(
      `SELECT UserId, UserName, UserAvatar FROM Users WHERE UserId IN (?)`,
      [[...userIds]]
    );

    // 一次性查询事件信息
    const [events] = await pool.query(
      `SELECT EventId, EventTitle FROM Events WHERE EventId IN (?)`,
      [[...eventIds]]
    );

    // 构建映射表
    const userMap = {};
    users.forEach(u => {
      userMap[Number(u.UserId)] = {
        id: Number(u.UserId),
        name: u.UserName,
        avatar: u.UserAvatar || '/assets/icon/user.svg'
      };
    });

    const eventMap = {};
    events.forEach(e => {
      eventMap[Number(e.EventId)] = e.EventTitle;
    });

    // 构造返回数据，不区分谁是登录用户
    const formattedRooms = rooms.map(room => {
      const userAId = Number(room.creatorId);
      const userBId = Number(room.partnerId);

      const userA = userMap[userAId] || {
        id: userAId,
        name: '未知用户',
        avatar: '/assets/icon/user.svg'
      };

      const userB = userMap[userBId] || {
        id: userBId,
        name: '未知用户',
        avatar: '/assets/icon/user.svg'
      };

      return {
        roomId: room._id,
        userA,
        userB,
        event: {
          id: Number(room.eventId),
          name: eventMap[Number(room.eventId)] || '未知事件'
        },
        lastMsg: '',
        unreadCount: 0,
        updatedAt: room.updatedAt
      };
    });

    return {
      success: true,
      message: '查询房间列表成功',
      data: {
        rooms: formattedRooms,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size)
        }
      }
    };

  } catch (error) {
    console.log("读取房间列表失败：", error);
    return { success: false, message: '读取失败：' + error.message };
  }
};

module.exports.registerChatHandler = (io, socket) => {
  //join the room 加入聊天房间代码
  const joinRoom = async (roomId) => {
    //Node已经通过JWT获取了登陆用户的身份，并传递到客户端
    socket.emit('myself', socket.user);

    if (!roomId) return;
    try {
      let room = await Room.findById(roomId);
      if (!room) {

        const parts = roomId.split('_');

        const eventId = parseInt(parts[0], 10);
        const creatorId = parseInt(parts[1], 10);
        const partnerId = parseInt(parts[2], 10);

        room = await Room.create({
          _id: roomId,
          eventId,
          creatorId,
          partnerId
        });

        console.log(`Room created in MongoDB: ${roomId}`);
      }
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
          sendTime: new Date(),
        }
      );
    } catch (error) {
      console.log('joinRoom or CREATE room error:', error);
    }
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
      //这里调用了数据结构，通过api写入？
      await Message.create(messageData);

      //转发给对应房间号的客户端1-16
      io.to(roomId).emit('chat message', messageData);
    }
    catch (error) {
      console.log(error);
    }
  }


  socket.on('joinRoom', joinRoom);
  socket.on('chat message', handleChatMsg);
}

module.exports.getChatHistory = getChatHistory;
module.exports.getRoomList = getRoomList;
