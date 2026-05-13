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
 * @returns {Promise<{title: string, tags: string[], details: string}>}
 */
async function fillForm(input) {
  const systemPrompt =
    "你是一个社区互助平台的AI助手，帮助用户完善求助/帮助信息的表单填写。\n" +
    "根据用户输入的简短需求，生成三项内容：\n" +
    "1. title：合适的标题（简洁明了，5-15字）\n" +
    "2. tags：相关标签数组，3-5个，每个2-6个汉字（如：电脑维修、上门服务、系统故障）\n" +
    "3. details：详细描述（包含需求说明、注意事项，不带位置信息，纯文本，2-4句话）\n\n" +
    "必须返回严格的JSON格式，不要加任何其他文字：\n" +
    '{"title":"标题","tags":["标签1","标签2","标签3"],"details":"详细描述"}';

  const result = await callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `用户输入：${input}` },
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
        `[${e.EventTitle}] ${(e.EventDetails || "").slice(0, 80)} (${e.Location})`,
    )
    .join("\n");

  const providerSummary = providers
    .slice(0, 5)
    .map((p) => `${p.UserName} - ${p.Location}`)
    .join("\n");

  const systemPrompt =
    `你是一个社区互助平台的智能搜索助手。\n` +
    `用户搜索了"${keyword}"。请根据以下真实数据，生成一段有价值的推荐结果。\n\n` +
    `格式要求：\n` +
    `1. 首先对搜索关键词进行分析\n` +
    `2. 然后列出相关的事件匹配结果\n` +
    `3. 如果有附近的服务提供者，推荐他们\n` +
    `4. 给出建议\n\n` +
    `语气要亲切、实用，直接推荐具体的人或服务。`;

  const userPrompt =
    `相关事件：\n${eventSummary || "暂无匹配事件"}\n\n` +
    `附近服务者：\n${providerSummary || "暂无匹配服务者"}`;

  return callAI(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.5, max_tokens: 600 },
  );
}

module.exports = { callAI, fillForm, extractTags, enhanceSearch };
