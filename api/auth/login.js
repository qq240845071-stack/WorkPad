const { readStoredState, writeStoredState } = require("../_lib/store");
const {
  createSessionToken,
  ensureMemberUsernames,
  findMemberForLogin,
  initialPassword,
  publicMember,
  sessionCookie,
  setMemberPassword,
  verifyMemberPassword,
  wecomScanLoginAvailable,
} = require("../_lib/auth");

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

function canBootstrapMember(member) {
  return Boolean(member && member.role === "超级管理员" && !member.passwordHash);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }

  try {
    const body = await readJsonBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return sendJson(res, 400, { ok: false, message: "请输入用户名和密码。" });
    }

    const snapshot = await readStoredState();
    const state = snapshot.state;
    let changed = ensureMemberUsernames(state);
    const member = findMemberForLogin(state, username);
    if (!member) {
      return sendJson(res, 401, { ok: false, message: "用户名或密码不正确。" });
    }

    if (canBootstrapMember(member) && password === initialPassword()) {
      setMemberPassword(member, password, { resetRequired: true });
      changed = true;
    } else if (!verifyMemberPassword(member, password)) {
      return sendJson(res, 401, { ok: false, message: "用户名或密码不正确。" });
    }

    member.lastLoginAt = new Date().toISOString();
    changed = true;
    if (changed) await writeStoredState(state);

    res.setHeader("Set-Cookie", sessionCookie(createSessionToken(member)));
    return sendJson(res, 200, {
      ok: true,
      user: publicMember(member, state.teamMembers.indexOf(member)),
      wecomScanLoginAvailable: wecomScanLoginAvailable(),
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "登录失败，请稍后再试。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
