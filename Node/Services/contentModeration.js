/**
 * 阿里云内容安全服务
 * 用于文本内容审核，检测违规内容
 * 使用阿里云官方Node.js SDK
 */

const Green20220302 = require("@alicloud/green20220302");

// 阿里云API配置
const ALIYUN_CONFIG = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: "green-cip.cn-shanghai.aliyuncs.com",
  regionId: "cn-shanghai",
};

// 创建客户端
let client = null;

function getClient() {
  if (!client) {
    // 直接传入配置对象，SDK内部会自动创建凭证和设置regionId
    client = new Green20220302.default({
      accessKeyId: ALIYUN_CONFIG.accessKeyId,
      accessKeySecret: ALIYUN_CONFIG.accessKeySecret,
      endpoint: ALIYUN_CONFIG.endpoint,
      regionId: ALIYUN_CONFIG.regionId,
    });
  }
  return client;
}

/**
 * 调用阿里云文本审核API
 * @param {string} content - 待审核的文本内容
 * @param {string} service - 审核服务类型
 * @param {string} dataId - 数据ID（可选）
 * @param {string} accountId - 账户ID（可选）
 * @returns {Object} 审核结果
 */
async function callTextModerationAPI(
  content,
  service = "comment_detection_pro",
  dataId = null,
  accountId = null,
) {
  try {
    const greenClient = getClient();

    // 构建请求参数
    const serviceParameters = { content };
    if (dataId) serviceParameters.dataId = dataId;
    if (accountId) serviceParameters.accountId = accountId;

    // 使用SDK的Request类构建请求
    const request = new Green20220302.TextModerationPlusRequest({
      service: service,
      serviceParameters: JSON.stringify(serviceParameters),
    });

    const response = await greenClient.textModerationPlus(request);
    return response.body;
  } catch (error) {
    console.error("阿里云内容安全API调用失败:", error.message);
    throw error;
  }
}

/**
 * 检测文本内容是否违规
 * @param {string} content - 待检测的文本
 * @param {string} fieldName - 字段名称（用于日志）
 * @param {string} accountId - 用户ID（可选）
 * @returns {Object} 检测结果 { safe: boolean, riskLevel: string, details: Array }
 */
async function checkContent(content, fieldName = "text", accountId = null) {
  // 检查内容是否启用
  if (process.env.CONTENT_MODERATION_ENABLED !== "true") {
    return { safe: true, riskLevel: "none", details: [] };
  }

  // 空内容跳过
  if (!content || content.trim().length === 0) {
    return { safe: true, riskLevel: "none", details: [] };
  }

  // 截断超长内容（API限制600字符）
  const truncatedContent = content.substring(0, 600);

  try {
    const result = await callTextModerationAPI(
      truncatedContent,
      "comment_detection_pro",
      null,
      accountId,
    );

    // 阿里云API返回格式: { code: 200, data: { result: [...], riskLevel: 'none' }, message: 'OK' }
    if (result.code !== 200) {
      console.error(`内容审核API错误: ${result.message}`);
      // API错误时放行，避免影响正常业务
      return {
        safe: true,
        riskLevel: "none",
        details: [],
        error: result.message,
      };
    }

    const { data } = result;
    const { riskLevel, result: riskResults = [] } = data;

    // 检查是否有高风险内容
    const hasHighRisk = riskLevel === "high";
    const hasMediumRisk = riskLevel === "medium";

    // 提取违规详情（注意：API返回的字段名是 riskWords，不是 riskwords）
    const details = riskResults.map((item) => ({
      label: item.label,
      description: item.description,
      confidence: item.confidence,
      riskWords: item.riskWords ? item.riskWords.split(",") : [],
    }));

    return {
      safe: !hasHighRisk && !hasMediumRisk,
      riskLevel,
      details,
      hasHighRisk,
      hasMediumRisk,
    };
  } catch (error) {
    console.error(`内容审核异常 (${fieldName}):`, error.message);
    // 异常时也返回不安全，由上层决定是否阻止操作
    return {
      safe: false,
      riskLevel: "unknown",
      details: [],
      error: error.message,
    };
  }
}

