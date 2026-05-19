const { createChatCompletion, getAiConfig, hasAiConfig } = require("../_lib/ai-client");
const { readStoredState } = require("../_lib/store");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function projectLine(project) {
  return [
    project.code,
    `《${project.title}》`,
    `状态：${project.status}/${project.currentNode}`,
    `负责人：${project.owner}`,
    `提醒：${project.reminderPerson} ${project.reminderDate}`,
    `计划完成：${project.planFinish}`,
    `最近更新：${project.updatedAt}`,
    `下一步：${project.nextAction}`,
    `风险：${project.riskNote}`,
  ].join("，");
}

function projectUrgencyScore(project) {
  const now = Date.now();
  const planTime = new Date(String(project.planFinish || "").replace(" ", "T")).getTime();
  const updateTime = new Date(String(project.updatedAt || "").replace(" ", "T")).getTime();
  const overdueDays = Number.isFinite(planTime) ? Math.floor((now - planTime) / 86400000) : 0;
  const staleDays = Number.isFinite(updateTime) ? Math.floor((now - updateTime) / 86400000) : 0;
  return Math.max(overdueDays, 0) * 5 + Math.max(staleDays, 0) + (project.status === "已暂停" ? 10 : 0);
}

function buildRiskPrompt(state) {
  const active = state.projects
    .filter((project) => !["已完成"].includes(project.status))
    .sort((left, right) => projectUrgencyScore(right) - projectUrgencyScore(left));
  return [
    "你是出版订单项目的风险评估助手。",
    "请根据项目状态、计划时间、最近更新、下一步动作和风险说明，输出一份中文风险评估。",
    "要求：",
    "1. 先列出最需要优先处理的 3-5 个订单。",
    "2. 每个订单给出风险原因、建议动作、建议提醒对象。",
    "3. 最后给出今天的整体处理顺序。",
    "4. 不要编造项目，必须基于输入项目。",
    "",
    "当前订单：",
    ...active.slice(0, 12).map(projectLine),
  ].join("\n");
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const config = await getAiConfig("risk");
    return sendJson(res, 200, {
      ok: true,
      configured: await hasAiConfig("risk"),
      providerName: config.providerName,
      model: config.model,
      baseUrl: config.baseUrl,
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 GET 和 POST。" });
  }

  try {
    const snapshot = await readStoredState();
    const completion = await createChatCompletion({
      task: "risk",
      temperature: 0.2,
      messages: [{ role: "user", content: buildRiskPrompt(snapshot.state) }],
    });
    return sendJson(res, 200, { ok: true, ...completion });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "AI 风险评估暂时没有响应。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
