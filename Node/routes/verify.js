// 用户认证提交接口（含身份证+证书上传）

const express = require("express");
const path = require("node:path");
const fs = require("node:fs");
const pool = require("../help_me_db.js");
const {
  sensitiveDir,
  sensitiveUpload,
  withMulter,
  cleanupUploadedFiles,
} = require("./upload.js");
const { authRequired, adminRequired } = require("./auth.js");

const { sendSystemMessage } = require("../chatHandler.js");
const router = express.Router();

function normalizeLocationPlaceId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

//GET 获取所有申请记录（仅包含通过和待审核) by Zewei 2-3
router.get("/adminVerify", adminRequired, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(`
      SELECT
        p.ProviderId,
        p.ProviderRole,
        p.OrderCount,
        p.ServiceRanking,
        u.UserName,
        u.RealName,
        v.VerificationId,
        v.ServiceCategory,
        v.OriginalProviderRole,
        v.VerificationStatus,
        v.SubmissionTime,
        v.PassingTime,
        v.Results,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM Verifications v2
            WHERE v2.ProviderId = p.ProviderId
              AND v2.VerificationStatus = 1
          ) THEN 1
          ELSE 0
        END AS IsVerified
      FROM Providers p
      INNER JOIN Users u ON p.ProviderId = u.UserId
      INNER JOIN (
        SELECT v1.*
        FROM Verifications v1
        INNER JOIN (
          SELECT ProviderId, MAX(SubmissionTime) AS LatestSubmission
          FROM Verifications
          GROUP BY ProviderId
        ) v2 ON v1.ProviderId = v2.ProviderId
          AND v1.SubmissionTime = v2.LatestSubmission
      ) v ON p.ProviderId = v.ProviderId
      ORDER BY p.ProviderId
    `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("查询人员认证列表失败:", err);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  } finally {
    if (conn) conn.release();
  }
});

