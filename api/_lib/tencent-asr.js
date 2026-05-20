const crypto = require("node:crypto");

const TENCENT_ASR_HOST = "asr.tencentcloudapi.com";
const TENCENT_ASR_SERVICE = "asr";
const TENCENT_ASR_ACTION = "SentenceRecognition";
const TENCENT_ASR_VERSION = "2019-06-14";

function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function hasTencentAsrConfig() {
  return Boolean(cleanText(process.env.TENCENT_ASR_SECRET_ID) && cleanText(process.env.TENCENT_ASR_SECRET_KEY));
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmacSha256(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest(encoding);
}

function utcDateString(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function signTencentRequest({ secretId, secretKey, timestamp, payload }) {
  const algorithm = "TC3-HMAC-SHA256";
  const date = utcDateString(timestamp);
  const credentialScope = `${date}/${TENCENT_ASR_SERVICE}/tc3_request`;
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${TENCENT_ASR_HOST}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    sha256Hex(payload),
  ].join("\n");
  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, TENCENT_ASR_SERVICE);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  const signature = hmacSha256(secretSigning, stringToSign, "hex");
  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function audioFormatFromInput({ filename = "", contentType = "" }) {
  const name = cleanText(filename).toLowerCase();
  const content = cleanText(contentType).toLowerCase();
  const extension = name.match(/\.([a-z0-9]+)$/)?.[1] || "";
  if (extension) return extension === "mpeg" ? "mp3" : extension;
  if (content.includes("amr")) return "amr";
  if (content.includes("speex")) return "speex";
  if (content.includes("wav")) return "wav";
  if (content.includes("mpeg") || content.includes("mp3")) return "mp3";
  if (content.includes("m4a")) return "m4a";
  return cleanText(process.env.TENCENT_ASR_VOICE_FORMAT, "amr");
}

function tencentAsrPayload({ audioBuffer, filename, contentType }) {
  const voiceFormat = audioFormatFromInput({ filename, contentType });
  return {
    ProjectId: Number(process.env.TENCENT_ASR_PROJECT_ID || 0),
    SubServiceType: 2,
    EngSerViceType: cleanText(process.env.TENCENT_ASR_ENGINE, "16k_zh"),
    SourceType: 1,
    VoiceFormat: voiceFormat,
    UsrAudioKey: `workpad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    Data: audioBuffer.toString("base64"),
    DataLen: audioBuffer.length,
    ConvertNumMode: 1,
    FilterDirty: 0,
    FilterModal: 0,
    FilterPunc: 0,
  };
}

function tencentAsrError(payload, fallback = "腾讯云语音识别请求失败。") {
  const error = payload?.Response?.Error || payload?.Error || payload?.error;
  if (!error) return fallback;
  const code = cleanText(error.Code || error.code);
  const message = cleanText(error.Message || error.message, fallback);
  return code ? `${message}（${code}）` : message;
}

async function createTencentAsrTranscription({ audioBuffer, filename = "voice.amr", contentType = "application/octet-stream" }) {
  if (!hasTencentAsrConfig()) {
    throw new Error("腾讯云 ASR 还没有配置 SecretId / SecretKey。");
  }
  if (!Buffer.isBuffer(audioBuffer) || !audioBuffer.length) {
    throw new Error("腾讯云 ASR 没有收到可识别的语音内容。");
  }

  const secretId = cleanText(process.env.TENCENT_ASR_SECRET_ID);
  const secretKey = cleanText(process.env.TENCENT_ASR_SECRET_KEY);
  const region = cleanText(process.env.TENCENT_ASR_REGION, "ap-shanghai");
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(tencentAsrPayload({ audioBuffer, filename, contentType }));
  const authorization = signTencentRequest({ secretId, secretKey, timestamp, payload });

  const response = await fetch(`https://${TENCENT_ASR_HOST}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": TENCENT_ASR_HOST,
      "X-TC-Action": TENCENT_ASR_ACTION,
      "X-TC-Version": TENCENT_ASR_VERSION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region,
    },
    body: payload,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.Response?.Error || result.Error || result.error) {
    throw new Error(tencentAsrError(result, `腾讯云语音识别请求失败：${response.status}`));
  }

  const text = cleanText(result.Response?.Result || result.Response?.Text || result.Result || result.Text);
  if (!text) {
    throw new Error("腾讯云语音识别没有返回可用文本。");
  }

  return {
    text,
    model: cleanText(process.env.TENCENT_ASR_ENGINE, "16k_zh"),
    providerName: "腾讯云 ASR 一句话识别",
    task: "transcription",
    usage: {
      requestId: cleanText(result.Response?.RequestId),
      voiceFormat: audioFormatFromInput({ filename, contentType }),
    },
  };
}

module.exports = {
  createTencentAsrTranscription,
  hasTencentAsrConfig,
};
