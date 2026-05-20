const { writeStoredState } = require("../_lib/store");
const { initialPassword, memberHasPermission, requireAuth, setMemberPassword } = require("../_lib/auth");

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
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!memberHasPermission(auth.state, auth.member, "管理人员")) {
    return sendJson(res, 403, { ok: false, message: "当前账号没有重置密码权限。" });
  }

  try {
    const body = await readJsonBody(req);
    const memberId = String(body.memberId || "").trim();
    const member = auth.state.teamMembers.find((item) => item.id === memberId);
    if (!member) return sendJson(res, 404, { ok: false, message: "没有找到要重置密码的人员。" });

    const temporaryPassword = String(body.password || "").trim() || initialPassword();
    if (temporaryPassword.length < 6) {
      return sendJson(res, 400, { ok: false, message: "临时密码至少需要 6 位。" });
    }
    setMemberPassword(member, temporaryPassword, { resetRequired: true });
    await writeStoredState(auth.state);
    return sendJson(res, 200, {
      ok: true,
      memberId: member.id,
      username: member.username,
      temporaryPassword,
      message: `已重置 ${member.name} 的登录密码。`,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "重置密码失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
