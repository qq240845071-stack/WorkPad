const { createChatCompletion, getAiConfig, hasAiConfig } = require("../_lib/ai-client");
const { requireAuth } = require("../_lib/auth");
const { readStoredState } = require("../_lib/store");

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

function businessLineById(state, businessLineId) {
  const lines = Array.isArray(state.businessLines) ? state.businessLines : [];
  return lines.find((line) => line.id === businessLineId || line.name === businessLineId) || lines[0] || {};
}

function processFieldOptions(field) {
  return String(field.options || "")
    .split(/[\n,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function processCardLine(project, line) {
  const fields = Array.isArray(line.processCardFields) ? line.processCardFields : [];
  const values = project.processCardValues && typeof project.processCardValues === "object" ? project.processCardValues : {};
  if (!fields.length) return "该业务线尚未配置工艺卡字段。";
  return fields.map((field) => {
    const options = processFieldOptions(field);
    const value = values[field.id] || "未填写";
    const optionText = options.length ? `；可选项：${options.join("、")}` : "";
    return `${field.label}（${field.type}${field.required ? "，必填" : ""}${optionText}）：${value}`;
  }).join("\n");
}

function buildProjectRiskPrompt(state, project) {
  const line = businessLineById(state, project.businessLineId);
  const riskConfig = line.riskConfig || {};
  const nodes = Array.isArray(project.nodes) ? project.nodes : [];
  const nodeText = nodes.map((node, index) => {
    return `${index + 1}. ${node.name}：${node.status || "未开始"}，进入 ${node.startedAtTime || node.startedAt || "未记录"}，完成 ${node.completedAtTime || node.completedAt || node.completed || "未完成"}，备注 ${node.manualNote || node.note || "无"}`;
  }).join("\n") || "暂无节点记录。";
  return [
    "你是 WorkPad 的订单风险预测助手，负责给单个订单生成可执行的风险预测报告。",
    "必须基于输入信息，不要编造项目、不确定时明确写“需要人工确认”。",
    "请用中文输出，结构固定为：",
    "1. 风险等级：高 / 中 / 低，并说明理由。",
    "2. 主要风险点：列出 3-6 条，覆盖排版、内容、生产、进度、合同或质检中相关的部分。",
    "3. 建议审核负责人：优先使用业务线配置的审核负责人；如果没有配置，按项目负责人或节点负责人建议。",
    "4. 质检重点：结合工艺卡和风险配置，写出质检环节必须核对的点。",
    "5. 下一步动作：给出最具体的下一步处理建议。",
    "",
    "订单信息：",
    `编号：${project.code}`,
    `名称：${project.title}`,
    `作者/来源：${project.author || "未设置"}`,
    `负责人：${project.owner || "未分配"}`,
    `合作方：${project.partner || "未设置"}`,
    `状态/节点：${project.status}/${project.currentNode}`,
    `计划完成：${project.planFinish || "未设置"}`,
    `最近更新：${project.updatedAt || "未记录"}`,
    `下一步动作：${project.nextAction || "未填写"}`,
    `风险说明：${project.riskNote || "未填写"}`,
    "",
    "业务线配置：",
    `业务线：${line.name || project.businessLineName || "未设置"}`,
    `流程名称：${line.workflowName || "未设置"}`,
    `业务线说明：${line.description || "未设置"}`,
    `风险关注点：${riskConfig.focus || "未配置"}`,
    `质检标准：${riskConfig.qualityStandard || "未配置"}`,
    `审核负责人：${riskConfig.reviewer || "未指定"}`,
    "",
    "产品工艺卡：",
    processCardLine(project, line),
    "",
    "节点进度：",
    nodeText,
  ].join("\n");
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
  const auth = await requireAuth(req, res);
  if (!auth) return;

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
    const body = await readJsonBody(req);
    const snapshot = await readStoredState();
    const projectId = String(body.projectId || body.code || "").trim();
    if (projectId) {
      const project = snapshot.state.projects.find((item) => item.id === projectId || item.code === projectId);
      if (!project) return sendJson(res, 404, { ok: false, message: "没有找到要做风险预测的订单。" });
      const completion = await createChatCompletion({
        task: "risk",
        temperature: 0.2,
        messages: [{ role: "user", content: buildProjectRiskPrompt(snapshot.state, project) }],
      });
      return sendJson(res, 200, { ok: true, projectId: project.id, ...completion });
    }
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
