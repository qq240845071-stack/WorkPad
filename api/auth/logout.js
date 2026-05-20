const { clearSessionCookie } = require("../_lib/auth");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }
  res.setHeader("Set-Cookie", clearSessionCookie());
  return sendJson(res, 200, { ok: true, message: "已退出登录。" });
};