router.post(
  "/verifications",
  authRequired,
  (req, res, next) => {
    const contentType = String(req.headers["content-type"] || "");
    if (!contentType.includes("multipart/form-data")) {
      return res.status(415).json({
        success: false,
        error: "请使用 multipart/form-data 格式提交表单",
      });
    }
    next();
  },

  withMulter(
    sensitiveUpload.fields([
      { name: "idCard", maxCount: 2 },
      { name: "cert", maxCount: 5 },
    ]),
  ),

  async (req, res) => {
    const {
      ServiceCategory,
      RealName,
      IdCardNumber,
      Location,
      LocationPlaceId,
      Introduction,
    } = req.body || {};

    // 基础内容校验，从 JWT token 中提取 providerId
    const providerId = Number(req.user?.id);
    if (!Number.isInteger(providerId) || providerId <= 0) {
      cleanupUploadedFiles(req.files);
      return res.status(401).json({ success: false, error: "未登录" });
    }

    if (
      ServiceCategory === undefined ||
      ServiceCategory === null ||
      String(ServiceCategory).trim() === ""
    ) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ success: false, error: "请填写身份类型" });
    }

    const serviceCategory = Number(ServiceCategory);
    if (![1, 2, 3].includes(serviceCategory)) {
      cleanupUploadedFiles(req.files);
      return res
        .status(400)
        .json({ success: false, error: "身份类型应该填写数字 1、2 、3" });
    }

    // 提取上传的文件路径（敏感文件使用 /sensitive/ 路径，不公开访问）

    const idCardFiles = req.files?.idCard || [];
    const certFiles = req.files?.cert || [];
    const idCardPaths = idCardFiles.map((f) => `/sensitive/${f.filename}`);
    const certPaths = certFiles.map((f) => `/sensitive/${f.filename}`);

    // 判断字段是否有有效值
    const hasValue = (v) =>
      v != null && v !== undefined && String(v).trim() !== "";

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // 0) 确保 Providers 记录存在（仅在首次时创建，不更新 ProviderRole）
      await conn.query(
        `INSERT INTO Providers (ProviderId, ProviderRole, OrderCount, ServiceRanking)
         VALUES (?, 0, 0, 0)
         ON DUPLICATE KEY UPDATE ProviderRole = ProviderRole`,
        [providerId],
      );

      // 获取当前角色（申请时的角色）
      const [currentRole] = await conn.query(
        `SELECT ProviderRole FROM Providers WHERE ProviderId = ?`,
        [providerId],
      );
      const originalProviderRole = currentRole[0]?.ProviderRole ?? 0;

      // 1) 更新 Users 表（仅非空字段，且禁止修改手机号）
      const uSets = [];
      const uParams = [];

      if (hasValue(RealName)) {
        uSets.push("RealName = ?");
        uParams.push(String(RealName).trim());
      }

      if (hasValue(IdCardNumber)) {
        const idc = String(IdCardNumber).trim();
        // 身份证号唯一性校验（排除自己）
        const [dup] = await conn.query(
          "SELECT UserId FROM Users WHERE IdCardNumber = ? AND UserId <> ? LIMIT 1",
          [idc, providerId],
        );
        if (dup.length > 0) {
          throw new Error("该身份证号已被其他账号使用，请注意检查");
        }
        uSets.push("IdCardNumber = ?");
        uParams.push(idc);
      }

      if (hasValue(Location)) {
        uSets.push("Location = ?");
        uParams.push(String(Location).trim());
      }

      uSets.push("LocationPlaceId = ?");
      uParams.push(normalizeLocationPlaceId(LocationPlaceId));

      if (hasValue(Introduction)) {
        uSets.push("Introduction = ?");
        uParams.push(String(Introduction));
      }

      if (uSets.length > 0) {
        uParams.push(providerId);
        await conn.query(
          `UPDATE Users SET ${uSets.join(", ")} WHERE UserId = ?`,
          uParams,
        );
      }

      // 2) 查询最近一条认证记录
      const [rows] = await conn.query(
        `SELECT VerificationId, IdCardPhoto, ProfessionPhoto
         FROM Verifications
         WHERE ProviderId = ?
         ORDER BY SubmissionTime DESC
         LIMIT 1`,
        [providerId],
      );

      const hasPrev = rows.length > 0;

      // 3) 首次提交：必须上传身份证 + 证书
      if (!hasPrev) {
        if (idCardPaths.length === 0) throw new Error("请上传身份证照片");
        if (certPaths.length === 0) throw new Error("请上传职业证书照片");
      }

      if (hasPrev) {
        // 更新现有认证记录
        const verificationId = rows[0].VerificationId;
        const vSets = [
          "ServiceCategory = ?",
          "OriginalProviderRole = ?",
          "VerificationStatus = 0", // 重置为待审核
          "SubmissionTime = NOW()",
          "PassingTime = NULL",
          "Results = NULL",
        ];
        const vParams = [serviceCategory, originalProviderRole];

        // 仅当有新图片时才覆盖
        if (idCardPaths.length > 0) {
          vSets.push("IdCardPhoto = ?");
          vParams.push(JSON.stringify(idCardPaths));
        }
        if (certPaths.length > 0) {
          vSets.push("ProfessionPhoto = ?");
          vParams.push(JSON.stringify(certPaths));
        }

        vParams.push(verificationId);
        await conn.query(
          `UPDATE Verifications SET ${vSets.join(", ")} WHERE VerificationId = ?`,
          vParams,
        );

        await conn.commit();

        // 提交成功后发送系统通知
        sendSystemMessage({
          roomId: `system_${providerId}`,
          text: "您的认证信息已更新，状态为待审核",
          senderId: providerId,
        }).catch((err) => console.error("发送系统消息失败:", err));

        return res.json({
          success: true,
          VerificationId: verificationId,
          message: "认证信息已更新，状态为待审核",
          idCardPaths,
          certPaths,
        });
      }

      // 首次提交：插入新记录
      const [result] = await conn.query(
        `INSERT INTO Verifications
          (ProviderId, ServiceCategory, OriginalProviderRole, VerificationStatus, IdCardPhoto, ProfessionPhoto, SubmissionTime)
         VALUES (?, ?, ?, 0, ?, ?, NOW())`,
        [
          providerId,
          serviceCategory,
          originalProviderRole,
          JSON.stringify(idCardPaths),
          JSON.stringify(certPaths),
        ],
      );

      await conn.commit();

      // 提交成功后发送系统通知
      sendSystemMessage({
        roomId: `system_${providerId}`,
        text: "您的认证信息已提交成功，状态为待审核",
        senderId: providerId,
      }).catch((err) => console.error("发送系统消息失败:", err));

      return res.json({
        success: true,
        VerificationId: result.insertId,
        message: "认证提交成功，请等待审核",
        idCardPaths,
        certPaths,
      });
    } catch (err) {
      console.error("认证提交数据库错误:", err);
      if (conn) {
        await conn.rollback().catch(console.error);
      }
      cleanupUploadedFiles(req.files); // 业务失败，清理文件

      const msg = err.message || "服务器内部错误";
      // 将特定业务错误返回 400
      if (
        msg.includes("请上传") ||
        msg.includes("身份类型") ||
        msg.includes("身份类型应该填写数字") ||
        msg.includes("身份证号已被")
      ) {
        return res.status(400).json({ success: false, error: msg });
      }
      return res.status(500).json({ success: false, error: "服务器内部错误" });
    } finally {
      if (conn) conn.release();
    }
  },
);

