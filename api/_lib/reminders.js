const RETRY_INTERVAL_MS = 10 * 60 * 1000;

function textValue(value) {
  return String(value ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeReminderDate(value, fallback = "") {
  const raw = textValue(value || fallback);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 09:00`;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if (match) return `${match[1]} ${match[2].padStart(2, "0")}:${match[3]}`;
  return raw;
}

function reminderId(projectId = "project") {
  return `reminder-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function confirmationToken(prefix = "reminder") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function booleanValue(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === false || value === "false" || value === "否") return false;
  return Boolean(value);
}

function normalizeReminderItem(item, project, index = 0) {
  const source = item || {};
  const person = textValue(source.person || source.reminderPerson || source.memberName || project.reminderPerson || project.owner || "未分配");
  const date = normalizeReminderDate(source.date || source.reminderDate || project.reminderDate || project.planFinish);
  const note = textValue(source.note || source.nextAction || project.nextAction || "待补充提醒内容");
  const status = textValue(source.status || source.reminderNotificationStatus || "pending") || "pending";
  const pending = source.pending === false || status === "sent" || status === "completed" || status === "cancelled" ? false : true;
  return {
    id: textValue(source.id || reminderId(project.id || `project-${index}`)),
    person,
    date,
    note,
    status,
    pending,
    source: textValue(source.source || project.reminderRecordSource || "手动提醒"),
    actor: textValue(source.actor || project.reminderRecordActor || project.owner || "WorkPad 管家"),
    recordAt: textValue(source.recordAt || project.reminderRecordAt || ""),
    createdAt: textValue(source.createdAt || project.reminderNotificationCreatedAt || nowIso()),
    sentAt: textValue(source.sentAt || project.reminderNotificationSentAt || ""),
    lastAttemptAt: textValue(source.lastAttemptAt || project.reminderNotificationLastAttemptAt || ""),
    lastError: textValue(source.lastError || project.reminderNotificationLastError || ""),
    attempts: Number(source.attempts ?? source.reminderNotificationAttempts ?? 0) || 0,
    confirmable: booleanValue(source.confirmable, true),
    confirmationToken: textValue(source.confirmationToken || source.confirmToken || ""),
    confirmationUrl: textValue(source.confirmationUrl || ""),
    completedAt: textValue(source.completedAt || ""),
    completedBy: textValue(source.completedBy || ""),
    completionNote: textValue(source.completionNote || ""),
  };
}

function legacyReminder(project) {
  if (!project.reminderPerson && !project.reminderDate && !project.nextAction) return null;
  return normalizeReminderItem({
    id: project.reminderNotificationKey || reminderId(project.id || "legacy"),
    person: project.reminderPerson,
    date: project.reminderDate,
    note: project.nextAction,
    status: project.reminderNotificationStatus || "pending",
    pending: project.reminderNotificationPending,
    createdAt: project.reminderNotificationCreatedAt,
    sentAt: project.reminderNotificationSentAt,
    lastAttemptAt: project.reminderNotificationLastAttemptAt,
    lastError: project.reminderNotificationLastError,
    attempts: project.reminderNotificationAttempts,
    source: project.reminderRecordSource || "历史提醒",
    actor: project.reminderRecordActor || project.owner,
    recordAt: project.reminderRecordAt,
  }, project);
}

function normalizeProjectReminders(project) {
  if (Array.isArray(project.reminders)) {
    return project.reminders.map((item, index) => normalizeReminderItem(item, project, index));
  }
  return [legacyReminder(project)].filter(Boolean);
}

function activeReminders(project) {
  return normalizeProjectReminders(project).filter((item) => !["sent", "completed", "cancelled"].includes(item.status));
}

function primaryReminder(project) {
  const active = activeReminders(project);
  const reminders = active.length ? active : normalizeProjectReminders(project);
  return reminders.slice().sort((left, right) => String(left.date).localeCompare(String(right.date)))[0] || null;
}

function syncProjectReminderFields(project) {
  const primary = primaryReminder(project);
  project.reminders = normalizeProjectReminders(project);
  if (!primary) return project;
  project.reminderPerson = primary.person;
  project.reminderDate = primary.date;
  project.nextAction = primary.note || project.nextAction;
  project.reminderNotificationPending = primary.pending;
  project.reminderNotificationStatus = primary.status;
  project.reminderNotificationCreatedAt = primary.createdAt;
  project.reminderNotificationSentAt = primary.sentAt;
  project.reminderNotificationLastError = primary.lastError;
  project.reminderNotificationLastAttemptAt = primary.lastAttemptAt;
  project.reminderNotificationAttempts = primary.attempts;
  project.reminderNotificationKey = primary.id;
  project.reminderRecordActor = primary.actor;
  project.reminderRecordAt = primary.recordAt;
  project.reminderRecordSource = primary.source;
  return project;
}

function appendProjectReminder(project, input) {
  const source = input || {};
  const reminder = normalizeReminderItem({
    ...source,
    id: source.id || reminderId(project.id || "project"),
    status: source.status || "pending",
    pending: source.pending ?? true,
    createdAt: source.createdAt || nowIso(),
  }, project);
  project.reminders = [...normalizeProjectReminders(project), reminder];
  syncProjectReminderFields(project);
  return reminder;
}

function normalizePublicReminder(item, index = 0) {
  const source = item || {};
  return normalizeReminderItem({
    ...source,
    id: source.id || reminderId(`public-${index}`),
    source: source.source || "公共提醒",
    actor: source.actor || "WorkPad 管家",
  }, {}, index);
}

function normalizePublicReminders(reminders) {
  return (Array.isArray(reminders) ? reminders : [])
    .map((item, index) => normalizePublicReminder(item, index))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function appendPublicReminder(state, input) {
  const source = input || {};
  const reminder = normalizePublicReminder({
    ...source,
    id: source.id || reminderId("public"),
    status: source.status || "pending",
    pending: source.pending ?? true,
    createdAt: source.createdAt || nowIso(),
    source: source.source || "公共提醒",
  });
  state.publicReminders = [...normalizePublicReminders(state.publicReminders), reminder];
  return reminder;
}

function publicBaseUrl() {
  return textValue(process.env.WORKPAD_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "https://workpad.tbxprint.com").replace(/\/+$/, "");
}

function ensureReminderConfirmation(reminder, baseUrl = publicBaseUrl()) {
  if (!reminder || reminder.confirmable === false) return "";
  reminder.confirmationToken = reminder.confirmationToken || confirmationToken("confirm");
  reminder.confirmationUrl = reminder.confirmationUrl || `${baseUrl}/api/reminders/confirm?token=${encodeURIComponent(reminder.confirmationToken)}`;
  return reminder.confirmationUrl;
}

function markReminderCompleted(reminder, completedBy = "企业微信确认", completedAt = nowIso()) {
  reminder.status = "completed";
  reminder.pending = false;
  reminder.completedAt = completedAt;
  reminder.completedBy = textValue(completedBy || "企业微信确认");
  reminder.lastError = "";
  return reminder;
}

function completeReminderByToken(state, token, completedBy = "企业微信确认") {
  const normalizedToken = textValue(token);
  if (!normalizedToken) return null;
  const completedAt = nowIso();

  for (const project of Array.isArray(state.projects) ? state.projects : []) {
    project.reminders = normalizeProjectReminders(project);
    const reminder = project.reminders.find((item) => item.confirmationToken === normalizedToken);
    if (!reminder) continue;
    markReminderCompleted(reminder, completedBy, completedAt);
    syncProjectReminderFields(project);
    updatePushLogCompletion(state, normalizedToken, completedBy, completedAt);
    return { scope: "project", project, reminder };
  }

  state.publicReminders = normalizePublicReminders(state.publicReminders);
  const reminder = state.publicReminders.find((item) => item.confirmationToken === normalizedToken);
  if (reminder) {
    markReminderCompleted(reminder, completedBy, completedAt);
    updatePushLogCompletion(state, normalizedToken, completedBy, completedAt);
    return { scope: "public", reminder };
  }

  return null;
}

function updatePushLogCompletion(state, token, completedBy, completedAt) {
  if (!Array.isArray(state.pushLogs)) return;
  state.pushLogs.forEach((log) => {
    if (log.confirmationToken !== token) return;
    log.completionStatus = "已完成";
    log.completedAt = completedAt;
    log.completedBy = completedBy;
  });
}

function parseChinaReminderDate(value) {
  const match = textValue(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 8, Number(minute), 0, 0));
}

function shouldDispatchReminder(project, reminder, now) {
  if (!project || project.status === "已完成") return false;
  if (!reminder.pending) return false;
  if (reminder.status === "sent" || reminder.status === "completed") return false;
  const dueAt = parseChinaReminderDate(reminder.date);
  if (!dueAt || dueAt.getTime() > now.getTime()) return false;
  const lastAttempt = reminder.lastAttemptAt ? new Date(reminder.lastAttemptAt) : null;
  if (lastAttempt && Number.isFinite(lastAttempt.getTime()) && now.getTime() - lastAttempt.getTime() < RETRY_INTERVAL_MS) return false;
  return true;
}

module.exports = {
  appendProjectReminder,
  appendPublicReminder,
  activeReminders,
  completeReminderByToken,
  ensureReminderConfirmation,
  normalizePublicReminders,
  normalizeProjectReminders,
  parseChinaReminderDate,
  primaryReminder,
  shouldDispatchReminder,
  syncProjectReminderFields,
};
