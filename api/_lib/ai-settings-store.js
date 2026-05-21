const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const BLOB_PATHNAME = "workpad/ai-settings.json";
const LEGACY_COMMAND_MODEL = "deepseek-v4-flash";
const COMMAND_MODEL = "deepseek-v4-pro";
const COMMAND_PROVIDER_NAME = "云雾 DeepSeek V4 Pro";

const DEFAULT_AI_SETTINGS = {
  chat: {
    label: "对话",
    providerName: "云雾 DeepSeek V4 Flash",
    baseUrl: "https://yunwu.ai/v1",
    model: "deepseek-v4-flash",
  },
  risk: {
    label: "风险评估",
    providerName: "云雾 DeepSeek V4 Flash",
    baseUrl: "https://yunwu.ai/v1",
    model: "deepseek-v4-flash",
  },
  vision: {
    label: "图片识别",
    providerName: "云雾 Qwen3 VL Flash",
    baseUrl: "https://yunwu.ai/v1",
    model: "qwen3-vl-flash",
  },
  command: {
    label: "自然语言指令",
    providerName: COMMAND_PROVIDER_NAME,
    baseUrl: "https://yunwu.ai/v1",
    model: COMMAND_MODEL,
  },
  transcription: {
    label: "语音转文字",
    providerName: "云雾 Whisper（腾讯云 ASR 优先）",
    baseUrl: "https://yunwu.ai/v1",
    model: "whisper-1",
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTaskConfig(task, value) {
  const defaults = DEFAULT_AI_SETTINGS[task];
  const config = value && typeof value === "object" ? value : {};
  let providerName = String(config.providerName || defaults.providerName).trim();
  let model = String(config.model || defaults.model).trim();
  if (task === "command" && model === LEGACY_COMMAND_MODEL) {
    providerName = COMMAND_PROVIDER_NAME;
    model = COMMAND_MODEL;
  }
  return {
    label: defaults.label,
    providerName,
    baseUrl: String(config.baseUrl || defaults.baseUrl).trim().replace(/\/+$/, ""),
    model,
  };
}

function normalizeAiSettings(rawSettings) {
  const settings = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  return Object.fromEntries(Object.keys(DEFAULT_AI_SETTINGS).map((task) => [task, normalizeTaskConfig(task, settings[task])]));
}

function resolveLocalFile() {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return path.join(os.tmpdir(), "workpad-ai-settings.json");
  }
  return path.join(process.cwd(), "data", "workpad-ai-settings.json");
}

async function readLocalFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return "";
    throw error;
  }
}

async function writeLocalFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readBlobText() {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATHNAME, { access: "private" });
  if (!result || !result.stream) return "";
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return buffer.toString("utf8");
}

async function writeBlobText(content) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, content, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
  });
}

async function readAiSettings() {
  let raw = "";
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    raw = await readBlobText();
  } else {
    raw = await readLocalFile(resolveLocalFile());
  }
  if (!raw) return { settings: clone(DEFAULT_AI_SETTINGS), meta: { updatedAt: nowIso() } };
  return { settings: normalizeAiSettings(JSON.parse(raw)), meta: { updatedAt: nowIso() } };
}

async function writeAiSettings(nextSettings) {
  const settings = normalizeAiSettings(nextSettings);
  const content = JSON.stringify(settings, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlobText(content);
  } else {
    await writeLocalFile(resolveLocalFile(), content);
  }
  return { settings, meta: { updatedAt: nowIso() } };
}

module.exports = {
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  readAiSettings,
  writeAiSettings,
};
