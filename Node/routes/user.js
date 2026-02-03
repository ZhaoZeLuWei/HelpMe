//用户相关内容

const express = require("express");
const pool = require("../help_me_db.js");
const { signToken } = require("./auth.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");

const router = express.Router();

// 检查手机号是否已注册
router.post("/check-phone", async (req, res) => {
  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: "手机号不能为空" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT UserId FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );

    const exists = existing && existing.length > 0;
    return res.json({ success: true, exists });
  } catch (err) {
    console.error("DB query error (check-phone):", err);
    return res.status(500).json({ error: "查询失败" });
  }
});

// 注册：接收 { phone, code, userName, realName, location, birthDate, introduction } + 可选头像
router.post(
  "/register",
  withMulter(upload.single("avatar")),
  async (req, res) => {
    const {
      phone,
      code,
      userName,
      realName,
      idCardNumber,
      location,
      birthDate,
      introduction,
    } = req.body || {};

    // 验证必填字段
    if (
      !phone ||
      !code ||
      !userName ||
      !realName ||
      !idCardNumber ||
      !location ||
      !birthDate
    ) {
      return res.status(400).json({ error: "请填写所有必填项" });
    }

    // 验证码校验（固定为 '1234'）
    if (String(code) !== "1234") {
      return res.status(401).json({ error: "验证码错误" });
    }

    try {
      // 检查手机号是否已注册
      const [existing] = await pool.query(
        "SELECT UserId FROM Users WHERE PhoneNumber = ? LIMIT 1",
        [phone],
      );

      if (existing && existing.length > 0) {
        // 清理已上传的文件
        if (req.file) cleanupUploadedFiles([req.file]);
        return res.status(409).json({ error: "该手机号已注册" });
      }

      // 检查身份证号是否已被使用
      const [existingIdCard] = await pool.query(
        "SELECT UserId FROM Users WHERE IdCardNumber = ? LIMIT 1",
        [idCardNumber],
      );

      if (existingIdCard && existingIdCard.length > 0) {
        // 清理已上传的文件
        if (req.file) cleanupUploadedFiles([req.file]);
        return res.status(409).json({ error: "该身份证号已被注册" });
      }

      // 处理头像路径（SQL中UserAvatar是NOT NULL，所以必须提供默认值）
      const avatarPath = req.file
        ? `/img/${req.file.filename}`
        : "/img/user.svg";

      // 插入新用户
      const [result] = await pool.query(
        "INSERT INTO Users (PhoneNumber, UserName, RealName, IdCardNumber, Location, BirthDate, Introduction, UserAvatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          phone,
          userName,
          realName,
          idCardNumber,
          location,
          birthDate,
          introduction || null,
          avatarPath,
        ],
      );

      const userId = result.insertId;

      // 同时在 Consumers 表中创建记录（初始买家评分为0）
      await pool.query(
        "INSERT INTO Consumers (ConsumerId, BuyerRanking) VALUES (?, 0)",
        [userId],
      );

      // 获取新创建的用户信息
      const [rows] = await pool.query(
        "SELECT UserId, UserName, PhoneNumber FROM Users WHERE UserId = ? LIMIT 1",
        [userId],
      );

      const user = rows[0];
      const token = signToken(user);

      return res.json({ success: true, user, token });
    } catch (err) {
      console.error("DB query error (register):", err);
      // 注册失败时清理已上传的头像文件
      if (req.file) cleanupUploadedFiles([req.file]);

      // 处理MySQL唯一约束冲突错误
      if (err.code === "ER_DUP_ENTRY") {
        if (err.message.includes("PhoneNumber")) {
          return res.status(409).json({ error: "该手机号已注册" });
        } else if (err.message.includes("IdCardNumber")) {
          return res.status(409).json({ error: "该身份证号已被注册" });
        }
        return res
          .status(409)
          .json({ error: "注册信息重复，请检查手机号或身份证号" });
      }

      // 其他数据库错误
      return res.status(500).json({ error: "注册失败，数据库错误" });
    }
  },
);

// 登录：接收 { phone, code }，验证码固定为 '1234'
router.post("/login", async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: "请填写手机号和验证码" });
  }
  if (String(code) !== "1234") {
    return res.status(401).json({ error: "验证码错误" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT UserId, UserName, PhoneNumber FROM Users WHERE PhoneNumber = ? LIMIT 1",
      [phone],
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "该手机号未注册" });
    }

    const user = rows[0];
    const token = signToken(user);

    return res.json({ success: true, user, token });
  } catch (err) {
    console.error("DB query error (login):", err);
    return res.status(500).json({ error: "登录失败，数据库错误" });
  }
});

