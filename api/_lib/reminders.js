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

function parseChinaReminderDate(value) {
  const match = textValue(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 8, Number(minute), 0, 0));
}

function shouldDispatchReminder(project, reminder, now) {
  if (!project || project.status === "已完成") return false;
  if (!reminder.pending) return false;
  if (reminder.status === "sent") return false;
  const dueAt = parseChinaReminderDate(reminder.date);
  if (!dueAt || dueAt.getTime() > now.getTime()) return false;
  const lastAttempt = reminder.lastAttemptAt ? new Date(reminder.lastAttemptAt) : null;
  if (lastAttempt && Number.isFinite(lastAttempt.getTime()) && now.getTime() - lastAttempt.getTime() < RETRY_INTERVAL_MS) return false;
  return true;
}

module.exports = {
  appendProjectReminder,
  activeReminders,
  normalizeProjectReminders,
  parseChinaReminderDate,
  primaryReminder,
  shouldDispatchReminder,
  syncProjectReminderFields,
};
