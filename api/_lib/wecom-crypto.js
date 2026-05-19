const crypto = require("node:crypto");
const { XMLBuilder, XMLParser } = require("fast-xml-parser");

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  cdataPropName: "__cdata",
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  cdataPropName: "__cdata",
  format: false,
  suppressEmptyNode: true,
});

function getConfig() {
  return {
    corpId: process.env.WECOM_CORP_ID || "",
    agentId: process.env.WECOM_AGENT_ID || "",
    appSecret: process.env.WECOM_APP_SECRET || "",
    token: process.env.WECOM_TOKEN || "",
    encodingAesKey: process.env.WECOM_ENCODING_AES_KEY || "",
  };
}

function hasCallbackConfig() {
  const config = getConfig();
  return Boolean(config.corpId && config.token && config.encodingAesKey);
}

function hasSendConfig() {
  const config = getConfig();
  return Boolean(config.corpId && config.appSecret && config.agentId);
}

function getAesKey() {
  const { encodingAesKey } = getConfig();
  return Buffer.from(`${encodingAesKey}=`, "base64");
}

function pkcs7Unpad(buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) return buffer;
  return buffer.subarray(0, buffer.length - pad);
}

function pkcs7Pad(buffer) {
  const blockSize = 32;
  const remainder = buffer.length % blockSize;
  const amount = remainder === 0 ? blockSize : blockSize - remainder;
  return Buffer.concat([buffer, Buffer.alloc(amount, amount)]);
}

function sha1Signature(...parts) {
  return crypto.createHash("sha1").update(parts.map(String).sort().join(""), "utf8").digest("hex");
}

function verifySignature(signature, timestamp, nonce, encrypted) {
  const { token } = getConfig();
  const expected = sha1Signature(token, timestamp, nonce, encrypted);
  return expected === signature;
}

function decryptText(encrypted) {
  const { corpId } = getConfig();
  const aesKey = getAesKey();
  const iv = aesKey.subarray(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
  const plain = pkcs7Unpad(decrypted);
  const length = plain.readUInt32BE(16);
  const content = plain.subarray(20, 20 + length).toString("utf8");
  const receiveId = plain.subarray(20 + length).toString("utf8");
  if (corpId && receiveId && receiveId !== corpId) {
    throw new Error("企微回调 CorpID 校验失败。");
  }
  return content;
}

function encryptText(plaintext) {
  const { corpId } = getConfig();
  const aesKey = getAesKey();
  const iv = aesKey.subarray(0, 16);
  const random16 = crypto.randomBytes(16);
  const content = Buffer.from(plaintext, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(content.length, 0);
  const receiveId = Buffer.from(corpId, "utf8");
  const payload = pkcs7Pad(Buffer.concat([random16, length, content, receiveId]));
  const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(payload), cipher.final()]).toString("base64");
}

function parseXml(xml) {
  const parsed = xmlParser.parse(xml);
  return unwrapNode(parsed.xml || parsed);
}

function unwrapNode(node) {
  if (Array.isArray(node)) return node.map(unwrapNode);
  if (!node || typeof node !== "object") return node;
  if (Object.keys(node).length === 1 && Object.prototype.hasOwnProperty.call(node, "__cdata")) {
    return node.__cdata;
  }
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, unwrapNode(value)]));
}

function buildPlainTextReply({ toUserName, fromUserName, content, agentId }) {
  return xmlBuilder.build({
    xml: {
      ToUserName: { __cdata: toUserName },
      FromUserName: { __cdata: fromUserName },
      CreateTime: String(Math.floor(Date.now() / 1000)),
      MsgType: { __cdata: "text" },
      Content: { __cdata: content },
      AgentID: String(agentId || getConfig().agentId || ""),
    },
  });
}

function buildEncryptedReply({ plaintextXml, timestamp, nonce }) {
  const encrypted = encryptText(plaintextXml);
  return xmlBuilder.build({
    xml: {
      Encrypt: { __cdata: encrypted },
      MsgSignature: { __cdata: sha1Signature(getConfig().token, timestamp, nonce, encrypted) },
      TimeStamp: String(timestamp),
      Nonce: { __cdata: String(nonce) },
    },
  });
}

function randomNonce() {
  return crypto.randomBytes(8).toString("hex");
}

module.exports = {
  getConfig,
  hasCallbackConfig,
  hasSendConfig,
  parseXml,
  decryptText,
  encryptText,
  verifySignature,
  buildPlainTextReply,
  buildEncryptedReply,
  randomNonce,
};
