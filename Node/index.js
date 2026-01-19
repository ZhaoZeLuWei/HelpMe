/* eslint-env node, es2021 */
const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const corsMiddleware = require("./routes/cors.js");
const { uploadDir } = require("./routes/upload.js");

//import my js files here
const pool = require("./help_me_db.js");
const registerChatHandler = require("./chatHandler.js");

//all routes imports here 这里引用路由
const testRoutes = require("./routes/test.js");
const userRoutes = require("./routes/user.js");
const eventRoutes = require("./routes/event.js");
const verifyRoutes = require("./routes/verify.js");
const orderRoutes = require("./routes/order.js");
const reviewRoutes = require("./routes/review.js");

//use all routes here 这里使用路由，定义URL路径
const app = express();

app.use(express.json());
app.use(corsMiddleware);

app.use("/img", express.static(uploadDir));

app.use("/test", testRoutes);

app.use(userRoutes);
app.use(eventRoutes);
app.use(verifyRoutes);
app.use(orderRoutes);
app.use(reviewRoutes);

const server = createServer(app);

const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: "http://localhost:8100",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

//this part for socketIO
io.on("connection", (socket) => {
  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("disconnect");
  });
});

//server listen on port 3000
server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
