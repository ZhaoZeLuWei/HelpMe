const express = require("express");
const {getRoomListFilteredByUser} = require("../chatHandler");
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

// 读取房间列表（支持用户 ID 筛选）
router.get('/api/rooms/list', async (req, res) => {
  const result = await getRoomList(req.query);
  const { userId } = req.query; // 获取 URL 中的参数

  if (result.success) {
    // 如果传入了 userId，则在返回前进行过滤
    if (userId) {
      const targetId = parseInt(userId);
      result.data.rooms = result.data.rooms.filter(room =>
        room.userA.id === targetId || room.userB.id === targetId
      );
      // 同步更新分页总数（如果需要的话）
      result.data.pagination.total = result.data.rooms.length;
    }

    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

module.exports = router;
