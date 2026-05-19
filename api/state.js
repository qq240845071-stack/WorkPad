const { readStoredState, writeStoredState, resetStoredState, normalizeState } = require("./_lib/store");

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

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const snapshot = await readStoredState();
      return sendJson(res, 200, { ok: true, ...snapshot });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const nextState = normalizeState(body.state);
      const snapshot = await writeStoredState(nextState);
      return sendJson(res, 200, { ok: true, ...snapshot });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body.action === "reset-demo") {
        const snapshot = await resetStoredState();
        return sendJson(res, 200, { ok: true, ...snapshot });
      }
      return sendJson(res, 400, { ok: false, message: "未识别的操作。" });
    }

    return sendJson(res, 405, { ok: false, message: "当前接口不支持这个请求方式。" });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "后台数据接口处理失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
