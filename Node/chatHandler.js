/* eslint-env node, es2021 */
const pool = require('./help_me_db.js');

module.exports = (io, socket) => {
  //send a msg when connection success!
  const sendWelcomeMsg = () => {
    socket.emit('connectSuccess', {
        text: '连接聊天服务器成功！',
        senderId: 'system_bot',
        userName: '系统通知',
        timestamp: new Date(),
      }
    );
    console.log("Connected!!");
  };

  //get the msg from client
  //add async - part7
  const handleChatMsg = async (msg) => {
    try {
      const messageData = {
        text: msg.text,
        senderId: msg.senderId,
        userName: msg.userName,
        timestamp: new Date().toISOString(),
      }
      //before that we need to store the msg into our database
      console.log("wait to store this msg into db");

      //a simple console to check the node actually get the msg details
      console.log(`[${messageData.timestamp}] ${messageData.userName}: ${messageData.text}`);
      //转发给所有连接的客户端
      io.emit('chat message', messageData);
    }
    catch (error) {
      console.log(error);
    }
  }

  sendWelcomeMsg();
  socket.on('chat message', handleChatMsg);
}
