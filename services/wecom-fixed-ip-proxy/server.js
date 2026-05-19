const http = require("node:http");
const { URL } = require("node:url");

const TOKEN_REFRESH_MARGIN_SECONDS = 300;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
let tokenCache = { value: "", expiresAt: 0 };

function config() {
  return {
    host: String(process.env.HOST || "0.0.0.0").trim(),
    port: Number(process.env.PORT || 3001),
    proxySecret: String(process.env.WORKPAD_PROXY_SECRET || "").trim(),
    corpId: String(process.env.WECOM_CORP_ID || "").trim(),
    appSecret: String(process.env.WECOM_APP_SECRET || "").trim(),
    agentId: String(process.env.WECOM_AGENT_ID || "").trim(),
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
      enable_duplicate_check: 0,
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

async function resolveEgressIp() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
    });
    const json = await response.json();
    return json.ip || "";
  } catch (error) {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function handleHealth(_req, res) {
  const egressIp = await resolveEgressIp();
  jsonResponse(res, 200, {
    ok: true,
    ready: isReady(),
    ...readiness(),
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
