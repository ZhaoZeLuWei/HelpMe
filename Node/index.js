/* eslint-env node, es2021 */
const express = require('express');
const { createServer } = require('node:http');
const { join} = require('node:path');
const { Server } = require('socket.io');

//connect to local mysql database
const mysql = require('mysql2/promise');
async function startServer() {
    const dbConfig = await mysql.createPool(
        {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'Xzw13068!',
            database: 'chat_db',
        });
}
startServer();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery:{},
  //cors allow connections
  cors: {
    origin: 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }

});

//a text html here
app.get('/', (req, res) => {
    res.sendFile(join(__dirname + '/test.html'));
});

io.on('connection', (socket) => {

    //send a msg that connect success
    socket.emit('connectSuccess', {
        text: '连接聊天服务器成功！',
        senderId: 'system_bot',
        userName: '系统通知',
        timestamp: new Date(),
      }
      );

    //get the msg from client
    //add async - part7
    socket.on('chat message', async (msg) => {
        try {
            const messageData = {
              text: msg.text,
              senderId: msg.senderId,
              userName: msg.userName,
              timestamp: new Date().toISOString(),
            }

            console.log(`[${messageData.timestamp}] ${messageData.userName}: ${messageData.text}`);
            //转发给所有连接的客户端
            io.emit('chat message', messageData);
        }
        catch (error) {
            console.log(error);
        }
    })
})


server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
