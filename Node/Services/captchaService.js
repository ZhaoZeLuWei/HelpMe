/**
 * 阿里云图形验证码服务端二次校验
 *
 * 前端 H5 SDK 在 onSuccess 后会返回：
 * - lot_number
 * - captcha_output
 * - pass_token
 * - gen_time
 *
 * 服务端需要：
 * 1. 用 appId/appKey 计算 sign_token
 * 2. 以 application/x-www-form-urlencoded 调用 https://captcha.alicaptcha.com/validate
 */

const crypto = require("crypto");
const axios = require("axios");

const USE_CAPTCHA = process.env.USE_CAPTCHA === "true";
const USE_REAL_CAPTCHA = process.env.USE_REAL_CAPTCHA === "true";
const CAPTCHA_APP_ID = process.env.CAPTCHA_APP_ID || "";
const CAPTCHA_APP_KEY = process.env.CAPTCHA_APP_KEY || "";
const CAPTCHA_API_SERVER =
  process.env.CAPTCHA_API_SERVER || "https://captcha.alicaptcha.com";

function normalizeCaptchaPayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const lotNumber = payload.lot_number || payload.lotNumber;
  const captchaOutput = payload.captcha_output || payload.captchaOutput;
  const passToken = payload.pass_token || payload.passToken;
  const genTime = payload.gen_time || payload.genTime;

  if (!lotNumber || !captchaOutput || !passToken || !genTime) {
    return null;
  }

  return {
    lot_number: String(lotNumber),
    captcha_output: String(captchaOutput),
    pass_token: String(passToken),
    gen_time: String(genTime),
  };
}

function createSignToken(lotNumber) {
  return crypto
    .createHmac("sha256", CAPTCHA_APP_KEY)
    .update(String(lotNumber))
    .digest("hex");
}

async function verifyCaptcha(captchaPayload) {
  if (!USE_CAPTCHA) return { success: true };

  // 开发环境保留旁路，方便不依赖控制台直接联调后端
  if (!USE_REAL_CAPTCHA) {
    if (!captchaPayload) return { success: true };
    return { success: true };
  }

  if (!CAPTCHA_APP_ID) {
    return { success: false, error: "未配置 CAPTCHA_APP_ID" };
  }

  if (!CAPTCHA_APP_KEY) {
    return { success: false, error: "未配置 CAPTCHA_APP_KEY" };
  }

  const normalized = normalizeCaptchaPayload(captchaPayload);
  if (!normalized) {
    return { success: false, error: "请先完成图形验证码" };
  }

  const signToken = createSignToken(normalized.lot_number);
  const url = `${CAPTCHA_API_SERVER.replace(/\/$/, "")}/validate?captcha_id=${encodeURIComponent(CAPTCHA_APP_ID)}`;

  try {
    const body = new URLSearchParams({
      lot_number: normalized.lot_number,
      captcha_output: normalized.captcha_output,
      pass_token: normalized.pass_token,
      gen_time: normalized.gen_time,
      sign_token: signToken,
    });

    const resp = await axios.post(url, body.toString(), {
      timeout: 8000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = resp.data || {};
    if (data.result === "success") {
      return { success: true };
    }

    return {
      success: false,
      error: data.reason || data.message || "图形验证码校验未通过",
    };
  } catch (err) {
    return {
      success: false,
      error:
        err?.response?.data?.reason || err?.message || "图形验证码校验请求失败",
    };
  }
}

module.exports = { verifyCaptcha, normalizeCaptchaPayload };
