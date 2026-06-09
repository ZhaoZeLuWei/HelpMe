/* eslint-env node, es2021 */
const Room = require("./models/Room");
const Message = require("./models/Message");
const { getIO } = require("./socketInstance.js");
const { moderateContent } = require("./Services/contentModeration.js");

// 注册客服 Socket 事件处理器（在 /support namespace 下）
module.exports.registerSupportHandler = (io, socket) => {
  // 加入客服房间
  const joinRoom = async (roomId) => {
    // 返回当前用户身份信息
    socket.emit("myself", socket.user);

    // 自动加入个人房间，用于接收通知
    if (socket.user && socket.user.id) {
      socket.join(socket.user.id.toString());
    }

    if (!roomId) return;

    // 校验 roomId 格式
    if (!String(roomId).startsWith("support_")) {
      socket.emit("support:error", { message: "无效的客服房间 ID" });
      return;
    }

    const roomUserId = Number(String(roomId).replace("support_", ""));
    const isAdmin = socket.user.role === "admin";

    // 权限校验：普通用户只能加入自己的客服房间
    if (!isAdmin && roomUserId !== socket.user.id) {
      socket.emit("support:error", { message: "无权加入此客服房间" });
      return;
    }

    try {
      let room = await Room.findById(roomId);

      // 房间不存在时自动创建
      if (!room) {
        room = await Room.create({
          _id: roomId,
          creatorId: roomUserId,
          partnerId: 0,
        });
        console.log(`客服房间已创建: ${roomId}`);
      }

      socket.join(roomId);
      socket.currentRoom = roomId;
      console.log(
        `客服房间连接成功: ${roomId} (用户: ${socket.user.name}, 角色: ${socket.user.role})`,
      );

      // 发送连接成功消息
      const connectText = isAdmin
        ? "客服已接入，可以开始对话"
        : "已连接至客服，请描述您遇到的问题";

      io.to(roomId).emit("support:connected", {
        text: connectText,
        senderId: "system_bot",
        userName: "系统通知",
        sendTime: new Date(),
      });

      // 清零当前用户的未读计数
      const unreadKey = isAdmin ? "0" : String(socket.user.id);
      await Room.updateOne(
        { _id: roomId },
        { $set: { [`unreadCount.${unreadKey}`]: 0 } },
      );

      // 如果是用户创建了新房间，通知所有管理员
      if (!isAdmin) {
        const personalRoom = socket.user.id.toString();
        socket.to(personalRoom).emit("support:newRoom", {
          roomId,
          userId: socket.user.id,
          userName: socket.user.name,
        });
      }
    } catch (error) {
      console.log("客服 joinRoom 错误:", error);
      socket.emit("support:error", { message: "加入房间失败" });
    }
  };

  // 发送客服消息
  const handleMessage = async (msg) => {
    try {
      const roomId = socket.currentRoom;

      if (!roomId || !String(roomId).startsWith("support_")) {
        socket.emit("support:error", { message: "未加入客服房间" });
        return;
      }

      // 校验房间存在且用户有权限
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("support:error", { message: "房间不存在" });
        return;
      }

      const isAdmin = socket.user.role === "admin";
      const isMember =
        room.creatorId === socket.user.id ||
        room.partnerId === socket.user.id ||
        isAdmin;

      if (!isMember) {
        socket.emit("support:error", { message: "无权在此房间发送消息" });
        return;
      }

      // 内容安全审核（仅审核文本消息）
      let finalText = msg.text || "";
      if (msg.messageType === "text" && msg.text && msg.text.trim()) {
        try {
          const moderationResult = await moderateContent(
            msg.text,
            "chatText",
            socket.user.id.toString(),
          );
          if (!moderationResult.safe) {
            finalText = moderationResult.maskedContent || msg.text;
            console.log(`客服聊天内容已打码处理: ${moderationResult.message}`);
          }
        } catch (moderationError) {
          console.error("客服聊天内容审核异常:", moderationError);
          socket.emit("support:moderationFailed", {
            message: "内容安全检测暂时不可用，请稍后重试",
          });
          return;
        }
      }

      const messageData = {
        roomId,
        messageType: msg.messageType || "text",
        text: finalText,
        imageUrl: msg.imageUrl || "",
        location: msg.location || null,
        senderId: socket.user.id,
        userName: isAdmin ? "客服" : socket.user.name,
        sendTime: new Date(),
      };

      // 写入 MongoDB
      await Message.create(messageData);

      // 更新房间最后消息和未读计数
      const receiverId = isAdmin ? room.creatorId : 0;
      await Room.updateOne(
        { _id: roomId },
        {
          $set: { lastMsg: messageData.text, updatedAt: new Date() },
          $inc: { [`unreadCount.${receiverId}`]: 1 },
        },
      );

      // 广播消息到房间
      io.to(roomId).emit("support:message", messageData);

      // 通知双方刷新列表（/support namespace）
      const notifyTargets = [room.creatorId, 0]; // 用户 + 管理员
      for (const uid of notifyTargets) {
        io.to(String(uid)).emit("support:listUpdate", {
          roomId,
          lastMsg: messageData.text,
          updatedAt: new Date(),
        });
      }

      // 同时向主 namespace 发送 listUpdate，通知用户端 tab3 实时刷新
      const mainIO = getIO();
      if (mainIO) {
        mainIO.to(String(room.creatorId)).emit("listUpdate", {
          roomId,
          lastMsg: messageData.text,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.log("客服消息处理错误:", error);
      socket.emit("support:error", { message: "发送消息失败" });
    }
  };

  socket.on("support:join", joinRoom);
  socket.on("support:message", handleMessage);
};
