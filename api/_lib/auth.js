const crypto = require("node:crypto");
const { readStoredState, writeStoredState } = require("./store");

const SESSION_COOKIE = "workpad_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const DEFAULT_INITIAL_PASSWORD = "111111";
const AUTH_POLICY_VERSION = "pinyin-111111-v1";

const NAME_PINYIN_OVERRIDES = {
  周雯: "zhouwen",
  许畅: "xuchang",
  王黎: "wangli",
  刘珂: "liuke",
  陈敏: "chenmin",
  孙妍: "sunyan",
  贾涛: "jiatao",
  张莹: "zhangying",
  王勇: "wangyong",
  周丽梅: "zhoulimei",
  周立梅: "zhoulimei",
};

const HAN_PINYIN = {
  陈: "chen",
  畅: "chang",
  贾: "jia",
  珂: "ke",
  黎: "li",
  丽: "li",
  立: "li",
  刘: "liu",
  梅: "mei",
  敏: "min",
  孙: "sun",
  涛: "tao",
  王: "wang",
  雯: "wen",
  许: "xu",
  妍: "yan",
  勇: "yong",
  张: "zhang",
  周: "zhou",
  莹: "ying",
};

function textValue(value) {
  return String(value ?? "").trim();
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function parseCookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) cookies[key] = value;
    return cookies;
  }, {});
}

function authSecret() {
  return process.env.WORKPAD_AUTH_SECRET || process.env.WECOM_PROXY_SECRET || "workpad-local-auth-secret";
}

function initialPassword() {
  return DEFAULT_INITIAL_PASSWORD;
}

function initialPasswordCandidates() {
  return [DEFAULT_INITIAL_PASSWORD];
}

function passwordMatchesInitial(password) {
  const value = String(password || "");
  return initialPasswordCandidates().some((candidate) => value === candidate);
}

function memberUsesInitialPassword(member) {
  if (!member.passwordHash || !member.passwordSalt) return false;
  return initialPasswordCandidates().some((candidate) => verifyMemberPassword(member, candidate));
}

