//用户相关内容

const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../help_me_db.js");
const { signToken, authRequired, adminRequired } = require("./auth.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");
const {
  moderateContent,
  moderateContents,
} = require("../Services/contentModeration.js");
const {
  sendVerifyCode,
  verifyCode: verifySmsCode,
} = require("../Services/smsService.js");
const { verifyCaptcha } = require("../Services/captchaService.js");

const router = express.Router();

// 管理员凭据（必须从环境变量读取）
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 环境变量
const NODE_ENV = process.env.NODE_ENV || "development";
const DEV_VERIFY_CODE = process.env.DEV_VERIFY_CODE || "1234";

// 检查必要环境变量是否配置
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("错误: 缺少管理员凭据环境变量 ADMIN_USERNAME / ADMIN_PASSWORD");
}

// 简单的验证码发送频率限制（内存级，生产环境应使用 Redis）
const smsRateLimit = new Map(); // phone -> { count, lastSendTime }

function checkSmsRateLimit(phone) {
  const now = Date.now();
  const record = smsRateLimit.get(phone);

  if (!record) {
    smsRateLimit.set(phone, { count: 1, lastSendTime: now });
    return true;
  }

  // 60 秒内只能发送一次
  if (now - record.lastSendTime < 60000) {
    return false;
  }

  smsRateLimit.set(phone, { count: 1, lastSendTime: now });
  return true;
}

// 发送验证码（集成阿里云号码认证服务）
async function sendCode(phone) {
  // 检查发送频率
  if (!checkSmsRateLimit(phone)) {
    return { success: false, error: "发送过于频繁，请 60 秒后再试" };
  }

  // 是否启用真实短信服务（开发环境也可开启）
  const USE_REAL_SMS = process.env.USE_REAL_SMS === "true";
  console.log("[验证码] 环境:", NODE_ENV, "USE_REAL_SMS:", USE_REAL_SMS);

  // 开发环境且未启用真实短信：使用固定验证码
  if (NODE_ENV !== "production" && !USE_REAL_SMS) {
    console.log(`[开发模式] 使用固定验证码: ${DEV_VERIFY_CODE}`);
    return { success: true, message: "验证码已发送（开发模式）" };
  }

  // 调用阿里云号码认证服务
  console.log("[验证码] 调用阿里云发送短信...");
  const result = await sendVerifyCode(phone);
  console.log("[验证码] 阿里云返回结果:", result);
  return result;
}

// 校验验证码
async function verifyCode(phone, code) {
  // 是否启用真实短信服务（开发环境也可开启）
  const USE_REAL_SMS = process.env.USE_REAL_SMS === "true";

  // 开发环境且未启用真实短信：使用固定验证码
  if (NODE_ENV !== "production" && !USE_REAL_SMS) {
    console.log(`[开发模式] 校验验证码: 输入=${code}, 期望=${DEV_VERIFY_CODE}`);
    return String(code) === String(DEV_VERIFY_CODE);
  }

  // 调用阿里云校验接口
  console.log("[验证码] 调用阿里云校验接口...");
  const result = await verifySmsCode(phone, code);
  console.log("[验证码] 校验结果:", result);
  return result.success;
}

// 发送验证码接口
router.post("/send-code", async (req, res) => {
  const { phone } = req.body || {};

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, error: "手机号格式不正确" });
  }

  try {
    // 如果启用了图形验证码（防机器人），先校验前端 H5 SDK 返回的验证结果
    const USE_CAPTCHA = process.env.USE_CAPTCHA === "true";
    if (USE_CAPTCHA) {
      const captchaPayload = {
        lot_number: req.body?.lot_number,
        captcha_output: req.body?.captcha_output,
        pass_token: req.body?.pass_token,
        gen_time: req.body?.gen_time,
      };

      if (
        !captchaPayload.lot_number ||
        !captchaPayload.captcha_output ||
        !captchaPayload.pass_token ||
        !captchaPayload.gen_time
      ) {
        return res
          .status(400)
          .json({ success: false, error: "请完成图形验证码" });
      }

      const cv = await verifyCaptcha(captchaPayload);
      if (!cv.success) {
        return res.status(400).json({
          success: false,
          error: `图形验证码校验失败: ${cv.error || "unknown"}`,
        });
      }
    }

    const result = await sendCode(phone);
    if (result.success) {
      return res.json({
        success: true,
        message: result.message || "验证码已发送",
      });
    } else {
      return res.status(400).json({ success: false, error: result.error });
    }
  } catch (err) {
    console.error("发送验证码失败:", err);
    return res.status(500).json({ success: false, error: "发送验证码失败" });
  }
});

