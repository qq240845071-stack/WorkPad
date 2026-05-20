const { readStoredState, writeStoredState } = require("../_lib/store");
const {
  clearSessionCookie,
  createSessionToken,
  ensureMemberUsernames,
  findMemberForLogin,
  initialPassword,
  memberUsesInitialPassword,
  memberHasPermission,
  passwordMatchesInitial,
  publicMember,
  requireAuth,
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

function authAction(req) {
  const queryAction = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  if (queryAction) return String(queryAction);
  const pathname = new URL(req.url || "/api/auth", "https://workpad.local").pathname;
  return pathname.split("/").filter(Boolean).pop() || "";
}

function canBootstrapMember(member) {
  return Boolean(member && !member.passwordHash);
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "登录接口只支持 POST。" });
  }
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

  if (canBootstrapMember(member) && passwordMatchesInitial(password)) {
    setMemberPassword(member, password, { resetRequired: true });
    changed = true;
  } else if (!verifyMemberPassword(member, password)) {
    if (member.passwordResetRequired && passwordMatchesInitial(password) && memberUsesInitialPassword(member)) {
      setMemberPassword(member, password, { resetRequired: true });
      changed = true;
    } else {
    return sendJson(res, 401, { ok: false, message: "用户名或密码不正确。" });
    }
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
}

async function handleMe(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 GET。" });
  }
  const auth = await requireAuth(req, res);
  if (!auth) return;
  return sendJson(res, 200, {
    ok: true,
    user: publicMember(auth.member, auth.state.teamMembers.indexOf(auth.member)),
    wecomScanLoginAvailable: wecomScanLoginAvailable(),
  });
}

function handleLogout(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  return sendJson(res, 200, { ok: true, message: "已退出登录。" });
}

async function handleResetPassword(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }
  const auth = await requireAuth(req, res);
  if (!auth) return;
  if (!memberHasPermission(auth.state, auth.member, "管理人员")) {
    return sendJson(res, 403, { ok: false, message: "当前账号没有重置密码权限。" });
  }

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
}

module.exports = async (req, res) => {
  try {
    const action = authAction(req);
    if (action === "login") return await handleLogin(req, res);
    if (action === "me") return await handleMe(req, res);
    if (action === "logout") return handleLogout(req, res);
    if (action === "reset-password") return await handleResetPassword(req, res);
    return sendJson(res, 404, { ok: false, message: "未识别的登录接口。" });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "登录接口处理失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
