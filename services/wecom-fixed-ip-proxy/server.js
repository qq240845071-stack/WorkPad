const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const TOKEN_REFRESH_MARGIN_SECONDS = 300;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const TENCENT_ASR_HOST = "asr.tencentcloudapi.com";
const TENCENT_ASR_SERVICE = "asr";
const TENCENT_ASR_ACTION = "SentenceRecognition";
const TENCENT_ASR_VERSION = "2019-06-14";
let tokenCache = { value: "", expiresAt: 0 };

function config() {
  return {
    host: String(process.env.HOST || "0.0.0.0").trim(),
    port: Number(process.env.PORT || 3001),
    proxySecret: String(process.env.WORKPAD_PROXY_SECRET || "").trim(),
    corpId: String(process.env.WECOM_CORP_ID || "").trim(),
    appSecret: String(process.env.WECOM_APP_SECRET || "").trim(),
    agentId: String(process.env.WECOM_AGENT_ID || "").trim(),
    tencentAsrSecretId: String(process.env.TENCENT_ASR_SECRET_ID || "").trim(),
    tencentAsrSecretKey: String(process.env.TENCENT_ASR_SECRET_KEY || "").trim(),
    tencentAsrRegion: String(process.env.TENCENT_ASR_REGION || "ap-shanghai").trim(),
    tencentAsrEngine: String(process.env.TENCENT_ASR_ENGINE || "16k_zh").trim(),
    tencentAsrProjectId: Number(process.env.TENCENT_ASR_PROJECT_ID || 0),
  };
}

function readiness() {
  const item = config();
  return {
    proxySecretReady: Boolean(item.proxySecret),
    corpIdReady: Boolean(item.corpId),
    appSecretReady: Boolean(item.appSecret),
    agentIdReady: Boolean(item.agentId),
  };
}

function asrReadiness() {
  const item = config();
  return {
    tencentAsrSecretIdReady: Boolean(item.tencentAsrSecretId),
    tencentAsrSecretKeyReady: Boolean(item.tencentAsrSecretKey),
    tencentAsrRegion: item.tencentAsrRegion || "ap-shanghai",
    tencentAsrEngine: item.tencentAsrEngine || "16k_zh",
  };
}

function isAsrReady() {
  const item = asrReadiness();
  return Boolean(item.tencentAsrSecretIdReady && item.tencentAsrSecretKeyReady);
}

function isReady() {
  return Object.values(readiness()).every(Boolean);
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function errorResponse(res, statusCode, message, extra = {}) {
  jsonResponse(res, statusCode, {
    ok: false,
    error: message,
    ...extra,
  });
}

function requireAuth(req, res) {
  const { proxySecret } = config();
  if (!proxySecret) {
    errorResponse(res, 500, "固定 IP 代理缺少 WORKPAD_PROXY_SECRET。");
    return false;
  }

  const auth = String(req.headers.authorization || "");
  if (auth !== `Bearer ${proxySecret}`) {
    errorResponse(res, 401, "固定 IP 代理鉴权失败。");
    return false;
  }
  return true;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error("请求体不是合法 JSON。"));
      }
    });
    req.on("error", reject);
  });
}

function friendlyWecomError(payload, fallback) {
  const message = String(payload?.errmsg || payload?.message || fallback || "企业微信接口请求失败。");
  if (payload?.errcode === 60020 || message.includes("not allow to access from your ip")) {
    const ip = message.match(/from ip:\s*([^,，\s]+)/i)?.[1] || "";
    return [
      "企业微信接口被可信 IP 拦截。",
      ip ? `当前代理服务器出口 IP：${ip}` : "",
      "请把这个固定公网 IP 加到企业微信自建应用的可信 IP / IP 白名单里。",
    ].filter(Boolean).join("\n");
  }
  return message;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errcode) {
    throw Object.assign(new Error(friendlyWecomError(json, `企业微信接口请求失败：${response.status}`)), {
      statusCode: response.status || 502,
      payload: json,
    });
  }
  return json;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt > now) return tokenCache.value;

  const item = config();
  if (!item.corpId || !item.appSecret) {
    throw Object.assign(new Error("固定 IP 代理缺少 WECOM_CORP_ID 或 WECOM_APP_SECRET。"), { statusCode: 500 });
  }

  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
  url.searchParams.set("corpid", item.corpId);
  url.searchParams.set("corpsecret", item.appSecret);
  const json = await fetchJson(url);
  const expiresIn = Math.max(60, Number(json.expires_in || 7200) - TOKEN_REFRESH_MARGIN_SECONDS);
  tokenCache = {
    value: json.access_token,
    expiresAt: now + expiresIn * 1000,
  };
  return tokenCache.value;
}