// 校验验证码接口
router.post("/verify-code", async (req, res) => {
  const { phone, code } = req.body || {};

  if (!phone || !code) {
    return res
      .status(400)
      .json({ success: false, error: "请填写手机号和验证码" });
  }

  try {
    const result = await verifyCode(phone, code);
    if (result) {
      return res.json({ success: true, message: "验证码校验通过" });
    }

    return res.status(401).json({ success: false, error: "验证码错误" });
  } catch (err) {
    console.error("验证码校验失败:", err);
    return res.status(500).json({ success: false, error: "验证码校验失败" });
  }
});

// 管理员登录失败次数限制
const adminLoginAttempts = new Map(); // IP -> { count, lockedUntil }

function checkAdminLoginLimit(ip) {
  const now = Date.now();
  const record = adminLoginAttempts.get(ip);

  if (!record) {
    return { allowed: true };
  }

  // 检查是否在锁定期内
  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      error: `账号已被锁定，请 ${remainingSeconds} 秒后再试`,
    };
  }

  // 锁定期已过，重置计数
  if (record.lockedUntil && now >= record.lockedUntil) {
    adminLoginAttempts.delete(ip);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordAdminLoginFailure(ip) {
  const now = Date.now();
  const record = adminLoginAttempts.get(ip) || { count: 0 };

  record.count++;

  // 5 次失败后锁定 15 分钟
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
    console.warn(
      `管理员登录 IP ${ip} 已被锁定 15 分钟（失败次数: ${record.count}）`,
    );
  }

  adminLoginAttempts.set(ip, record);
}

function resetAdminLoginAttempts(ip) {
  adminLoginAttempts.delete(ip);
}

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  const clientIp = req.ip || req.connection?.remoteAddress || "unknown";

  // 检查登录限制
  const limitCheck = checkAdminLoginLimit(clientIp);
  if (!limitCheck.allowed) {
    return res.status(429).json({ error: limitCheck.error });
  }

  // 验证用户名
  if (username !== ADMIN_USERNAME) {
    recordAdminLoginFailure(clientIp);
    console.warn(`管理员登录失败: 用户名错误 (IP: ${clientIp})`);
    return res.status(401).json({ error: "账号或密码错误" });
  }

  // 验证密码（使用 bcrypt 比较）
  // 注意：生产环境应使用 bcrypt.hashSync(ADMIN_PASSWORD, 10) 生成哈希后存储
  // 目前为了兼容性，先尝试直接比较，再尝试 bcrypt 比较
  let passwordValid = false;

  // 如果 ADMIN_PASSWORD 已经是 bcrypt 哈希，使用 bcrypt 比较
  if (ADMIN_PASSWORD && ADMIN_PASSWORD.startsWith("$2")) {
    passwordValid = await bcrypt
      .compare(password, ADMIN_PASSWORD)
      .catch(() => false);
  } else {
    // 明文密码直接比较（开发环境）
    passwordValid = password === ADMIN_PASSWORD;
  }

  if (!passwordValid) {
    recordAdminLoginFailure(clientIp);
    console.warn(`管理员登录失败: 密码错误 (IP: ${clientIp})`);
    return res.status(401).json({ error: "账号或密码错误" });
  }

  // 登录成功，重置失败计数
  resetAdminLoginAttempts(clientIp);
  console.log(`管理员登录成功 (IP: ${clientIp})`);

  // 生成带 admin 角色的 token
  const token = signToken({ UserId: 0, UserName: username }, "admin");
  return res.json({
    success: true,
    token,
    user: { id: 0, name: username, role: "admin" },
  });
});