function sign(value) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function createSessionToken(member) {
  const payload = base64Url(JSON.stringify({
    memberId: member.id,
    username: member.username || "",
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  }));
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.expiresAt || Date.now() > Number(data.expiresAt)) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function sessionCookie(token) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (process.env.VERCEL || process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function normalizeUsername(value) {
  return textValue(value).toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

function usernameFromName(name, fallback = "") {
  const raw = textValue(name).replace(/[·\s。,.，、_-]+/g, "");
  if (NAME_PINYIN_OVERRIDES[raw]) return NAME_PINYIN_OVERRIDES[raw];
  const converted = Array.from(raw).map((char) => {
    if (/^[a-z0-9]$/i.test(char)) return char.toLowerCase();
    return HAN_PINYIN[char] || "";
  }).join("");
  return normalizeUsername(converted) || normalizeUsername(fallback);
}

function defaultUsername(member, index = 0) {
  const generated = usernameFromName(member.name);
  if (generated) return generated;
  const id = textValue(member.id).replace(/^user-/, "");
  if (/^[a-z0-9._-]{2,}$/i.test(id)) return id.toLowerCase();
  return `user${index + 1}`;
}

function ensureMemberUsernames(state) {
  let changed = false;
  const used = new Set();
  state.teamMembers = (Array.isArray(state.teamMembers) ? state.teamMembers : []).map((member, index) => {
    let username = defaultUsername(member, index).toLowerCase();
    if (used.has(username)) username = `${username}${index + 1}`;
    used.add(username);
    if (member.username !== username) changed = true;
    return { ...member, username };
  });
  return changed;
}

function applyAuthPolicy(state, { forcePasswordReset = false } = {}) {
  let changed = ensureMemberUsernames(state);
  const needsPolicyReset = forcePasswordReset || state.authPolicyVersion !== AUTH_POLICY_VERSION;
  if (needsPolicyReset) {
    (Array.isArray(state.teamMembers) ? state.teamMembers : []).forEach((member) => {
      setMemberPassword(member, initialPassword(), { resetRequired: true });
    });
    state.authPolicyVersion = AUTH_POLICY_VERSION;
    changed = true;
  }
  return changed;
}

function publicMember(member, index = 0) {
  const safe = { ...member };
  delete safe.passwordHash;
  delete safe.passwordSalt;
  return {
    ...safe,
    username: defaultUsername(member, index),
    passwordReady: Boolean(member.passwordHash && member.passwordSalt),
    passwordResetRequired: Boolean(member.passwordResetRequired),
  };
}

function sanitizeStateForClient(state) {
  return {
    ...state,
    teamMembers: (Array.isArray(state.teamMembers) ? state.teamMembers : []).map(publicMember),
  };
}

function findMemberForLogin(state, username) {
  const normalized = textValue(username).toLowerCase();
  if (!normalized) return null;
  const members = Array.isArray(state.teamMembers) ? state.teamMembers : [];
  if (normalized === "admin") {
    const adminMember = members.find((member, index) => index === 0 || member.role === "超级管理员");
    if (adminMember) return adminMember;
  }
  return members.find((member, index) => {
    return defaultUsername(member, index).toLowerCase() === normalized || textValue(member.name).toLowerCase() === normalized;
  }) || null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("base64url");
  return { salt, hash };
}

function setMemberPassword(member, password, { resetRequired = false } = {}) {
  const { salt, hash } = hashPassword(password);
  member.passwordSalt = salt;
  member.passwordHash = hash;
  member.passwordResetRequired = Boolean(resetRequired);
  member.passwordUpdatedAt = new Date().toISOString();
}

function verifyMemberPassword(member, password) {
  if (!member.passwordHash || !member.passwordSalt) return false;
  const { hash } = hashPassword(password, member.passwordSalt);
  if (hash.length !== member.passwordHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(member.passwordHash));
}

function roleKeyForMember(state, member) {
  const role = (Array.isArray(state.roles) ? state.roles : []).find((item) => item.name === member.role || item.key === member.role);
  return role?.key || "";
}

function memberHasPermission(state, member, label) {
  if (!member) return false;
  if (member.role === "超级管理员") return true;
  const key = roleKeyForMember(state, member);
  const row = (Array.isArray(state.permissionRows) ? state.permissionRows : []).find((item) => item.label === label);
  return Boolean(key && row?.values?.[key] === "是");
}

function mergeMemberAuthFields(nextState, previousState) {
  const previousMembers = Array.isArray(previousState.teamMembers) ? previousState.teamMembers : [];
  const byId = new Map(previousMembers.map((member) => [member.id, member]));
  const byName = new Map(previousMembers.map((member) => [member.name, member]));
  nextState.authPolicyVersion = previousState.authPolicyVersion || nextState.authPolicyVersion || "";
  nextState.teamMembers = (Array.isArray(nextState.teamMembers) ? nextState.teamMembers : []).map((member, index) => {
    const previous = byId.get(member.id) || byName.get(member.name) || {};
    return {
      ...member,
      username: defaultUsername(member, index),
      passwordHash: previous.passwordHash || "",
      passwordSalt: previous.passwordSalt || "",
      passwordResetRequired: Boolean(previous.passwordResetRequired),
      passwordUpdatedAt: previous.passwordUpdatedAt || "",
      lastLoginAt: previous.lastLoginAt || "",
    };
  });
  ensureMemberUsernames(nextState);
  return nextState;
}

function sendAuthError(res, statusCode = 401, message = "请先登录 WorkPad。") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: false, message }));
}

async function requireAuth(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = verifySessionToken(token);
  if (!session) {
    sendAuthError(res);
    return null;
  }
  const snapshot = await readStoredState();
  const changed = applyAuthPolicy(snapshot.state);
  if (changed) await writeStoredState(snapshot.state);
  const member = snapshot.state.teamMembers.find((item) => item.id === session.memberId);
  if (!member) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    sendAuthError(res, 401, "登录账号已经不存在，请重新登录。");
    return null;
  }
  return { snapshot, state: snapshot.state, member, session };
}

function wecomScanLoginAvailable() {
  return Boolean(process.env.WECOM_WEB_LOGIN_ENABLED === "1" && process.env.WECOM_WEB_LOGIN_REDIRECT_URI);
}

module.exports = {
  applyAuthPolicy,
  clearSessionCookie,
  createSessionToken,
  defaultUsername,
  ensureMemberUsernames,
  findMemberForLogin,
  initialPassword,
  memberUsesInitialPassword,
  memberHasPermission,
  mergeMemberAuthFields,
  passwordMatchesInitial,
  publicMember,
  requireAuth,
  sanitizeStateForClient,
  sessionCookie,
  setMemberPassword,
  usernameFromName,
  verifyMemberPassword,
  wecomScanLoginAvailable,
};