/**
 * 敏感词过滤（本地快速过滤）
 * 用于在调用API前进行初步过滤
 */
const SENSITIVE_PATTERNS = [
  // 政治敏感词（实际需要根据需求添加）
  /台独/gi,
  /藏独/gi,
  /疆独/gi,
  /港独/gi,
  // 暴力词汇
  /杀[死杀]/gi,
  // 其他违规内容
  /赌博/gi,
  /毒品/gi,
  /色情/gi,
];

/**
 * 本地敏感词检测
 * @param {string} content - 待检测内容
 * @returns {Object} 检测结果
 */
function localSensitiveCheck(content) {
  if (!content) return { hasSensitive: false, matches: [] };

  const matches = [];
  for (const pattern of SENSITIVE_PATTERNS) {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  return {
    hasSensitive: matches.length > 0,
    matches: [...new Set(matches)], // 去重
  };
}

/**
 * 本地敏感词打码
 * @param {string} content - 待打码内容
 * @returns {string} 打码后的内容
 */
function localSensitiveMask(content) {
  if (!content) return content;

  let masked = content;
  for (const pattern of SENSITIVE_PATTERNS) {
    // 创建一个新的正则，避免修改原正则的lastIndex
    const newPattern = new RegExp(pattern.source, pattern.flags);
    masked = masked.replace(newPattern, "***");
  }
  return masked;
}

/**
 * 云端API敏感词打码
 * @param {string} content - 原始内容
 * @param {Array} riskWords - 云端检测到的敏感词列表
 * @returns {string} 打码后的内容
 */
function cloudSensitiveMask(content, riskWords) {
  if (!content || !riskWords || riskWords.length === 0) return content;

  let masked = content;
  for (const word of riskWords) {
    if (word && word.trim()) {
      // 使用正则替换，忽略大小写
      const regex = new RegExp(
        word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      masked = masked.replace(regex, "***");
    }
  }
  return masked;
}

/**
 * 综合内容审核（本地 + API）
 * @param {string} content - 待审核内容
 * @param {string} fieldName - 字段名称
 * @param {string} accountId - 用户ID
 * @returns {Object} 审核结果，包含打码后的内容 maskedContent
 */
async function moderateContent(content, fieldName = "text", accountId = null) {
  // 1. 先进行本地快速检测
  const localResult = localSensitiveCheck(content);
  if (localResult.hasSensitive) {
    // 本地检测到敏感词，直接打码
    const maskedContent = localSensitiveMask(content);
    return {
      safe: false,
      riskLevel: "high",
      source: "local",
      message: `内容包含敏感词: ${localResult.matches.join(", ")}`,
      details: localResult.matches,
      maskedContent, // 打码后的内容
    };
  }

  // 2. 调用阿里云API进行深度检测
  const apiResult = await checkContent(content, fieldName, accountId);

  if (!apiResult.safe) {
    // 提取敏感词
    const riskWords = apiResult.details
      .flatMap((d) => d.riskWords)
      .filter(Boolean);

    // 云端检测到违规，进行打码
    const maskedContent = cloudSensitiveMask(content, riskWords);

    return {
      safe: false,
      riskLevel: apiResult.riskLevel,
      source: "aliyun",
      message: `内容包含违规信息，请修改后重试`,
      details: apiResult.details,
      riskWords,
      maskedContent, // 打码后的内容
    };
  }

  return {
    safe: true,
    riskLevel: "none",
    source: "passed",
    details: [],
    maskedContent: content, // 内容安全，原样返回
  };
}

/**
 * 内容审核中间件工厂函数
 * @param {string} fieldName - 要审核的字段名
 * @param {string} source - 数据来源 ('body' 或 'query')
 */
function createModerationMiddleware(fieldName, source = "body") {
  return async (req, res, next) => {
    try {
      const content = req[source]?.[fieldName];
      if (!content) return next();

      const accountId =
        req.user?.id?.toString() || req.user?.userId?.toString();
      const result = await moderateContent(content, fieldName, accountId);

      if (!result.safe) {
        return res.status(400).json({
          success: false,
          message: result.message,
          code: "CONTENT_MODERATION_FAILED",
        });
      }

      next();
    } catch (error) {
      console.error("内容审核中间件错误:", error);
      // 审核异常时拒绝请求，避免违规内容漏检
      return res.status(500).json({
        success: false,
        error: "内容审核服务暂时不可用，请稍后重试",
        code: "CONTENT_MODERATION_ERROR",
      });
    }
  };
}

/**
 * 批量内容审核（多个字段合并为一次API调用）
 * @param {Object} fields - 要审核的字段 { fieldName: content, ... }
 * @param {string} accountId - 用户ID
 * @returns {Object} 审核结果，包含打码后的字段 maskedFields
 */
async function moderateContents(fields, accountId = null) {
  // 1. 先进行本地快速检测（逐个字段检测），同时打码
  const maskedFields = { ...fields };
  for (const [fieldName, content] of Object.entries(fields)) {
    if (!content || !String(content).trim()) continue;
    const localResult = localSensitiveCheck(String(content));
    if (localResult.hasSensitive) {
      // 本地检测到敏感词，打码后返回
      maskedFields[fieldName] = localSensitiveMask(String(content));
      return {
        safe: false,
        riskLevel: "high",
        source: "local",
        failedField: fieldName,
        message: `字段"${fieldName}"包含敏感词: ${localResult.matches.join(", ")}`,
        details: localResult.matches,
        maskedFields,
      };
    }
  }

  // 2. 将所有字段内容拼接为一个字符串，用分隔符隔开
  const contents = [];
  const fieldNames = [];
  for (const [fieldName, content] of Object.entries(fields)) {
    if (content && String(content).trim()) {
      contents.push(String(content).trim());
      fieldNames.push(fieldName);
    }
  }

  // 没有需要检测的内容
  if (contents.length === 0) {
    return {
      safe: true,
      riskLevel: "none",
      source: "passed",
      details: [],
      maskedFields,
    };
  }

  // 用特殊分隔符拼接，便于定位是哪个字段的问题
  const combinedContent = contents.join("\n---\n");

  // 3. 调用API检测（只调用一次）
  const apiResult = await checkContent(combinedContent, "batch", accountId);

  if (!apiResult.safe) {
    // 提取所有敏感词
    const riskWords = apiResult.details
      .flatMap((d) => d.riskWords)
      .filter(Boolean);

    // 对拼接后的内容进行打码
    const maskedCombined = cloudSensitiveMask(combinedContent, riskWords);

    // 拆分回各个字段
    const maskedParts = maskedCombined.split("\n---\n");
    fieldNames.forEach((name, index) => {
      if (maskedParts[index] !== undefined) {
        maskedFields[name] = maskedParts[index];
      }
    });

    // 构建违规内容提示（去重，去除有包含关系的重复词）
    const uniqueRiskWords = [...new Set(riskWords)];
    const filteredRiskWords = uniqueRiskWords.filter((word, index) => {
      // 如果当前词被其他更长的词包含，则过滤掉
      return !uniqueRiskWords.some(
        (other, otherIndex) => otherIndex !== index && other.includes(word),
      );
    });
    const riskWordsStr =
      filteredRiskWords.length > 0 ? filteredRiskWords.join("、") : "违规内容";
    return {
      safe: false,
      riskLevel: apiResult.riskLevel,
      source: "aliyun",
      message: `内容包含违规信息（违规内容：${riskWordsStr}），请检查处理`,
      details: apiResult.details,
      maskedFields,
    };
  }

  return {
    safe: true,
    riskLevel: "none",
    source: "passed",
    details: [],
    maskedFields,
  };
}

module.exports = {
  checkContent,
  moderateContent,
  moderateContents,
  localSensitiveCheck,
  createModerationMiddleware,
  callTextModerationAPI,
};