// 管理后台统计数据
router.get("/admin/stats", adminRequired, async (_req, res) => {
  try {
    const [[{ userCount }]] = await pool.query(
      "SELECT COUNT(*) AS userCount FROM Users",
    );
    const [[{ orderCount }]] = await pool.query(
      "SELECT COUNT(*) AS orderCount FROM Orders",
    );
    const [[{ eventCount }]] = await pool.query(
      "SELECT COUNT(*) AS eventCount FROM Events",
    );
    const [[{ pendingVerify }]] = await pool.query(
      "SELECT COUNT(*) AS pendingVerify FROM Verifications WHERE VerificationStatus = 0",
    );

    const [orderRows] = await pool.query(
      "SELECT OrderStatus, COUNT(*) AS cnt FROM Orders GROUP BY OrderStatus",
    );
    const orderStatus = {};
    orderRows.forEach((r) => {
      orderStatus[r.OrderStatus] = r.cnt;
    });

    const [eventRows] = await pool.query(
      "SELECT EventType, COUNT(*) AS cnt FROM Events GROUP BY EventType",
    );
    const eventType = {};
    eventRows.forEach((r) => {
      eventType[r.EventType] = r.cnt;
    });

    return res.json({
      success: true,
      stats: {
        userCount,
        orderCount,
        eventCount,
        pendingVerify,
        orderStatus,
        eventType,
      },
    });
  } catch (err) {
    console.error("DB query error (admin stats):", err);
    return res.status(500).json({ error: "获取统计数据失败" });
  }
});

function normalizeLocationPlaceId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

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
      locationPlaceId,
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

    // 验证码校验（开发环境使用 DEV_VERIFY_CODE，生产环境调用阿里云短信服务）
    const codeValid = await verifyCode(phone, code);
    if (!codeValid) {
      return res.status(401).json({ error: "验证码错误" });
    }

    // 内容安全审核（批量检测，只调用一次API）
    try {
      const checkResult = await moderateContents({
        UserName: userName,
        RealName: realName,
        Introduction: introduction || "",
      });

      if (!checkResult.safe) {
        if (req.file) cleanupUploadedFiles([req.file]);
        return res.status(400).json({
          error: checkResult.message,
          code: "CONTENT_MODERATION_FAILED",
        });
      }
    } catch (moderationError) {
      console.error("内容审核异常:", moderationError);
      if (req.file) cleanupUploadedFiles([req.file]);
      return res.status(500).json({
        error: "内容安全检测暂时不可用，请稍后重试",
        code: "CONTENT_MODERATION_ERROR",
      });
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
      const conn = await pool.getConnection();
      try {
        const [result] = await conn.query(
          "INSERT INTO Users (PhoneNumber, UserName, RealName, IdCardNumber, Location, LocationPlaceId, BirthDate, Introduction, UserAvatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            phone,
            userName,
            realName,
            idCardNumber,
            location,
            normalizeLocationPlaceId(locationPlaceId),
            birthDate,
            introduction || null,
            avatarPath,
          ],
        );

        const userId = result.insertId;

        // 同时在 Consumers 表中创建记录（初始买家评分为0）
        await conn.query(
          "INSERT INTO Consumers (ConsumerId, BuyerRanking) VALUES (?, 0)",
          [userId],
        );

        // 获取新创建的用户信息
        const [rows] = await conn.query(
          "SELECT UserId, UserName, PhoneNumber FROM Users WHERE UserId = ? LIMIT 1",
          [userId],
        );

        const user = rows[0];
        const token = signToken(user);

        return res.json({ success: true, user, token });
      } finally {
        conn.release();
      }
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

