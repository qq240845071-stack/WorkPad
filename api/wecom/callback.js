const {
  getConfig,
  hasCallbackConfig,
  parseXml,
  decryptText,
  verifySignature,
  buildPlainTextReply,
  buildEncryptedReply,
  randomNonce,
} = require("../_lib/wecom-crypto");
const { handleIncomingMessage } = require("../_lib/wecom-service");

function queryFromRequest(req) {
  const url = new URL(req.url, "http://localhost");
  return {
    msgSignature: url.searchParams.get("msg_signature") || "",
    timestamp: url.searchParams.get("timestamp") || "",
    nonce: url.searchParams.get("nonce") || "",
    echoStr: url.searchParams.get("echostr") || "",
    encryptType: url.searchParams.get("encrypt_type") || "",
  };
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function sendText(res, statusCode, content, contentType = "text/plain; charset=utf-8") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(content);
}

module.exports = async (req, res) => {
  if (!hasCallbackConfig()) {
    return sendText(res, 500, "企业微信回调配置不完整，请先设置 WECOM_CORP_ID / WECOM_TOKEN / WECOM_ENCODING_AES_KEY。");
  }

  const query = queryFromRequest(req);

  try {
    if (req.method === "GET") {
      if (!query.msgSignature || !query.timestamp || !query.nonce || !query.echoStr) {
        return sendText(res, 400, "缺少企业微信 URL 验证参数。");
      }
      if (!verifySignature(query.msgSignature, query.timestamp, query.nonce, query.echoStr)) {
        return sendText(res, 401, "企业微信回调签名校验失败。");
      }
      const plainEcho = decryptText(query.echoStr);
      return sendText(res, 200, plainEcho);
    }

    if (req.method !== "POST") {
      return sendText(res, 405, "当前回调地址只支持 GET 和 POST。");
    }

    const rawBody = await readRawBody(req);
    if (!rawBody) return sendText(res, 200, "success");

    const envelope = parseXml(rawBody);
    const encrypted = query.encryptType === "aes" || Boolean(envelope.Encrypt);
    let messageXml = rawBody;

    if (encrypted) {
      const encrypt = envelope.Encrypt || "";
      if (!verifySignature(query.msgSignature, query.timestamp, query.nonce, encrypt)) {
        return sendText(res, 401, "企业微信消息签名校验失败。");
      }
      messageXml = decryptText(encrypt);
    }

    const message = parseXml(messageXml);
    const result = await handleIncomingMessage(message);
    if (!result.replyText) return sendText(res, 200, "success");

    const replyPlainXml = buildPlainTextReply({
      toUserName: message.FromUserName,
      fromUserName: message.ToUserName,
      content: result.replyText,
      agentId: message.AgentID || getConfig().agentId,
    });

    if (!encrypted) {
      return sendText(res, 200, replyPlainXml, "application/xml; charset=utf-8");
    }

    const timestamp = query.timestamp || String(Math.floor(Date.now() / 1000));
    const nonce = query.nonce || randomNonce();
    const replyEncryptedXml = buildEncryptedReply({
      plaintextXml: replyPlainXml,
      timestamp,
      nonce,
    });
    return sendText(res, 200, replyEncryptedXml, "application/xml; charset=utf-8");
  } catch (error) {
    return sendText(res, 500, error instanceof Error ? error.message : String(error));
  }
};