async function handleToken(_req, res) {
  const accessToken = await getAccessToken();
  jsonResponse(res, 200, {
    ok: true,
    access_token: accessToken,
    expiresAt: tokenCache.expiresAt,
  });
}

async function handleSendText(req, res) {
  const body = await readJsonBody(req);
  const toUser = String(body.toUser || body.touser || "").trim();
  const content = String(body.content || "").trim();
  const { agentId } = config();

  if (!toUser) {
    errorResponse(res, 400, "缺少 toUser。");
    return;
  }
  if (!content) {
    errorResponse(res, 400, "缺少 content。");
    return;
  }
  if (!agentId) {
    errorResponse(res, 500, "固定 IP 代理缺少 WECOM_AGENT_ID。");
    return;
  }

  const accessToken = await getAccessToken();
  const json = await fetchJson(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      touser: toUser,
      msgtype: "text",
      agentid: Number(agentId),
      text: { content },
      safe: 0,
      enable_duplicate_check: 1,
      duplicate_check_interval: 1800,
    }),
  });
  jsonResponse(res, 200, { ok: true, ...json });
}

async function handleMedia(req, res, requestUrl) {
  const mediaId = String(requestUrl.searchParams.get("mediaId") || "").trim();
  if (!mediaId) {
    errorResponse(res, 400, "缺少 mediaId。");
    return;
  }

  const accessToken = await getAccessToken();
  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/media/get");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("media_id", mediaId);

  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok || contentType.includes("application/json")) {
    let payload = {};
    try {
      payload = JSON.parse(buffer.toString("utf8"));
    } catch (error) {
      payload = { errmsg: buffer.toString("utf8") };
    }
    jsonResponse(res, response.ok ? 502 : response.status, {
      ok: false,
      ...payload,
      error: friendlyWecomError(payload, "下载企业微信语音素材失败。"),
    });
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(buffer);
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
  const name = String(filename || "").trim().toLowerCase();
  const content = String(contentType || "").trim().toLowerCase();
  const extension = name.match(/\.([a-z0-9]+)$/)?.[1] || "";
  if (extension) return extension === "mpeg" ? "mp3" : extension;
  if (content.includes("amr")) return "amr";
  if (content.includes("speex")) return "speex";
  if (content.includes("wav")) return "wav";
  if (content.includes("mpeg") || content.includes("mp3")) return "mp3";
  if (content.includes("m4a")) return "m4a";
  return String(process.env.TENCENT_ASR_VOICE_FORMAT || "amr").trim() || "amr";
}

function tencentAsrError(payload, fallback = "腾讯云语音识别请求失败。") {
  const error = payload?.Response?.Error || payload?.Error || payload?.error;
  if (!error) return fallback;
  const code = String(error.Code || error.code || "").trim();
  const message = String(error.Message || error.message || fallback).trim();
  return code ? `${message}（${code}）` : message;
}

