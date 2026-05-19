const { DEFAULT_AI_SETTINGS, readAiSettings } = require("./ai-settings-store");

const TASK_ENV_PREFIX = {
  chat: "AI_CHAT",
  risk: "AI_RISK",
  vision: "AI_VISION",
};

function taskKey(task) {
  return DEFAULT_AI_SETTINGS[task] ? task : "chat";
}

async function getAiConfig(task = "chat") {
  const key = taskKey(task);
  const prefix = TASK_ENV_PREFIX[key];
  const { settings } = await readAiSettings();
  const setting = settings[key] || DEFAULT_AI_SETTINGS[key];
  return {
    task: key,
    label: setting.label,
    apiKey: process.env[`${prefix}_API_KEY`] || process.env.AI_API_KEY || "",
    baseUrl: (process.env[`${prefix}_BASE_URL`] || setting.baseUrl).replace(/\/+$/, ""),
    model: process.env[`${prefix}_MODEL`] || (key === "chat" ? process.env.AI_MODEL : "") || setting.model,
    providerName: process.env[`${prefix}_PROVIDER_NAME`] || setting.providerName,
  };
}

async function hasAiConfig(task = "chat") {
  return Boolean((await getAiConfig(task)).apiKey);
}

function normalizeMessageContent(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part.type === "image_url") return part;
      return { type: "text", text: String(part.text || "").slice(0, 6000) };
    });
  }
  return String(content || "").slice(0, 6000);
}

function trimMessages(messages) {
  return messages.slice(-12).map((message) => ({
    role: ["system", "assistant", "user"].includes(message.role) ? message.role : "user",
    content: normalizeMessageContent(message.content),
  }));
}

async function createChatCompletion({ messages, temperature = 0.3, task = "chat" }) {
  const config = await getAiConfig(task);
  if (!config.apiKey) {
    throw new Error(`大模型接口还没有配置 ${config.label} 可用的 API Key。`);
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
    task: config.task,
    usage: payload.usage || null,
  };
}

module.exports = {
  createChatCompletion,
  getAiConfig,
  hasAiConfig,
};
