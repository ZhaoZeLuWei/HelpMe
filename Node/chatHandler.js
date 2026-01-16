/* eslint-env node, es2021 */
const pool = require('./help_me_db.js');
const Room = require('./models/Room');
const Message = require('./models/Message');
//socket.emit 个人错误提示
//io.to(room).emit 指定房间包含自己，对话转发
//socket.io(roon).emit “谁加入了房间”，这个东西自己看不到
//io.emit  系统公告，全站广播
module.exports = (io, socket) => {

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
