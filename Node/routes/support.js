const express = require("express");
const router = express.Router();
const pool = require("../help_me_db.js");
const Room = require("../models/Room.js");
const Message = require("../models/Message.js");
const { authRequired, adminRequired } = require("./auth.js");
const { getIO } = require("../socketInstance.js");
const { moderateContent } = require("../Services/contentModeration.js");

// 用户创建或获取自己的客服房间
router.post("/api/support/room", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "未登录" });
    }

    const roomId = `support_${userId}`;

    // 查找或创建房间
    let room = await Room.findById(roomId);
    if (!room) {
      room = await Room.create({
        _id: roomId,
        creatorId: userId,
        partnerId: 0,
      });

      // 通知管理员有新的客服请求
      const io = getIO();
      if (io) {
        const [users] = await pool.query(
          `SELECT UserName FROM Users WHERE UserId = ?`,
          [userId],
        );
        const userName = users.length ? users[0].UserName : "未知用户";

        // 向管理员个人房间广播新客服请求
        io.of("/support").to("0").emit("support:newRoom", {
          roomId,
          userId,
          userName,
        });
      }
    }

    return res.json({ success: true, data: { roomId, room } });
  } catch (err) {
    console.error("创建客服房间失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 管理员获取所有客服房间列表
router.get("/api/support/rooms", adminRequired, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 50;
    const skip = (page - 1) * pageSize;

    // 查询所有 support_ 前缀的房间
    const query = { _id: /^support_/ };
    const rooms = await Room.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Room.countDocuments(query);

    // 收集用户 ID 并查询用户信息
    const userIds = rooms.map((r) => r.creatorId).filter(Boolean);
    const users =
      userIds.length > 0
        ? (
            await pool.query(
              `SELECT UserId, UserName, UserAvatar FROM Users WHERE UserId IN (?)`,
              [userIds],
            )
          )[0]
        : [];

    const userMap = {};
    users.forEach((u) => {
      userMap[Number(u.UserId)] = {
        id: Number(u.UserId),
        name: u.UserName,
        avatar: u.UserAvatar || "/assets/icon/user.svg",
      };
    });

    const formattedRooms = rooms.map((room) => {
      const user = userMap[Number(room.creatorId)] || {
        id: Number(room.creatorId),
        name: "未知用户",
        avatar: "/assets/icon/user.svg",
      };

      return {
        roomId: room._id,
        userId: Number(room.creatorId),
        userName: user.name,
        userAvatar: user.avatar,
        lastMsg: room.lastMsg || "",
        unreadCount: room.unreadCount || {},
        updatedAt: room.updatedAt,
      };
    });

    return res.json({
      success: true,
      data: {
        rooms: formattedRooms,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    console.error("获取客服房间列表失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取客服房间消息历史（用户和管理员均可）
router.get("/api/support/messages", authRequired, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const userRole = req.user?.role;
    const { roomId, page = 1, pageSize = 50, sortOrder } = req.query;

    if (!roomId || !String(roomId).startsWith("support_")) {
      return res
        .status(400)
        .json({ success: false, message: "无效的客服房间 ID" });
    }

    // 权限校验
    const roomUserId = Number(String(roomId).replace("support_", ""));
    if (userRole !== "admin" && roomUserId !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "无权访问此房间" });
    }

    const pageNum = parseInt(page, 10);
    const size = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * size;
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const messages = await Message.find({ roomId })
      .sort({ sendTime: sortDir })
      .skip(skip)
      .limit(size)
      .lean();

    const total = await Message.countDocuments({ roomId });

    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      roomId: msg.roomId,
      senderId: msg.senderId,
      messageType: msg.messageType || "text",
      text: msg.text || "",
      imageUrl: msg.imageUrl || "",
      location: msg.location || null,
      sendTime: msg.sendTime,
      userName: msg.userName,
    }));

    return res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (err) {
    console.error("获取客服消息历史失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取客服统计信息（管理员）
router.get("/api/support/stats", adminRequired, async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments({ _id: /^support_/ });

    // 统计有未读消息的房间数（管理员未读）
    const unreadRooms = await Room.countDocuments({
      _id: /^support_/,
      "unreadCount.0": { $gt: 0 },
    });

    return res.json({
      success: true,
      data: { totalRooms, unreadRooms },
    });
  } catch (err) {
    console.error("获取客服统计失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 封禁申诉（免登录，通过手机号识别被封禁用户）
router.post("/api/support/appeal", async (req, res) => {
  try {
    const { phone, message } = req.body || {};

    if (!phone || !message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "请填写手机号和申诉内容" });
    }

    // 查找用户并验证是否被封禁
    const [rows] = await pool.query(
      "SELECT UserId, UserName, IsBanned FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "该手机号未注册" });
    }

    const user = rows[0];
    if (!user.IsBanned) {
      return res
        .status(400)
        .json({ success: false, message: "该账号未被封禁，请直接登录" });
    }

    const userId = user.UserId;
    const roomId = `support_${userId}`;

    // 内容安全审核
    let finalText = message.trim();
    try {
      const modResult = await moderateContent(
        finalText,
        "chatText",
        String(userId),
      );
      if (!modResult.safe) {
        finalText = modResult.maskedContent || finalText;
      }
    } catch (modErr) {
      console.error("申诉内容审核异常:", modErr);
      return res
        .status(500)
        .json({
          success: false,
          message: "内容安全检测暂时不可用，请稍后重试",
        });
    }

    // 确保客服房间存在
    let room = await Room.findById(roomId);
    if (!room) {
      room = await Room.create({
        _id: roomId,
        creatorId: userId,
        partnerId: 0,
      });
    }

    // 发送申诉消息
    const messageData = {
      roomId,
      senderId: userId,
      messageType: "text",
      text: `[封禁申诉] ${finalText}`,
      userName: user.UserName,
      sendTime: new Date(),
    };
    await Message.create(messageData);

    // 更新房间
    await Room.updateOne(
      { _id: roomId },
      {
        $set: { lastMsg: messageData.text, updatedAt: new Date() },
        $inc: { "unreadCount.0": 1 },
      },
    );

    // 通知管理员（主 namespace + 客服 namespace）
    const io = getIO();
    if (io) {
      const listUpdate = {
        roomId,
        lastMsg: messageData.text,
        updatedAt: new Date(),
      };
      io.of("/support").to("0").emit("support:listUpdate", listUpdate);
      io.of("/support").to("0").emit("support:newRoom", {
        roomId,
        userId,
        userName: user.UserName,
      });
    }

    return res.json({ success: true, message: "申诉已提交，管理员会尽快处理" });
  } catch (err) {
    console.error("封禁申诉失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 封禁用户查看客服回复（免登录，通过手机号验证）
router.get("/api/support/appeal/messages", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: "缺少手机号" });
    }

    // 查找用户并验证是否被封禁
    const [rows] = await pool.query(
      "SELECT UserId, IsBanned FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "该手机号未注册" });
    }

    if (!rows[0].IsBanned) {
      return res
        .status(400)
        .json({ success: false, message: "该账号未被封禁" });
    }

    const roomId = `support_${rows[0].UserId}`;
    const messages = await Message.find({ roomId })
      .sort({ sendTime: 1 })
      .limit(100)
      .lean();

    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      senderId: msg.senderId,
      messageType: msg.messageType || "text",
      text: msg.text || "",
      imageUrl: msg.imageUrl || "",
      sendTime: msg.sendTime,
      userName: msg.userName,
    }));

    return res.json({ success: true, data: { messages: formattedMessages } });
  } catch (err) {
    console.error("获取申诉消息失败:", err);
    return res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