// 管理端：获取认证详情（包含用户信息和照片）
router.get(
  "/adminVerify/detail/:providerId",
  adminRequired,
  async (req, res) => {
    const providerId = Number(req.params.providerId);

    if (!Number.isInteger(providerId) || providerId <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "无效的ProviderId" });
    }

    let conn;
    try {
      conn = await pool.getConnection();

      // 获取用户基本信息和最新认证记录（包含头像、简介、服务评分）
      const [rows] = await conn.query(
        `
      SELECT
        u.UserId,
        u.UserName,
        u.RealName,
        u.UserAvatar,
        u.PhoneNumber,
        u.IdCardNumber,
        u.Location,
        u.Introduction,
        p.ProviderRole,
        p.ServiceRanking,
        v.VerificationId,
        v.ServiceCategory,
        v.VerificationStatus,
        v.IdCardPhoto,
        v.ProfessionPhoto,
        v.SubmissionTime,
        v.PassingTime,
        v.Results
      FROM Users u
      LEFT JOIN Providers p ON u.UserId = p.ProviderId
      LEFT JOIN Verifications v ON p.ProviderId = v.ProviderId
      WHERE u.UserId = ?
      ORDER BY v.SubmissionTime DESC
      LIMIT 1
    `,
        [providerId],
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, error: "用户不存在" });
      }

      const detail = rows[0];

      // 解析照片JSON，确保返回数组
      if (detail.IdCardPhoto) {
        try {
          const parsed = JSON.parse(detail.IdCardPhoto);
          detail.IdCardPhoto = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // 如果不是JSON，将字符串包装成数组
          detail.IdCardPhoto = [detail.IdCardPhoto];
        }
      } else {
        detail.IdCardPhoto = [];
      }

      if (detail.ProfessionPhoto) {
        try {
          const parsed = JSON.parse(detail.ProfessionPhoto);
          detail.ProfessionPhoto = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // 如果不是JSON，将字符串包装成数组
          detail.ProfessionPhoto = [detail.ProfessionPhoto];
        }
      } else {
        detail.ProfessionPhoto = [];
      }

      res.json({
        success: true,
        data: detail,
      });
    } catch (err) {
      console.error("获取认证详情失败:", err);
      res.status(500).json({
        success: false,
        error: "服务器内部错误",
      });
    } finally {
      if (conn) conn.release();
    }
  },
);

