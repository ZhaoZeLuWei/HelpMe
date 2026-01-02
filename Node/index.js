/* eslint-env node, es2021 */
const express = require('express');
const { createServer } = require('node:http');
const { join} = require('node:path');
const { Server } = require('socket.io');

//import my js files here
const pool = require('./help_me_db.js');
const registerChatHandler = require('./chatHandler.js');

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

//read the database (messages table)
app.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Users');
  console.log("Reading...");
  res.json(rows); // 关键：返回纯 JSON 数据
  console.log(rows);
});

//this is a test html for simple chat
app.get('/test', (req, res) => {
    res.sendFile(join(__dirname + '/test.html'));
});

//this part for socketIO
io.on('connection', (socket) => {
  registerChatHandler(io, socket);

  socket.on('disconnect', () => {
    console.log('disconnect');
  })
})

//server listen on port 3000
server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
