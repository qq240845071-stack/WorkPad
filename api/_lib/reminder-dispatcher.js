const { readStoredState, writeStoredState } = require("./store");
const { findMember, sendAppTextMessage } = require("./wecom-service");

const RETRY_INTERVAL_MS = 10 * 60 * 1000;

function parseChinaReminderDate(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - 8,
    Number(minute),
    0,
    0,
  ));
}

function reminderKey(project) {
  return [
    project.id,
    project.reminderPerson || "",
    project.reminderDate || "",
    project.nextAction || "",
  ].join("|");
}

function shouldDispatchReminder(project, now) {
  if (!project || project.status === "已完成") return false;
  if (!project.reminderNotificationPending) return false;
  if (project.reminderNotificationStatus === "sent") return false;
  const dueAt = parseChinaReminderDate(project.reminderDate);
  if (!dueAt || dueAt.getTime() > now.getTime()) return false;

  const lastAttempt = project.reminderNotificationLastAttemptAt
    ? new Date(project.reminderNotificationLastAttemptAt)
    : null;
  if (lastAttempt && Number.isFinite(lastAttempt.getTime()) && now.getTime() - lastAttempt.getTime() < RETRY_INTERVAL_MS) {
    return false;
  }

  return true;
}

function buildReminderMessage(project) {
  return [
    "【WorkPad 到点提醒】",
    `项目：${project.title}`,
    `编号：${project.code}`,
    `状态：${project.status} / ${project.currentNode}`,
    `提醒时间：${project.reminderDate}`,
    project.nextAction ? `事项：${project.nextAction}` : "",
  ].filter(Boolean).join("\n");
}

async function dispatchDueReminders({ dryRun = false } = {}) {
  const snapshot = await readStoredState();
  const state = snapshot.state;
  const now = new Date();
  const dueProjects = state.projects.filter((project) => shouldDispatchReminder(project, now));
  const results = [];

  for (const project of dueProjects) {
    const member = findMember(state, project.reminderPerson);
    const baseResult = {
      projectId: project.id,
      projectCode: project.code,
      projectTitle: project.title,
      reminderPerson: project.reminderPerson,
      reminderDate: project.reminderDate,
    };

    if (!member || !member.wecomUserId) {
      project.reminderNotificationStatus = "failed";
      project.reminderNotificationLastAttemptAt = now.toISOString();
      project.reminderNotificationLastError = "提醒人还没有绑定企微账号 UserId。";
      project.reminderNotificationAttempts = Number(project.reminderNotificationAttempts || 0) + 1;
      results.push({ ...baseResult, ok: false, skipped: true, error: project.reminderNotificationLastError });
      continue;
    }

    if (dryRun) {
      results.push({ ...baseResult, ok: true, dryRun: true, toUser: member.wecomUserId });
      continue;
    }

    try {
      await sendAppTextMessage({
        toUser: member.wecomUserId,
        content: buildReminderMessage(project),
      });
      project.reminderNotificationPending = false;
      project.reminderNotificationStatus = "sent";
      project.reminderNotificationSentAt = now.toISOString();
      project.reminderNotificationLastAttemptAt = now.toISOString();
      project.reminderNotificationLastError = "";
      project.reminderNotificationKey = project.reminderNotificationKey || reminderKey(project);
      project.reminderNotificationAttempts = Number(project.reminderNotificationAttempts || 0) + 1;
      project.logs = [
        {
          time: project.reminderDate,
          actor: "WorkPad 管家",
          action: "企业微信到点提醒",
          detail: `已提醒 ${project.reminderPerson}：${project.nextAction || project.title}`,
        },
        ...(Array.isArray(project.logs) ? project.logs : []),
      ].slice(0, 100);
      results.push({ ...baseResult, ok: true, toUser: member.wecomUserId });
    } catch (error) {
      project.reminderNotificationStatus = "failed";
      project.reminderNotificationLastAttemptAt = now.toISOString();
      project.reminderNotificationLastError = error instanceof Error ? error.message : String(error);
      project.reminderNotificationAttempts = Number(project.reminderNotificationAttempts || 0) + 1;
      results.push({ ...baseResult, ok: false, toUser: member.wecomUserId, error: project.reminderNotificationLastError });
    }
  }

  if (!dryRun && dueProjects.length) {
    await writeStoredState(state);
  }

  return {
    ok: true,
    checkedAt: now.toISOString(),
    dueCount: dueProjects.length,
    results,
  };
}

module.exports = {
  dispatchDueReminders,
  parseChinaReminderDate,
};
