/**
 * AI 服务 — 封装 DeepSeek API
 * 提供描述生成、标签提取、搜索增强三个功能
 */
const axios = require("axios");

const API_URL = "https://api.deepseek.com/v1/chat/completions";
const API_KEY = process.env.DASHSCOPE_API_KEY;
const MODEL = process.env.AI_MODEL || "deepseek-chat";

/**
 * 调 DeepSeek 文本生成接口（兼容 OpenAI 格式）
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ temperature?: number, max_tokens?: number }} options
 * @returns {Promise<string>}
 */
async function callAI(messages, options = {}) {
  const { temperature = 0.7, max_tokens = 800 } = options;

  const response = await axios.post(
    API_URL,
    { model: MODEL, messages, temperature, max_tokens },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  const choice = response.data?.choices?.[0];
  if (!choice) {
    throw new Error("AI 接口返回为空");
  }
  return choice.message?.content || "";
}

/**
 * 1. 根据用户输入智能填表
 * 返回结构化数据：{ title, tags: string[], details }
 * @param {string} input  用户输入，如"修电脑"
 * @param {'request'|'help'} type  发布类型：求助/帮助
 * @returns {Promise<{title: string, tags: string[], details: string}>}
 */
async function fillForm(input, type = "request") {
  const isRequest = type === "request";

  // 根据类型选择不同语料
  const example = isRequest
    ? {
        title: "求人上门装系统",
        details: "我的电脑无法开机了，需要找位师傅上门帮忙重装系统，最好能顺便检查一下硬件。请提前联系确认时间和费用。",
      }
    : {
        title: "我会装系统",
        details: "我可以上门帮忙安装Windows/Linux系统，包括驱动配置和基础软件安装。有多年装机经验，工具齐全。请提前说明电脑型号和需求。",
      };

  const systemPrompt = [
    "你是一个社区互助平台的AI助手，帮助用户完善表单填写。",
    "",
    `当前用户在发布「${isRequest ? "求助" : "帮助"}」信息。`,
    isRequest
      ? "用户是求助者，需要找人帮忙。所有内容必须体现「求人帮忙」的口吻。"
      : "用户是服务提供者，可以为别人提供帮助。所有内容必须体现「我来帮忙」的口吻。",
    "",
    "根据用户输入的简短需求，生成三项内容：",
    "1. title：合适的标题（简洁明了，5-15字）",
    "2. tags：相关标签数组，3-5个，每个2-6个汉字",
    `3. details：详细描述，${isRequest ? "说明需要什么帮助、什么情况" : "说明能提供什么服务、有什么经验"}，`,
    "   不带位置信息，纯文本，2-4句话",
    "",
    "参考示例：",
    JSON.stringify(example, null, 2),
    "",
    "必须返回严格的JSON格式，不要加任何其他文字：",
    '{"title":"标题","tags":["标签1","标签2","标签3"],"details":"详细描述"}',
  ].join("\n");

  const userContext = isRequest
    ? `用户需要找人帮忙：${input}`
    : `用户能提供这项服务：${input}`;

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContext },
    ],
    { temperature: 0.5, max_tokens: 600 },
  );

  try {
    const parsed = JSON.parse(result);
    return {
      title: parsed.title || input,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      details: parsed.details || "",
    };
  } catch {
    return { title: input, tags: [], details: result };
  }
}

/**
 * 2. 从文本中提取标签
 * @param {string} text  标题 + 描述文本
 * @returns {Promise<string[]>}
 */
async function extractTags(text) {
  const systemPrompt =
    "你是一个社区互助平台的标签提取助手。\n" +
    "请从用户的求助/帮助描述中提取3-5个关键词作为标签。\n" +
    "要求：\n" +
    "- 每个标签2-4个汉字\n" +
    "- 标签需准确反映任务类型、场景或需求\n" +
    "- 不要加#号，不要加序号\n" +
    "- 以逗号分隔输出，例如：维修,楼道,紧急";

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `描述文本：${text.slice(0, 500)}` },
    ],
    { temperature: 0.3, max_tokens: 100 },
  );

  return result
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 10);
}

/**
 * 2.5 从自然语言查询中提取搜索关键词
 * @param {string} query  用户输入的自然语言，如"谁能帮我修电脑"
 * @returns {Promise<string[]>}  提取的关键词数组
 */
async function extractSearchKeywords(query) {
  const systemPrompt =
    "你是一个搜索关键词提取助手。\n" +
    "从用户的自然语言查询中，提取2-4个最核心的搜索关键词。\n" +
    "要求：\n" +
    "- 每个关键词2-6个汉字\n" +
    "- 去除语气词（谁能、帮我、我想等），只保留实质内容\n" +
    "- 以逗号分隔输出，例如：维修,电脑,上门";

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `用户查询：${query}` },
    ],
    { temperature: 0.2, max_tokens: 50 },
  );

  return result
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * 3. 搜索增强 - 根据关键词和数据库结果生成推荐
 * @param {string} keyword      用户搜索关键词
 * @param {Array}  events       数据库匹配的事件列表
 * @param {Array}  providers    附近服务者列表
 * @returns {Promise<string>}
 */
async function enhanceSearch(keyword, events, providers) {
  const eventSummary = events
    .slice(0, 8)
    .map(
      (e) =>
        `[${e.title || e.EventTitle}] 发布人:${e.name || ""} 地点:${e.address || e.Location || ""} 内容:${(e.demand || e.EventDetails || "").slice(0, 80)}`,
    )
    .join("\n");

  const providerSummary = providers
    .slice(0, 5)
    .map((p) => `${p.UserName || p.name} - ${p.Location}`)
    .join("\n");

  const systemPrompt =
    `你是一个社区互助平台的智能搜索助手。\n` +
    `用户搜索了"${keyword}"。\n` +
    `下面是数据库中匹配到的事件和附近服务者，请基于这些真实数据回答。\n\n` +
    `要求：\n` +
    `1. 先告诉用户搜索到了几条相关结果\n` +
    `2. 逐条列出匹配的事件，说明标题、发布人和地点\n` +
    `3. 如果有附近的能提供帮助的人也列出来\n` +
    `4. 给用户一些建议\n\n` +
    `注意：一定有匹配到的事件，你必须如实列出它们，不要说"没有匹配"。\n` +
    `只输出纯文本，不要使用任何 Markdown 符号（不要用 *、#、- 等）。`;

  const userPrompt =
    `数据库中找到 ${events.length} 个匹配的事件：\n${eventSummary || "无"}\n\n` +
    `附近服务者：\n${providerSummary || "无"}`;

  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.5, max_tokens: 600 },
  );
}

module.exports = { callAI, fillForm, extractTags, extractSearchKeywords, enhanceSearch };
