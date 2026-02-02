const express = require("express");
const router = express.Router();

const { getChatHistory, getRoomList } = require('../chatHandler.js');

// 读取聊天信息
router.get('/api/messages/history', async (req, res) => {
  const result = await getChatHistory(req.query);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

// 读取房间列表
router.get('/api/rooms/list', async (req, res) => {
  const result = await getRoomList(req.query);
  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

module.exports = router;