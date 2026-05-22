const { writeStoredState, resetStoredState, normalizeState, mergeIncomingStateWithStoredState } = require("./_lib/store");
const { memberHasPermission, mergeMemberAuthFields, requireAuth, sanitizeStateForClient } = require("./_lib/auth");

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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    if (req.method === "GET") {
      return sendJson(res, 200, { ok: true, state: sanitizeStateForClient(auth.state), meta: auth.snapshot.meta });
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const baseRevision = Number(body.baseRevision);
      const currentRevision = Number(auth.state.stateRevision || 0);
      if (!Number.isFinite(baseRevision) || baseRevision !== currentRevision) {
        return sendJson(res, 409, {
          ok: false,
          stale: true,
          message: "当前页面数据已经过期，系统已阻止旧页面覆盖最新状态。请刷新页面后再重试刚才的操作。",
          state: sanitizeStateForClient(auth.state),
          meta: auth.snapshot.meta,
        });
      }
      const incomingState = mergeMemberAuthFields(normalizeState(body.state), auth.state);
      const nextState = mergeIncomingStateWithStoredState(incomingState, auth.state);
      const snapshot = await writeStoredState(nextState);
      return sendJson(res, 200, { ok: true, state: sanitizeStateForClient(snapshot.state), meta: snapshot.meta });
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      if (body.action === "reset-demo") {
        if (!memberHasPermission(auth.state, auth.member, "管理人员")) {
          return sendJson(res, 403, { ok: false, message: "当前账号没有重置演示数据权限。" });
        }
        const snapshot = await resetStoredState();
        return sendJson(res, 200, { ok: true, state: sanitizeStateForClient(snapshot.state), meta: snapshot.meta });
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