// 管理端：审核通过
router.post("/adminVerify/approve", adminRequired, async (req, res) => {
  const { providerId, results } = req.body;

  if (!providerId) {
    return res.status(400).json({ success: false, error: "缺少providerId" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 更新最新的认证记录状态为通过
    const [result] = await conn.query(
      `
      UPDATE Verifications
      SET VerificationStatus = 1,
          PassingTime = NOW(),
          Results = ?
      WHERE ProviderId = ?
      ORDER BY SubmissionTime DESC
      LIMIT 1
    `,
      [results || "审核通过", providerId],
    );

    // 审核通过后，更新用户的 ProviderRole
    if (result.affectedRows > 0) {
      const [verifyRow] = await conn.query(
        `SELECT ServiceCategory FROM Verifications WHERE ProviderId = ? ORDER BY SubmissionTime DESC LIMIT 1`,
        [providerId],
      );
      if (verifyRow.length > 0) {
        await conn.query(
          `UPDATE Providers SET ProviderRole = ? WHERE ProviderId = ?`,
          [verifyRow[0].ServiceCategory, providerId],
        );
      }
    }

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "未找到认证记录" });
    }

    await conn.commit();
    res.json({
      success: true,
      message: "审核通过成功",
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(console.error);
    console.error("审核通过失败:", err);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  } finally {
    if (conn) conn.release();
  }
});

// 管理端：审核驳回
router.post("/adminVerify/reject", adminRequired, async (req, res) => {
  const { providerId, results } = req.body;

  if (!providerId) {
    return res.status(400).json({ success: false, error: "缺少providerId" });
  }

  if (!results || String(results).trim() === "") {
    return res.status(400).json({ success: false, error: "驳回必须填写原因" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 更新最新的认证记录状态为驳回
    const [result] = await conn.query(
      `
      UPDATE Verifications
      SET VerificationStatus = 2,
          PassingTime = NOW(),
          Results = ?
      WHERE ProviderId = ?
      ORDER BY SubmissionTime DESC
      LIMIT 1
    `,
      [results, providerId],
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: "未找到认证记录" });
    }

    await conn.commit();
    res.json({
      success: true,
      message: "审核驳回成功",
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(console.error);
    console.error("审核驳回失败:", err);
    res.status(500).json({
      success: false,
      error: "服务器内部错误",
    });
  } finally {
    if (conn) conn.release();
  }
});

// 受鉴权保护的敏感文件下载接口（用户只能访问自己的文件，管理员可访问所有）
router.get("/sensitive/:filename", authRequired, async (req, res) => {
  const { filename } = req.params;
  const userId = Number(req.user?.id);
  const isAdmin = req.user?.role === "admin";

  // 安全校验：防止路径遍历攻击
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return res.status(400).json({ success: false, error: "无效的文件名" });
  }

  const filePath = path.join(sensitiveDir, filename);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "文件不存在" });
  }

  // 非管理员用户只能访问自己的文件（通过数据库查询验证）
  if (!isAdmin) {
    let conn;
    try {
      conn = await pool.getConnection();
      const [rows] = await conn.query(
        `SELECT IdCardPhoto, ProfessionPhoto
         FROM Verifications
         WHERE ProviderId = ?
         ORDER BY SubmissionTime DESC
         LIMIT 1`,
        [userId],
      );

      if (rows.length === 0) {
        return res
          .status(403)
          .json({ success: false, error: "无权访问此文件" });
      }

      const verification = rows[0];
      const allowedFiles = [
        ...JSON.parse(verification.IdCardPhoto || "[]"),
        ...JSON.parse(verification.ProfessionPhoto || "[]"),
      ];

      const requestedPath = `/sensitive/${filename}`;
      if (!allowedFiles.includes(requestedPath)) {
        return res
          .status(403)
          .json({ success: false, error: "无权访问此文件" });
      }
    } catch (err) {
      console.error("文件权限验证失败:", err);
      return res.status(500).json({ success: false, error: "服务器内部错误" });
    } finally {
      if (conn) conn.release();
    }
  }

  // 设置安全响应头
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(filePath);
});

module.exports = router;
