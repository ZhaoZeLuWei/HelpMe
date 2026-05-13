// 阿里云号码认证服务短信验证码
// 文档: https://help.aliyun.com/zh/pnvs/developer-reference/api-dypnsapi-2017-05-25-sendsmsverifycode

const Core = require("@alicloud/pop-core");

const DEFAULT_COUNTRY_CODE = process.env.ALIYUN_SMS_COUNTRY_CODE || "86";
const DEFAULT_SCHEME_NAME = process.env.ALIYUN_SMS_SCHEME_NAME?.trim() || "";
const SHOULD_RETURN_VERIFY_CODE =
  process.env.ALIYUN_SMS_RETURN_VERIFY_CODE === "true";

// 初始化阿里云客户端
const smsClient = new Core({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: "https://dypnsapi.aliyuncs.com",
  apiVersion: "2017-05-25",
});

// 发送验证码
async function sendVerifyCode(phoneNumber) {
  const params = {
    PhoneNumber: phoneNumber,
    SignName: process.env.ALIYUN_SMS_SIGN_NAME,
    TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code: "##code##", min: "5" }),
    CodeType: 1, // 纯数字
    CodeLength: 4,
    ValidTime: 300,
    CountryCode: DEFAULT_COUNTRY_CODE,
  };

  if (DEFAULT_SCHEME_NAME) {
    params.SchemeName = DEFAULT_SCHEME_NAME;
  }

  if (SHOULD_RETURN_VERIFY_CODE) {
    params.ReturnVerifyCode = true;
  }

  console.log("[短信] 发送验证码:", {
    phoneNumber,
    SignName: params.SignName,
    TemplateCode: params.TemplateCode,
    SchemeName: params.SchemeName,
    CountryCode: params.CountryCode,
  });

  try {
    const result = await smsClient.request("SendSmsVerifyCode", params, {
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
    });

    console.log("[短信] 阿里云响应:", JSON.stringify(result, null, 2));

    if (result.Code === "OK") {
      if (result.Model?.VerifyCode) {
        console.log(
          "[短信] 验证码发送成功, 阿里云生成的验证码:",
          result.Model.VerifyCode,
        );
      } else {
        console.log("[短信] 验证码发送成功");
      }
      return { success: true, message: "验证码已发送" };
    } else {
      console.error("[短信] 发送失败:", result.Code, result.Message);
      return { success: false, error: result.Message || "发送失败" };
    }
  } catch (err) {
    console.error("[短信] 请求异常:", err.message || err);
    if (err.data) {
      console.error("[短信] 错误详情:", JSON.stringify(err.data, null, 2));
    }
    return { success: false, error: err.message || "短信服务异常" };
  }
}

// 校验验证码
async function verifyCode(phoneNumber, code) {
  const params = {
    PhoneNumber: phoneNumber,
    VerifyCode: code,
    CountryCode: DEFAULT_COUNTRY_CODE,
  };

  if (DEFAULT_SCHEME_NAME) {
    params.SchemeName = DEFAULT_SCHEME_NAME;
  }

  console.log("[短信] 校验验证码:", { phoneNumber, code });

  try {
    const result = await smsClient.request("CheckSmsVerifyCode", params, {
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
    });

    console.log("[短信] 校验结果:", JSON.stringify(result, null, 2));

    if (result.Code === "OK" && result.Model?.VerifyResult === "PASS") {
      console.log("[短信] 验证码校验通过");
      return { success: true };
    } else {
      console.log("[短信] 验证码校验失败:", result.Model?.VerifyResult);
      return { success: false, error: "验证码错误或已过期" };
    }
  } catch (err) {
    console.error("[短信] 校验异常:", err.message || err);
    if (err.data) {
      console.error("[短信] 错误详情:", JSON.stringify(err.data, null, 2));
    }
    return { success: false, error: err.message || "校验服务异常" };
  }
}

module.exports = { sendVerifyCode, verifyCode };
