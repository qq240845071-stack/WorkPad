function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function memberNameByUserId(state, userId) {
  const normalized = cleanText(userId).toLowerCase();
  if (!normalized) return "";
  const member = (Array.isArray(state.teamMembers) ? state.teamMembers : []).find((item) => {
    return cleanText(item.wecomUserId).toLowerCase() === normalized;
  });
  return member?.name || "";
}

function appendPushLog(state, payload) {
  const success = payload.success === true || payload.success === "true";
  const receiverUserId = cleanText(payload.receiverUserId || payload.toUser);
  const confirmable = payload.confirmable === true || payload.confirmable === "true";
  const logs = Array.isArray(state.pushLogs) ? state.pushLogs : [];
  const log = {
    id: cleanText(payload.id, `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    content: cleanText(payload.content, "未填写推送内容"),
    pushedAt: cleanText(payload.pushedAt, new Date().toISOString()),
    actor: cleanText(payload.actor, "WorkPad 管家"),
    receiver: cleanText(payload.receiver, memberNameByUserId(state, receiverUserId) || receiverUserId || "未设置接收人"),
    receiverUserId,
    success,
    status: cleanText(payload.status, success ? "成功" : "失败"),
    error: cleanText(payload.error),
    source: cleanText(payload.source, "企业微信推送"),
    projectCode: cleanText(payload.projectCode),
    projectTitle: cleanText(payload.projectTitle),
    confirmable,
    confirmationToken: cleanText(payload.confirmationToken),
    confirmationUrl: cleanText(payload.confirmationUrl),
    completionStatus: cleanText(payload.completionStatus, confirmable ? "待确认" : ""),
    completedAt: cleanText(payload.completedAt),
    completedBy: cleanText(payload.completedBy),
    completionNote: cleanText(payload.completionNote),
    reminderId: cleanText(payload.reminderId),
    reminderScope: cleanText(payload.reminderScope),
  };
  const existingIndex = logs.findIndex((item) => item.id === log.id);
  if (existingIndex >= 0) {
    const nextLog = { ...logs[existingIndex], ...log };
    state.pushLogs = [nextLog, ...logs.filter((_, index) => index !== existingIndex)];
    return nextLog;
  }
  state.pushLogs = [log, ...logs];
  return log;
}

module.exports = {
  appendPushLog,
  memberNameByUserId,
};
