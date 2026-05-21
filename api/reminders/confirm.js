const { readStoredState, writeStoredState } = require("../_lib/store");
const { completeReminderByToken, normalizeProjectReminders, normalizePublicReminders } = require("../_lib/reminders");
const { findMember, sendAppTextMessage } = require("../_lib/wecom-service");

const MAX_NOTE_LENGTH = 600;
const RECEIPT_LOCK_TTL_MS = 10 * 60 * 1000;
const recentReceiptLocks = new Map();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rememberReceiptLock(token) {
  const normalized = String(token || "").trim();
  if (!normalized) return false;
  const now = Date.now();
  for (const [storedToken, timestamp] of recentReceiptLocks.entries()) {
    if (now - timestamp > RECEIPT_LOCK_TTL_MS) recentReceiptLocks.delete(storedToken);
  }
  if (recentReceiptLocks.has(normalized)) return false;
  recentReceiptLocks.set(normalized, now);
  return true;
}

function page(title, body, tone = "success") {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f7f0e4; color: #1f2937; }
    main { width: min(92vw, 620px); padding: 34px; border-radius: 28px; background: rgba(255,255,255,0.94); box-shadow: 0 22px 60px rgba(80,54,27,0.14); border: 1px solid rgba(122,87,54,0.12); }
    .badge { display: inline-flex; padding: 8px 14px; border-radius: 999px; font-size: 14px; color: ${tone === "success" ? "#276749" : "#9b2c2c"}; background: ${tone === "success" ? "#e3f3e8" : "#fff0f0"}; }
    h1 { margin: 18px 0 12px; font-size: 28px; }
    p { margin: 0 0 18px; color: #5f6673; line-height: 1.8; font-size: 16px; white-space: pre-line; }
    h2 { margin: 22px 0 10px; font-size: 18px; }
    .report { max-height: 360px; overflow: auto; margin: 0 0 18px; padding: 16px; border-radius: 18px; background: #fbf7ef; border: 1px solid rgba(31,36,48,0.1); color: #26313f; line-height: 1.8; white-space: pre-line; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    label { display: grid; gap: 8px; color: #374151; font-size: 15px; }
    textarea { min-height: 140px; resize: vertical; padding: 14px 16px; border-radius: 16px; border: 1px solid rgba(31,36,48,0.16); font: inherit; line-height: 1.7; }
    textarea:focus { outline: 3px solid rgba(39,103,73,0.14); border-color: rgba(39,103,73,0.45); }
    button { border: 0; border-radius: 999px; padding: 14px 22px; background: #276749; color: white; font: inherit; font-weight: 700; }
    .hint { color: #7a5a38; font-size: 14px; margin: 0; }
    .error { padding: 12px 14px; border-radius: 14px; color: #9b2c2c; background: #fff0f0; }
  </style>
</head>
<body>
  <main>
    <span class="badge">${tone === "success" ? "WorkPad 提醒确认" : "需要处理"}</span>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

function messagePage(title, message, tone = "success") {
  return page(title, `<p>${escapeHtml(message)}</p>`, tone);
}

function findReminderByToken(state, token) {
  for (const project of Array.isArray(state.projects) ? state.projects : []) {
    project.reminders = normalizeProjectReminders(project);
    const reminder = project.reminders.find((item) => item.confirmationToken === token);
    if (reminder) return { scope: "project", project, reminder };
  }
  state.publicReminders = normalizePublicReminders(state.publicReminders);
  const reminder = state.publicReminders.find((item) => item.confirmationToken === token);
  return reminder ? { scope: "public", reminder } : null;
}

function reminderContextText(result) {
  if (!result) return "";
  const scopeLine = result.scope === "project" && result.project
    ? `项目：${result.project.code}《${result.project.title}》`
    : "类型：公共提醒";
  return [
    scopeLine,
    `提醒人：${result.reminder.person}`,
    `提醒时间：${result.reminder.date}`,
    `事项：${result.reminder.note}`,
  ].join("\n");
}

function receiptContextText(result) {
  if (!result) return "";
  const lines = [];
  if (result.scope === "project" && result.project) {
    lines.push(`项目：${result.project.title}`);
    lines.push(`编号：${result.project.code}`);
    lines.push(`状态：${result.project.status} / ${result.project.currentNode}`);
  } else {
    lines.push("类型：公共提醒");
  }
  lines.push(`提醒人：${result.reminder.person}`);
  lines.push(`提醒时间：${result.reminder.date}`);
  lines.push(`事项：${result.reminder.note}`);
  return lines.join("\n");
}

function buildCompletionReceipt(result) {
  return [
    "【WorkPad 提醒回执】",
    "信息已被接收，对方已填写完成说明。",
    receiptContextText(result),
    `回复内容：${result.reminder.completionNote || "未填写"}`,
    `确认时间：${result.reminder.completedAt ? chinaDateTimeString(result.reminder.completedAt) : "刚刚"}`,
  ].filter(Boolean).join("\n");
}

function prepareReminderActorReceipt(state, result) {
  const receiptStatus = String(result?.reminder?.receiptStatus || "").trim();
  if (receiptStatus === "sent" || receiptStatus === "sending") {
    return { skipped: true, reason: "回执已经发送或正在发送。" };
  }

  const actorName = String(result?.reminder?.actor || "").trim();
  if (!actorName || actorName === "WorkPad 管家") {
    result.reminder.receiptStatus = "skipped";
    result.reminder.receiptError = "没有可通知的发起人。";
    return { skipped: true, reason: result.reminder.receiptError };
  }

  const actorMember = findMember(state, actorName);
  const content = buildCompletionReceipt(result);

  if (!actorMember || !actorMember.wecomUserId) {
    const error = "提醒发起人还没有绑定企业微信账号 UserId。";
    result.reminder.receiptStatus = "failed";
    result.reminder.receiptError = error;
    return { ok: false, error };
  }

  result.reminder.receiptStatus = "sending";
  result.reminder.receiptTarget = actorMember.wecomUserId;
  result.reminder.receiptRequestedAt = new Date().toISOString();
  result.reminder.receiptError = "";
  return { ok: true, toUser: actorMember.wecomUserId, content };
}

async function sendPreparedReminderReceipt(result, receipt) {
  if (!receipt?.ok) return receipt;

  try {
    await sendAppTextMessage({ toUser: receipt.toUser, content: receipt.content });
    result.reminder.receiptStatus = "sent";
    result.reminder.receiptSentAt = new Date().toISOString();
    result.reminder.receiptError = "";
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.reminder.receiptStatus = "failed";
    result.reminder.receiptError = message;
    return { ok: false, error: message };
  }
}

function formPage(token, result, error = "") {
  const body = `
    <p>${escapeHtml(reminderContextText(result))}</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <label>
        <span>完成说明 / 进展备注</span>
        <textarea name="completionNote" maxlength="${MAX_NOTE_LENGTH}" required placeholder="请填写电话沟通、合同签署状态、是否完成、下一步还需要做什么等说明。"></textarea>
      </label>
      <p class="hint">例如：已电话联系作者，合同电子版已回签，纸质版周五补寄。</p>
      <button type="submit">确认完成</button>
    </form>`;
  return page("填写确认说明", body);
}

function completedPage(result) {
  const body = `
    <p>${escapeHtml(reminderContextText(result))}</p>
    <label>
      <span>已提交的完成说明</span>
      <textarea disabled>${escapeHtml(result.reminder.completionNote || "未填写")}</textarea>
    </label>
    <p class="hint">您已发送完毕，这条确认记录已锁定，不能重复修改。</p>`;
  return page("您已发送完毕", body);
}

function chinaDateTimeString(value = new Date()) {
  const date = new Date(value);
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = china.getUTCFullYear();
  const month = String(china.getUTCMonth() + 1).padStart(2, "0");
  const day = String(china.getUTCDate()).padStart(2, "0");
  const hours = String(china.getUTCHours()).padStart(2, "0");
  const minutes = String(china.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function findProjectByRiskToken(state, token) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;
  return (Array.isArray(state.projects) ? state.projects : []).find((project) => project.aiRiskReviewToken === normalized) || null;
}

function riskProjectContextText(project) {
  return [
    `项目：${project.title}`,
    `编号：${project.code}`,
    `状态：${project.status} / ${project.currentNode}`,
    `负责人：${project.owner || "未分配"}`,
    `审核人：${project.aiRiskReviewer || "未指定"}`,
    `生成时间：${project.aiRiskAssessedAt || "未记录"}`,
  ].join("\n");
}

function riskReviewFormPage(token, project, error = "") {
  const body = `
    <p>${escapeHtml(riskProjectContextText(project))}</p>
    <h2>AI 风险预测报告</h2>
    <div class="report">${escapeHtml(project.aiRiskReport || "暂无风险报告。")}</div>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="riskToken" value="${escapeHtml(token)}" />
      <label>
        <span>审核意见 / 处理建议</span>
        <textarea name="reviewNote" maxlength="${MAX_NOTE_LENGTH}" required placeholder="请确认 AI 判断是否准确，以及下一步需要谁处理、怎么处理。"></textarea>
      </label>
      <label>
        <span>补充风险（可选）</span>
        <textarea name="additionalRisks" maxlength="${MAX_NOTE_LENGTH}" placeholder="如果还有 AI 没提到的风险，例如合同、工艺、交期、质检标准等，请写在这里。"></textarea>
      </label>
      <p class="hint">提交后，这份审核意见会回写到订单详情，并跟随订单进入后续质检环节。</p>
      <button type="submit">确认风险审核</button>
    </form>`;
  return page("填写风险审核意见", body);
}

function riskReviewCompletedPage(project) {
  const body = `
    <p>${escapeHtml(riskProjectContextText(project))}</p>
    <h2>已提交的审核意见</h2>
    <div class="report">审核意见：${escapeHtml(project.aiRiskReviewNote || "未填写")}\n\n补充风险：${escapeHtml(project.aiRiskAdditionalRisks || "无")}\n\n确认时间：${escapeHtml(project.aiRiskReviewedAt || "未记录")}</div>
    <p class="hint">您已发送完毕，这条风险审核记录已锁定，不能重复修改。</p>`;
  return page("风险审核已完成", body);
}

function buildRiskReviewReceipt(project) {
  return [
    "【WorkPad 风险审核回执】",
    "风险预测报告已被审核负责人确认。",
    riskProjectContextText(project),
    `审核意见：${project.aiRiskReviewNote || "未填写"}`,
    `补充风险：${project.aiRiskAdditionalRisks || "无"}`,
    `确认时间：${project.aiRiskReviewedAt || "刚刚"}`,
  ].join("\n");
}

async function notifyRiskRequester(state, project) {
  const requesterName = String(project.aiRiskReviewRequestedBy || project.aiRiskAssessedBy || "").trim();
  if (!requesterName || requesterName === project.aiRiskReviewer) return;
  const member = findMember(state, requesterName);
  if (!member || !member.wecomUserId) return;
  await sendAppTextMessage({ toUser: member.wecomUserId, content: buildRiskReviewReceipt(project) });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 20_000) reject(new Error("提交内容过长。"));
    });
    req.on("end", () => {
      const params = new URLSearchParams(raw);
      resolve({
        token: String(params.get("token") || "").trim(),
        riskToken: String(params.get("riskToken") || "").trim(),
        completionNote: String(params.get("completionNote") || "").trim(),
        reviewNote: String(params.get("reviewNote") || "").trim(),
        additionalRisks: String(params.get("additionalRisks") || "").trim(),
      });
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const snapshot = await readStoredState();

  if (req.method === "GET") {
    const riskToken = String(req.query?.riskToken || "").trim();
    if (riskToken) {
      const project = findProjectByRiskToken(snapshot.state, riskToken);
      if (!project) {
        res.status(404).send(messagePage("没有找到这份风险报告", "这条审核链接可能已失效，或者对应订单已经被删除。", "error"));
        return;
      }
      if (project.aiRiskReviewStatus === "已确认" || project.aiRiskReviewedAt) {
        res.status(200).send(riskReviewCompletedPage(project));
        return;
      }
      res.status(200).send(riskReviewFormPage(riskToken, project));
      return;
    }

    const token = String(req.query?.token || "").trim();
    if (!token) {
      res.status(400).send(messagePage("确认链接不完整", "缺少确认 token，请从企业微信推送消息里的原始链接重新进入。", "error"));
      return;
    }
    const existing = findReminderByToken(snapshot.state, token);
    if (!existing) {
      res.status(404).send(messagePage("没有找到这条提醒", "这条确认链接可能已失效，或者对应提醒已经被删除。", "error"));
      return;
    }
    if (existing.reminder.status === "completed" || existing.reminder.completedAt) {
      res.status(200).send(completedPage(existing));
      return;
    }
    res.status(200).send(formPage(token, existing));
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    res.status(400).send(messagePage("提交失败", error instanceof Error ? error.message : String(error), "error"));
    return;
  }

  const riskToken = String(body.riskToken || req.query?.riskToken || "").trim();
  if (riskToken) {
    const project = findProjectByRiskToken(snapshot.state, riskToken);
    if (!project) {
      res.status(404).send(messagePage("没有找到这份风险报告", "这条审核链接可能已失效，或者对应订单已经被删除。", "error"));
      return;
    }
    if (project.aiRiskReviewStatus === "已确认" || project.aiRiskReviewedAt) {
      res.status(200).send(riskReviewCompletedPage(project));
      return;
    }
    const reviewNote = String(body.reviewNote || "").trim().slice(0, MAX_NOTE_LENGTH);
    const additionalRisks = String(body.additionalRisks || "").trim().slice(0, MAX_NOTE_LENGTH);
    if (!reviewNote) {
      res.status(400).send(riskReviewFormPage(riskToken, project, "请先填写审核意见，再点击确认。"));
      return;
    }

    const now = chinaDateTimeString(new Date());
    project.aiRiskReviewStatus = "已确认";
    project.aiRiskReviewedAt = now;
    project.aiRiskReviewedBy = project.aiRiskReviewer || "风险审核负责人";
    project.aiRiskReviewNote = reviewNote;
    project.aiRiskAdditionalRisks = additionalRisks;
    project.logs = [
      { time: now, actor: project.aiRiskReviewedBy, action: "风险审核确认", detail: `审核意见：${reviewNote}${additionalRisks ? `；补充风险：${additionalRisks}` : ""}` },
      ...(Array.isArray(project.logs) ? project.logs : []),
    ].slice(0, 100);
    project.followUps = [
      { time: now, user: project.aiRiskReviewedBy, progress: "完成风险预测审核", nextAction: reviewNote },
      ...(Array.isArray(project.followUps) ? project.followUps : []),
    ].slice(0, 50);

    try {
      await notifyRiskRequester(snapshot.state, project);
    } catch (error) {
      project.aiRiskReviewReceiptError = error instanceof Error ? error.message : String(error);
    }

    await writeStoredState(snapshot.state);
    res.status(200).send(messagePage(
      "风险审核已完成",
      `${riskProjectContextText(project)}\n审核意见：${project.aiRiskReviewNote}\n补充风险：${project.aiRiskAdditionalRisks || "无"}\n可以关闭这个页面。`,
    ));
    return;
  }

  const token = String(body.token || req.query?.token || "").trim();
  const completionNote = String(body.completionNote || "").trim().slice(0, MAX_NOTE_LENGTH);
  if (!token) {
    res.status(400).send(messagePage("确认链接不完整", "缺少确认 token，请从企业微信推送消息里的原始链接重新进入。", "error"));
    return;
  }
  const existing = findReminderByToken(snapshot.state, token);
  if (!existing) {
    res.status(404).send(messagePage("没有找到这条提醒", "这条确认链接可能已失效，或者对应提醒已经被删除。", "error"));
    return;
  }
  if (existing.reminder.status === "completed" || existing.reminder.completedAt) {
    res.status(200).send(completedPage(existing));
    return;
  }
  if (!completionNote) {
    res.status(400).send(formPage(token, existing, "请先填写完成说明，再点击确认。"));
    return;
  }

  const completedBy = existing.reminder.person || "企业微信确认";
  const result = completeReminderByToken(snapshot.state, token, completedBy, completionNote);
  if (!result) {
    res.status(404).send(messagePage("没有找到这条提醒", "这条确认链接可能已失效，或者对应提醒已经被删除。", "error"));
    return;
  }

  const receipt = rememberReceiptLock(token)
    ? prepareReminderActorReceipt(snapshot.state, result)
    : { skipped: true, reason: "同一条提醒确认正在处理，已跳过重复回执。" };
  await writeStoredState(snapshot.state);

  if (receipt.ok) {
    await sendPreparedReminderReceipt(result, receipt);
    await writeStoredState(snapshot.state);
  }

  res.status(200).send(messagePage(
    "提醒已标记为完成",
    `${reminderContextText(result)}\n完成说明：${result.reminder.completionNote}\n完成时间：${result.reminder.completedAt ? chinaDateTimeString(result.reminder.completedAt) : "刚刚"}\n可以关闭这个页面。`,
  ));
};
