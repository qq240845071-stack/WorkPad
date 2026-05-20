const { DEFAULT_AI_SETTINGS, readAiSettings } = require("./ai-settings-store");
const { createTencentAsrTranscription, hasTencentAsrConfig } = require("./tencent-asr");

const TASK_ENV_PREFIX = {
  chat: "AI_CHAT",
  risk: "AI_RISK",
  vision: "AI_VISION",
  command: "AI_COMMAND",
  transcription: "AI_TRANSCRIPTION",
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
  if (taskKey(task) === "transcription" && hasTencentAsrConfig()) return true;
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

async function createAudioTranscription({ audioBuffer, filename = "voice.amr", contentType = "application/octet-stream", prompt = "" }) {
  if (hasTencentAsrConfig() && process.env.TENCENT_ASR_DISABLED !== "true") {
    try {
      return await createTencentAsrTranscription({ audioBuffer, filename, contentType, prompt });
    } catch (error) {
      if (process.env.TENCENT_ASR_FALLBACK_DISABLED === "true") throw error;
      const fallback = await createOpenAiCompatibleAudioTranscription({ audioBuffer, filename, contentType, prompt });
      return {
        ...fallback,
        fallbackFrom: "腾讯云 ASR",
        fallbackReason: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return createOpenAiCompatibleAudioTranscription({ audioBuffer, filename, contentType, prompt });
}

async function createOpenAiCompatibleAudioTranscription({ audioBuffer, filename = "voice.amr", contentType = "application/octet-stream", prompt = "" }) {
  const config = await getAiConfig("transcription");
  if (!config.apiKey) {
    throw new Error(`语音转文字还没有配置可用的 API Key。可以配置腾讯云 ASR 的 TENCENT_ASR_SECRET_ID / TENCENT_ASR_SECRET_KEY，或配置 ${config.label} 的 API Key。`);
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: contentType });
  formData.append("file", blob, filename);
  formData.append("model", config.model);
  formData.append("language", "zh");
  if (prompt) formData.append("prompt", prompt);

  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `语音转文字接口请求失败：${response.status}`);
  }

  const text = String(payload.text || payload.result || "").trim();
  if (!text) throw new Error("语音转文字接口没有返回可用文本。");

  return {
    text,
    model: payload.model || config.model,
    providerName: config.providerName,
    task: config.task,
    usage: payload.usage || null,
  };
}

module.exports = {
  createChatCompletion,
  createAudioTranscription,
  getAiConfig,
  hasAiConfig,
  hasTencentAsrConfig,
};