// 登录：接收 { phone, code }
router.post("/login", async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: "请填写手机号和验证码" });
  }

  // 验证码校验（开发环境使用 DEV_VERIFY_CODE，生产环境调用阿里云短信服务）
  const codeValid = await verifyCode(phone, code);
  if (!codeValid) {
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
    const selectSql =
      "SELECT EventId, EventTitle, EventType, EventCategory, Location, LocationPlaceId, Price, Photos, EventDetails, CreateTime FROM Events WHERE CreatorId = ? ORDER BY CreateTime DESC LIMIT 50";

    const [rows] = await pool.query(selectSql, [userId]);
    return res.json(rows);
  } catch (err) {
    console.error("DB query error (user events):", err);
    return res.status(500).json({ error: "获取用户事件列表失败" });
  }
});

// 获取用户完整资料（包含 Consumers/Providers 信息）
// 注意：此接口为公开接口，不返回敏感信息（身份证号、手机号）
router.get("/users/:id/profile", async (req, res) => {
  const userId = req.params.id;
  try {
    const userGeoSelect = "u.LocationPlaceId,";

    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.RealName, u.UserAvatar, u.Location, ${userGeoSelect} u.BirthDate, u.Introduction, u.CreateTime,
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
router.put("/users/:id/profile", authRequired, async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "无效的用户ID" });
  }

  const authUserId = Number(req.user?.id);
  if (!Number.isInteger(authUserId) || authUserId !== userId) {
    return res.status(403).json({ error: "无权修改其他用户资料" });
  }

  const {
    UserName,
    RealName,
    IdCardNumber,
    Location,
    LocationPlaceId,
    BirthDate,
    Introduction,
    UserAvatar,
  } = req.body || {};

  // 验证必填字段
  if (!UserName || !RealName || !IdCardNumber || !Location || !BirthDate) {
    return res.status(400).json({ error: "请填写所有必填项" });
  }

  // 内容安全审核（批量检测，只调用一次API）
  try {
    const checkResult = await moderateContents(
      {
        UserName: UserName,
        RealName: RealName,
        Introduction: Introduction || "",
      },
      userId.toString(),
    );

    if (!checkResult.safe) {
      return res.status(400).json({
        error: checkResult.message,
        code: "CONTENT_MODERATION_FAILED",
      });
    }
  } catch (moderationError) {
    console.error("内容审核异常:", moderationError);
    return res.status(500).json({
      error: "内容安全检测暂时不可用，请稍后重试",
      code: "CONTENT_MODERATION_ERROR",
    });
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

    updateFields.push("LocationPlaceId = ?");
    updateValues.push(normalizeLocationPlaceId(LocationPlaceId));

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
    const userGeoSelect = "u.LocationPlaceId,";

    const [rows] = await pool.query(
      `SELECT u.UserId, u.UserName, u.RealName, u.IdCardNumber, u.PhoneNumber, u.UserAvatar, u.Location, ${userGeoSelect} u.BirthDate, u.Introduction,
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

// 获取用户评价/评论列表（该用户作为被评价者收到的评论）
router.get("/users/:id/comments", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT
        c.ReviewId AS id,
        c.OrderId AS orderId,
        c.AuthorId AS authorId,
        u.UserName AS authorName,
        u.UserAvatar AS authorAvatar,
        c.TargetUserId AS targetUserId,
        c.Score AS rating,
        c.Text AS content,
        c.Time AS createTime,
        e.EventType AS EventType
       FROM Comments c
       JOIN Users u ON c.AuthorId = u.UserId
       LEFT JOIN Orders o ON c.OrderId = o.OrderId
       LEFT JOIN Events e ON o.EventId = e.EventId
       WHERE c.TargetUserId = ?
       ORDER BY c.Time DESC
       LIMIT 50`,
      [userId],
    );

    return res.json({
      success: true,
      comments: rows || [],
    });
  } catch (err) {
    console.error("DB query error (user comments):", err);
    return res.status(500).json({
      success: false,
      error: "Database query failed",
    });
  }
});

