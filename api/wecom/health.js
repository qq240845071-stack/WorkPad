const { readStoredState } = require("../_lib/store");
const { hasCallbackConfig, hasSendConfig, getConfig } = require("../_lib/wecom-crypto");
const { hasWecomProxyConfig } = require("../_lib/wecom-service");

module.exports = async (_req, res) => {
  try {
    const snapshot = await readStoredState();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: true,
      callbackConfigured: hasCallbackConfig(),
      sendConfigured: hasSendConfig() || hasWecomProxyConfig(),
      corpIdReady: Boolean(getConfig().corpId),
      agentIdReady: Boolean(getConfig().agentId),
      tokenReady: Boolean(getConfig().token),
      aesKeyReady: Boolean(getConfig().encodingAesKey),
      appSecretReady: Boolean(getConfig().appSecret),
      fixedIpProxyConfigured: hasWecomProxyConfig(),
      fixedIpProxyBaseUrlReady: Boolean(process.env.WECOM_PROXY_BASE_URL || process.env.WECOM_PROXY_URL),
      fixedIpProxySecretReady: Boolean(process.env.WECOM_PROXY_SECRET),
      inboxCount: Array.isArray(snapshot.state.wecomInbox) ? snapshot.state.wecomInbox.length : 0,
      pushLogCount: Array.isArray(snapshot.state.pushLogs) ? snapshot.state.pushLogs.length : 0,
      storageMode: snapshot.meta.storageMode,
      persistence: snapshot.meta.persistence,
      updatedAt: snapshot.meta.updatedAt,
    }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      message: "企业微信健康检查失败。",
      error: error instanceof Error ? error.message : String(error),
    }));
  }
};
