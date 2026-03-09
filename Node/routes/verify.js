// 用户认证提交接口（含身份证+证书上传）

const express = require("express");
const pool = require("../help_me_db.js");
const { upload, withMulter, cleanupUploadedFiles } = require("./upload.js");
const { authRequired } = require("./auth.js");

const Message = require('../models/Message');
const router = express.Router();

//GET 获取所有申请记录（仅包含通过和待审核) by Zewei 2-3
router.get("/adminVerify", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const [rows] = await conn.query(`
      SELECT
        p.ProviderId,
        p.ProviderRole,
        CASE
          WHEN v.VerificationStatus = 1 THEN 1
          ELSE 0
        END AS IsVerified
      FROM Providers p
      LEFT JOIN Verifications v
        ON p.ProviderId = v.ProviderId
        AND v.VerificationStatus = 1
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
    upload.fields([
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

    // 提取上传的文件路径

    const idCardFiles = req.files?.idCard || [];
    const certFiles = req.files?.cert || [];
    const idCardPaths = idCardFiles.map((f) => `/img/${f.filename}`);
    const certPaths = certFiles.map((f) => `/img/${f.filename}`);

    // 判断字段是否有有效值
    const hasValue = (v) =>
      v != null && v !== undefined && String(v).trim() !== "";

    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // 0) 确保 Providers 记录存在
      await conn.query(
        `INSERT INTO Providers (ProviderId, ProviderRole, OrderCount, ServiceRanking)
         VALUES (?, ?, 0, 0)
         ON DUPLICATE KEY UPDATE ProviderRole = ?`,
        [providerId, serviceCategory, serviceCategory],
      );

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
          "VerificationStatus = 0", // 重置为待审核
          "SubmissionTime = NOW()",
          "PassingTime = NULL",
          "Results = NULL",
        ];
        const vParams = [serviceCategory];

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
          (ProviderId, ServiceCategory, VerificationStatus, IdCardPhoto, ProfessionPhoto, SubmissionTime)
         VALUES (?, ?, 0, ?, ?, NOW())`,
        [
          providerId,
          serviceCategory,
          JSON.stringify(idCardPaths),
          JSON.stringify(certPaths),
        ],
      );

      await conn.commit();
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
      Message.create({
        roomId: `system_${providerId}`,
        text: "您的认证信息已更新，状态为待审核",
        senderId: providerId,
        userName: "系统通知",
        sendTime: new Date(),
      }).catch(err => console.error("写入系统消息失败:", err));

      if (conn) conn.release();
    }
  },
);

module.exports = router;
