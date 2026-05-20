const { createChatCompletion, getAiConfig, hasAiConfig } = require("../_lib/ai-client");
const { requireAuth } = require("../_lib/auth");

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

function buildVisionPrompt({ prompt, orderRequirement }) {
  return [
    "你是出版印刷订单的图片质检助手。",
    "请根据图片做质量判断，尤其关注：尺寸读数、是否露白边、比例是否异常、胶装是否缺胶或开裂。",
    "如果图片中有卷尺或尺子，请读取可见刻度，并说明读数依据。",
    "请输出：识别结果、是否合格、异常点、建议补拍角度、是否需要人工复核。",
    "不要把不清楚的照片强行判定合格；不确定时给出“需人工复核”。",
    orderRequirement ? `订单质检要求：${orderRequirement}` : "",
    prompt ? `用户补充要求：${prompt}` : "",
  ].filter(Boolean).join("\n");
}

module.exports = async (req, res) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const config = await getAiConfig("vision");
    return sendJson(res, 200, {
      ok: true,
      configured: await hasAiConfig("vision"),
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
    const imageDataUrl = String(body.imageDataUrl || "").trim();
    if (!imageDataUrl.startsWith("data:image/")) {
      return sendJson(res, 400, { ok: false, message: "请上传一张图片后再识别。" });
    }
    if (imageDataUrl.length > 8 * 1024 * 1024) {
      return sendJson(res, 400, { ok: false, message: "图片太大，请压缩到 6MB 以内后再试。" });
    }

    const completion = await createChatCompletion({
      task: "vision",
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildVisionPrompt(body) },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    });
    return sendJson(res, 200, { ok: true, ...completion });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "AI 图片识别暂时没有响应。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
