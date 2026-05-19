const DEFAULT_AI_BASE_URL = "https://yunwu.ai/v1";
const DEFAULT_AI_MODEL = "deepseek-v4-flash";

function getAiConfig() {
  return {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, ""),
    model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
    providerName: process.env.AI_PROVIDER_NAME || "云雾 DeepSeek V4 Flash",
  };
}

function hasAiConfig() {
  return Boolean(getAiConfig().apiKey);
}

function trimMessages(messages) {
  return messages.slice(-12).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: String(message.content || "").slice(0, 2000),
  }));
}

async function createChatCompletion({ messages, temperature = 0.3 }) {
  const config = getAiConfig();
  if (!config.apiKey) {
    throw new Error("大模型接口还没有配置 AI_API_KEY。");
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: trimMessages(messages),
      temperature,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `大模型接口请求失败：${response.status}`);
  }

  const reply = payload.choices?.[0]?.message?.content || "";
  return {
    reply: reply.trim(),
    model: payload.model || config.model,
    providerName: config.providerName,
    usage: payload.usage || null,
  };
}

module.exports = {
  createChatCompletion,
  getAiConfig,
  hasAiConfig,
};
