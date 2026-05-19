const { dispatchDueReminders } = require("../_lib/reminder-dispatcher");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 GET 或 POST。" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return sendJson(res, 500, { ok: false, message: "缺少 CRON_SECRET，不能执行提醒派发。" });
  }

  const authorization = String(req.headers.authorization || "");
  if (authorization !== `Bearer ${cronSecret}`) {
    return sendJson(res, 401, { ok: false, message: "提醒派发鉴权失败。" });
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const result = await dispatchDueReminders({ dryRun: url.searchParams.get("dryRun") === "1" });
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "提醒派发失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
