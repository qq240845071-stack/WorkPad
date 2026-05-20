const { publicMember, requireAuth, wecomScanLoginAvailable } = require("../_lib/auth");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
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
};