// 获取用户发布的事件列表
router.get("/users/:id/events", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT EventId, EventTitle, EventType, EventCategory, Location, Price, Photos, EventDetails, CreateTime FROM Events WHERE CreatorId = ? ORDER BY CreateTime DESC LIMIT 50",
      [userId],
    );
    return res.json(rows);
  } catch (err) {
    console.error("DB query error (user events):", err);
    return res.status(500).json({ error: "获取用户事件列表失败" });
  }
});

// 获取用户完整资料（包含 Consumers/Providers 信息）
router.get("/users/:id/profile", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.RealName, u.IdCardNumber, u.PhoneNumber, u.UserAvatar, u.Location, u.BirthDate, u.Introduction, u.CreateTime,
              (SELECT VerificationStatus FROM Verifications v WHERE v.ProviderId = u.UserId ORDER BY v.SubmissionTime DESC LIMIT 1) AS VerificationStatus,
              c.BuyerRanking, p.ProviderRole, p.OrderCount, p.ServiceRanking
       FROM Users u
       LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
       LEFT JOIN Providers p ON u.UserId = p.ProviderId
       WHERE u.UserId = ? LIMIT 1`,
      [userId],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("DB query error (profile):", err);
    return res.status(500).json({ error: "获取用户资料失败" });
  }
});

// 更新用户资料
router.put("/users/:id/profile", async (req, res) => {
  const userId = req.params.id;
  const {
    UserName,
    RealName,
    IdCardNumber,
    Location,
    BirthDate,
    Introduction,
    UserAvatar,
  } = req.body || {};

  // 验证必填字段
  if (!UserName || !RealName || !IdCardNumber || !Location || !BirthDate) {
    return res.status(400).json({ error: "请填写所有必填项" });
  }

  try {
    // 检查用户是否存在
    const [existing] = await pool.query(
      "SELECT UserId FROM Users WHERE UserId = ? LIMIT 1",
      [userId],
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }

    // 检查身份证号是否被其他用户使用
    const [existingIdCard] = await pool.query(
      "SELECT UserId FROM Users WHERE IdCardNumber = ? AND UserId != ? LIMIT 1",
      [IdCardNumber, userId],
    );

    if (existingIdCard && existingIdCard.length > 0) {
      return res.status(409).json({ error: "该身份证号已被其他用户使用" });
    }

    // 构建更新语句
    const updateFields = [];
    const updateValues = [];

    updateFields.push("UserName = ?");
    updateValues.push(UserName);

    updateFields.push("RealName = ?");
    updateValues.push(RealName);

    updateFields.push("IdCardNumber = ?");
    updateValues.push(IdCardNumber);

    updateFields.push("Location = ?");
    updateValues.push(Location);

    updateFields.push("BirthDate = ?");
    updateValues.push(BirthDate);

    updateFields.push("Introduction = ?");
    updateValues.push(Introduction || null);

    if (UserAvatar) {
      updateFields.push("UserAvatar = ?");
      updateValues.push(UserAvatar);
    }

    updateValues.push(userId);

    // 执行更新
    await pool.query(
      `UPDATE Users SET ${updateFields.join(", ")} WHERE UserId = ?`,
      updateValues,
    );

    // 获取更新后的用户信息
    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.RealName, u.IdCardNumber, u.PhoneNumber, u.UserAvatar, u.Location, u.BirthDate, u.Introduction,
              (SELECT VerificationStatus FROM Verifications v WHERE v.ProviderId = u.UserId ORDER BY v.SubmissionTime DESC LIMIT 1) AS VerificationStatus,
              c.BuyerRanking, p.ProviderRole, p.OrderCount, p.ServiceRanking
       FROM Users u
       LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
       LEFT JOIN Providers p ON u.UserId = p.ProviderId
       WHERE u.UserId = ? LIMIT 1`,
      [userId],
    );

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("DB query error (update profile):", err);

    // 处理MySQL唯一约束冲突错误
    if (err.code === "ER_DUP_ENTRY") {
      if (err.message.includes("IdCardNumber")) {
        return res.status(409).json({ error: "该身份证号已被其他用户使用" });
      }
    }

    return res.status(500).json({ error: "更新用户资料失败" });
  }
});

module.exports = router;
