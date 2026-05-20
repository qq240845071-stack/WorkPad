const { getAiConfig, hasAiConfig } = require("../_lib/ai-client");
const { readAiSettings, writeAiSettings, normalizeAiSettings } = require("../_lib/ai-settings-store");
const { memberHasPermission, requireAuth } = require("../_lib/auth");

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function publicConfig() {
  const { settings, meta } = await readAiSettings();
  const tasks = {};
  for (const task of Object.keys(settings)) {
    const resolved = await getAiConfig(task);
    tasks[task] = {
      ...settings[task],
      resolvedModel: resolved.model,
      resolvedBaseUrl: resolved.baseUrl,
      resolvedProviderName: resolved.providerName,
      configured: await hasAiConfig(task),
    };
  }
  return { tasks, meta };
}

module.exports = async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") {
      return sendJson(res, 200, { ok: true, ...(await publicConfig()) });
    }

    if (req.method === "PUT") {
      if (!memberHasPermission(auth.state, auth.member, "管理权限")) {
        return sendJson(res, 403, { ok: false, message: "当前账号没有修改 AI 配置权限。" });
      }
      const body = await readJsonBody(req);
      await writeAiSettings(normalizeAiSettings(body.tasks || body.settings || {}));
      return sendJson(res, 200, { ok: true, ...(await publicConfig()) });
    }

    return sendJson(res, 405, { ok: false, message: "当前接口只支持 GET 和 PUT。" });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "AI 配置接口处理失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