async function handleAsrSentence(req, res) {
  if (!isAsrReady()) {
    errorResponse(res, 500, "腾讯云 ASR 代理还没有配置 SecretId / SecretKey。", asrReadiness());
    return;
  }

  const body = await readJsonBody(req);
  const audioBase64 = String(body.audioBase64 || body.data || "").trim();
  if (!audioBase64) {
    errorResponse(res, 400, "缺少 audioBase64。");
    return;
  }

  const audioBuffer = Buffer.from(audioBase64, "base64");
  if (!audioBuffer.length) {
    errorResponse(res, 400, "audioBase64 不是有效音频。");
    return;
  }

  const item = config();
  const filename = String(body.filename || "voice.amr").trim();
  const contentType = String(body.contentType || "application/octet-stream").trim();
  const voiceFormat = audioFormatFromInput({ filename, contentType });
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    ProjectId: item.tencentAsrProjectId,
    SubServiceType: 2,
    EngSerViceType: item.tencentAsrEngine,
    SourceType: 1,
    VoiceFormat: voiceFormat,
    UsrAudioKey: `workpad-proxy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    Data: audioBuffer.toString("base64"),
    DataLen: audioBuffer.length,
    ConvertNumMode: 1,
    FilterDirty: 0,
    FilterModal: 0,
    FilterPunc: 0,
  });
  const authorization = signTencentRequest({
    secretId: item.tencentAsrSecretId,
    secretKey: item.tencentAsrSecretKey,
    timestamp,
    payload,
  });

  const response = await fetch(`https://${TENCENT_ASR_HOST}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": TENCENT_ASR_HOST,
      "X-TC-Action": TENCENT_ASR_ACTION,
      "X-TC-Version": TENCENT_ASR_VERSION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": item.tencentAsrRegion,
    },
    body: payload,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.Response?.Error || result.Error || result.error) {
    errorResponse(res, response.ok ? 502 : response.status, tencentAsrError(result, `腾讯云语音识别请求失败：${response.status}`), {
      payload: result,
    });
    return;
  }

  const text = String(result.Response?.Result || result.Response?.Text || result.Result || result.Text || "").trim();
  if (!text) {
    errorResponse(res, 502, "腾讯云语音识别没有返回可用文本。", { payload: result });
    return;
  }

  jsonResponse(res, 200, {
    ok: true,
    text,
    model: item.tencentAsrEngine,
    providerName: "腾讯云 ASR 一句话识别（北京代理）",
    usage: {
      requestId: String(result.Response?.RequestId || "").trim(),
      voiceFormat,
      egress: "tencent-beijing-proxy",
    },
  });
}

async function resolveEgressIp() {
  const endpoints = [
    { url: "https://api.ipify.org?format=json", type: "json", field: "ip" },
    { url: "https://ifconfig.me/ip", type: "text" },
    { url: "https://ipinfo.io/ip", type: "text" },
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(endpoint.url, { signal: controller.signal });
      if (!response.ok) continue;
      const value = endpoint.type === "json"
        ? String((await response.json().catch(() => ({})))[endpoint.field] || "")
        : String(await response.text());
      const ip = value.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)?.[0] || "";
      if (ip) return ip;
    } catch (error) {
      // 部分云服务器可能访问不了某个查 IP 服务，继续尝试下一个。
    } finally {
      clearTimeout(timer);
    }
  }
  return "";
}

async function handleHealth(_req, res) {
  const egressIp = await resolveEgressIp();
  jsonResponse(res, 200, {
    ok: true,
    ready: isReady(),
    ...readiness(),
    asrReady: isAsrReady(),
    ...asrReadiness(),
    egressIp,
  });
}

async function route(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);

  try {
    if (req.method === "GET" && requestUrl.pathname === "/health") {
      await handleHealth(req, res);
      return;
    }

    if (!requireAuth(req, res)) return;
    if (!isReady()) {
      errorResponse(res, 500, "固定 IP 代理环境变量不完整。", readiness());
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/token") {
      await handleToken(req, res);
      return;
    }
    if (req.method === "POST" && requestUrl.pathname === "/send-text") {
      await handleSendText(req, res);
      return;
    }
    if (req.method === "GET" && requestUrl.pathname === "/media") {
      await handleMedia(req, res, requestUrl);
      return;
    }
    if (req.method === "POST" && requestUrl.pathname === "/asr-sentence") {
      await handleAsrSentence(req, res);
      return;
    }

    errorResponse(res, 404, "接口不存在。");
  } catch (error) {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    errorResponse(res, statusCode, error instanceof Error ? error.message : String(error), {
      payload: error.payload || undefined,
    });
  }
}

const server = http.createServer((req, res) => {
  route(req, res);
});

const startupConfig = config();
server.listen(startupConfig.port, startupConfig.host, () => {
  console.log(`WorkPad 企业微信固定 IP 代理已启动：http://${startupConfig.host}:${startupConfig.port}`);
});
