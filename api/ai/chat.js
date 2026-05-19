const { createChatCompletion, getAiConfig, hasAiConfig } = require("../_lib/ai-client");

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

function buildSystemPrompt(context) {
  return [
    "你是 WorkPad 订单大看板里的后台 AI 管家。",
    "产品用于出版订单流程管理、人员协作、提醒和后续质检。",
    "请始终使用简体中文，回答要直接、可执行、少套话。",
    "如果用户在描述订单提醒、节点记录或质检要求，请尽量整理成明确的字段、动作和下一步建议。",
    "你现在只负责理解、分析和建议，不要声称已经直接修改数据库。",
    context ? `当前页面上下文：${context}` : "",
  ].filter(Boolean).join("\n");
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const config = getAiConfig();
    return sendJson(res, 200, {
      ok: true,
      configured: hasAiConfig(),
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
    const message = String(body.message || "").trim();
    if (!message) return sendJson(res, 400, { ok: false, message: "请输入要发送给 AI 管家的内容。" });

    const history = Array.isArray(body.history) ? body.history : [];
    const context = String(body.context || "").slice(0, 3000);
    const completion = await createChatCompletion({
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        ...history,
        { role: "user", content: message },
      ],
    });

    return sendJson(res, 200, { ok: true, ...completion });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "AI 管家暂时没有响应。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