// 管理端：获取所有用户列表（包含买家评分、服务评分、服务单数）
router.get("/admin/users", adminRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.UserId,
        u.UserName,
        u.RealName,
        u.PhoneNumber,
        u.Location,
        IFNULL(c.BuyerRanking, 0) AS BuyerRanking,
        p.ProviderRole,
        IFNULL(p.ServiceRanking, 0) AS ServiceRanking,
        IFNULL(p.OrderCount, 0) AS OrderCount,
        CASE
          WHEN p.ProviderId IS NOT NULL THEN 1
          ELSE 0
        END AS IsProvider
      FROM Users u
      LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
      LEFT JOIN Providers p ON u.UserId = p.ProviderId
      ORDER BY u.CreateTime DESC
    `);

    return res.json({
      success: true,
      users: rows,
    });
  } catch (err) {
    console.error("DB query error (admin users list):", err);
    return res.status(500).json({
      success: false,
      error: "获取用户列表失败",
    });
  }
});

// 管理端：获取用户完整信息
router.get("/admin/users/:id", adminRequired, async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        u.UserId,
        u.UserName,
        u.RealName,
        u.IdCardNumber,
        u.PhoneNumber,
        u.UserAvatar,
        u.Location,
        u.BirthDate,
        u.Introduction,
        u.CreateTime,
        (SELECT VerificationStatus FROM Verifications v
         WHERE v.ProviderId = u.UserId
         ORDER BY v.SubmissionTime DESC LIMIT 1) AS VerificationStatus,
        c.BuyerRanking,
        p.ProviderRole,
        p.OrderCount,
        p.ServiceRanking
      FROM Users u
      LEFT JOIN Consumers c ON u.UserId = c.ConsumerId
      LEFT JOIN Providers p ON u.UserId = p.ProviderId
      WHERE u.UserId = ?
      LIMIT 1
    `,
      [userId],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "用户不存在",
      });
    }

    return res.json({
      success: true,
      user: rows[0],
    });
  } catch (err) {
    console.error("DB query error (admin user detail):", err);
    return res.status(500).json({
      success: false,
      error: "获取用户详情失败",
    });
  }
});

// 管理端：删除用户
router.delete("/admin/users/:id", adminRequired, async (req, res) => {
  const userId = req.params.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 检查用户是否存在
    const [userCheck] = await conn.query(
      "SELECT UserId FROM Users WHERE UserId = ? LIMIT 1",
      [userId],
    );

    if (!userCheck || userCheck.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        error: "用户不存在",
      });
    }

    // 删除用户评论（作为评论者）
    await conn.query("DELETE FROM Comments WHERE AuthorId = ?", [userId]);

    // 删除用户收到的评论（作为被评论者）
    await conn.query("DELETE FROM Comments WHERE TargetUserId = ?", [userId]);

    // 删除用户的订单（作为消费者）
    await conn.query("DELETE FROM Orders WHERE ConsumerId = ?", [userId]);

    // 删除用户的订单（作为服务提供者）
    await conn.query("DELETE FROM Orders WHERE ProviderId = ?", [userId]);

    // 删除用户发布的事件
    await conn.query("DELETE FROM Events WHERE CreatorId = ?", [userId]);

    // 删除用户的认证记录
    await conn.query("DELETE FROM Verifications WHERE ProviderId = ?", [
      userId,
    ]);

    // 删除Providers记录（如果存在）
    await conn.query("DELETE FROM Providers WHERE ProviderId = ?", [userId]);

    // 删除Consumers记录（如果存在）
    await conn.query("DELETE FROM Consumers WHERE ConsumerId = ?", [userId]);

    // 最后删除用户记录
    await conn.query("DELETE FROM Users WHERE UserId = ?", [userId]);

    await conn.commit();
    return res.json({
      success: true,
      message: "用户删除成功",
    });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(console.error);
    }
    console.error("DB query error (admin delete user):", err);
    return res.status(500).json({
      success: false,
      error: "删除用户失败",
    });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
