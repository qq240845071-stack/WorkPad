const { readStoredState, writeStoredState } = require("../_lib/store");
const { findMember, sendAppTextMessage } = require("../_lib/wecom-service");

const MAX_NOTE_LENGTH = 1000;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function page(title, body, tone = "success") {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; background: #f7f0e4; color: #1f2937; }
    main { width: min(92vw, 760px); padding: 34px; border-radius: 28px; background: rgba(255,255,255,0.94); box-shadow: 0 22px 60px rgba(80,54,27,0.14); border: 1px solid rgba(122,87,54,0.12); }
    .badge { display: inline-flex; padding: 8px 14px; border-radius: 999px; font-size: 14px; color: ${tone === "success" ? "#276749" : "#9b2c2c"}; background: ${tone === "success" ? "#e3f3e8" : "#fff0f0"}; }
    h1 { margin: 18px 0 12px; font-size: 28px; }
    h2 { margin: 22px 0 10px; font-size: 18px; }
    p, .report { margin: 0 0 18px; color: #5f6673; line-height: 1.8; font-size: 16px; white-space: pre-line; }
    .report { max-height: 360px; overflow: auto; padding: 16px; border-radius: 18px; background: #fbf7ef; border: 1px solid rgba(31,36,48,0.1); color: #26313f; }
    form { display: grid; gap: 16px; margin-top: 20px; }
    label { display: grid; gap: 8px; color: #374151; font-size: 15px; }
    textarea { min-height: 120px; resize: vertical; padding: 14px 16px; border-radius: 16px; border: 1px solid rgba(31,36,48,0.16); font: inherit; line-height: 1.7; }
    textarea:focus { outline: 3px solid rgba(39,103,73,0.14); border-color: rgba(39,103,73,0.45); }
    button { border: 0; border-radius: 999px; padding: 14px 22px; background: #276749; color: white; font: inherit; font-weight: 700; }
    .hint { color: #7a5a38; font-size: 14px; margin: 0; }
    .error { padding: 12px 14px; border-radius: 14px; color: #9b2c2c; background: #fff0f0; }
  </style>
</head>
<body>
  <main>
    <span class="badge">${tone === "success" ? "WorkPad 风险审核" : "需要处理"}</span>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </main>
</body>
</html>`;
}

function messagePage(title, message, tone = "success") {
  return page(title, `<p>${escapeHtml(message)}</p>`, tone);
}

function findProjectByReviewToken(state, token) {
  const normalized = String(token || "").trim();
  if (!normalized) return null;
  return (Array.isArray(state.projects) ? state.projects : []).find((project) => project.aiRiskReviewToken === normalized) || null;
}

function projectContextText(project) {
  return [
    `项目：${project.title}`,
    `编号：${project.code}`,
    `状态：${project.status} / ${project.currentNode}`,
    `负责人：${project.owner || "未分配"}`,
    `审核人：${project.aiRiskReviewer || "未指定"}`,
    `生成时间：${project.aiRiskAssessedAt || "未记录"}`,
  ].join("\n");
}

function formPage(token, project, error = "") {
  const body = `
    <p>${escapeHtml(projectContextText(project))}</p>
    <h2>AI 风险预测报告</h2>
    <div class="report">${escapeHtml(project.aiRiskReport || "暂无风险报告。")}</div>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
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

function completedPage(project) {
  const body = `
    <p>${escapeHtml(projectContextText(project))}</p>
    <h2>已提交的审核意见</h2>
    <div class="report">审核意见：${escapeHtml(project.aiRiskReviewNote || "未填写")}\n\n补充风险：${escapeHtml(project.aiRiskAdditionalRisks || "无")}\n\n确认时间：${escapeHtml(project.aiRiskReviewedAt || "未记录")}</div>
    <p class="hint">您已发送完毕，这条风险审核记录已锁定，不能重复修改。</p>`;
  return page("风险审核已完成", body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 30_000) reject(new Error("提交内容过长。"));
    });
    req.on("end", () => {
      const params = new URLSearchParams(raw);
      resolve({
        token: String(params.get("token") || "").trim(),
        reviewNote: String(params.get("reviewNote") || "").trim(),
        additionalRisks: String(params.get("additionalRisks") || "").trim(),
      });
    });
    req.on("error", reject);
  });
}

function buildReviewReceipt(project) {
  return [
    "【WorkPad 风险审核回执】",
    "风险预测报告已被审核负责人确认。",
    projectContextText(project),
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
  await sendAppTextMessage({ toUser: member.wecomUserId, content: buildReviewReceipt(project) });
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
    const token = String(req.query?.token || "").trim();
    if (!token) {
      res.status(400).send(messagePage("审核链接不完整", "缺少审核 token，请从企业微信推送消息里的原始链接重新进入。", "error"));
      return;
    }
    const project = findProjectByReviewToken(snapshot.state, token);
    if (!project) {
      res.status(404).send(messagePage("没有找到这份风险报告", "这条审核链接可能已失效，或者对应订单已经被删除。", "error"));
      return;
    }
    if (project.aiRiskReviewStatus === "已确认" || project.aiRiskReviewedAt) {
      res.status(200).send(completedPage(project));
      return;
    }
    res.status(200).send(formPage(token, project));
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch (error) {
    res.status(400).send(messagePage("提交失败", error instanceof Error ? error.message : String(error), "error"));
    return;
  }

  const token = String(body.token || req.query?.token || "").trim();
  const reviewNote = String(body.reviewNote || "").trim().slice(0, MAX_NOTE_LENGTH);
  const additionalRisks = String(body.additionalRisks || "").trim().slice(0, MAX_NOTE_LENGTH);
  if (!token) {
    res.status(400).send(messagePage("审核链接不完整", "缺少审核 token，请从企业微信推送消息里的原始链接重新进入。", "error"));
    return;
  }
  const project = findProjectByReviewToken(snapshot.state, token);
  if (!project) {
    res.status(404).send(messagePage("没有找到这份风险报告", "这条审核链接可能已失效，或者对应订单已经被删除。", "error"));
    return;
  }
  if (project.aiRiskReviewStatus === "已确认" || project.aiRiskReviewedAt) {
    res.status(200).send(completedPage(project));
    return;
  }
  if (!reviewNote) {
    res.status(400).send(formPage(token, project, "请先填写审核意见，再点击确认。"));
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
    `${projectContextText(project)}\n审核意见：${project.aiRiskReviewNote}\n补充风险：${project.aiRiskAdditionalRisks || "无"}\n可以关闭这个页面。`,
  ));
};
