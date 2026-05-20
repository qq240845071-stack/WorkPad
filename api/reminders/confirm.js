const { readStoredState, writeStoredState } = require("../_lib/store");
const { completeReminderByToken } = require("../_lib/reminders");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function page(title, message, tone = "success") {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f7f0e4; color: #1f2937; }
    main { width: min(92vw, 560px); padding: 34px; border-radius: 28px; background: rgba(255,255,255,0.92); box-shadow: 0 22px 60px rgba(80,54,27,0.14); border: 1px solid rgba(122,87,54,0.12); }
    .badge { display: inline-flex; padding: 8px 14px; border-radius: 999px; font-size: 14px; color: ${tone === "success" ? "#276749" : "#9b2c2c"}; background: ${tone === "success" ? "#e3f3e8" : "#fff0f0"}; }
    h1 { margin: 18px 0 12px; font-size: 28px; }
    p { margin: 0; color: #5f6673; line-height: 1.8; font-size: 16px; white-space: pre-line; }
  </style>
</head>
<body>
  <main>
    <span class="badge">${tone === "success" ? "已完成" : "未完成"}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const token = String(req.query?.token || "").trim();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!token) {
    res.status(400).send(page("确认链接不完整", "缺少确认 token，请从企业微信推送消息里的原始链接重新进入。", "error"));
    return;
  }

  const snapshot = await readStoredState();
  const result = completeReminderByToken(snapshot.state, token, "企业微信确认");
  if (!result) {
    res.status(404).send(page("没有找到这条提醒", "这条确认链接可能已失效，或者对应提醒已经被删除。", "error"));
    return;
  }

  await writeStoredState(snapshot.state);
  const reminder = result.reminder;
  const projectLine = result.scope === "project" && result.project
    ? `项目：${result.project.code}《${result.project.title}》\n`
    : "类型：公共提醒\n";
  res.status(200).send(page(
    "提醒已标记为完成",
    `${projectLine}事项：${reminder.note}\n完成时间：${reminder.completedAt || "刚刚"}\n可以关闭这个页面。`,
  ));
};
