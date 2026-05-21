const { readStoredState, writeStoredState } = require("./store");
const { findMember, sendAppTextMessage } = require("./wecom-service");
const { appendPushLog } = require("./push-log");
const {
  ensureReminderConfirmation,
  normalizePublicReminders,
  normalizeProjectReminders,
  parseChinaReminderDate,
  shouldDispatchReminder,
  syncProjectReminderFields,
} = require("./reminders");

function buildReminderMessage(project, reminder) {
  return [
    "【WorkPad 到点提醒】",
    `项目：${project.title}`,
    `编号：${project.code}`,
    `状态：${project.status} / ${project.currentNode}`,
    `提醒时间：${reminder.date}`,
    reminder.actor ? `发起人：${reminder.actor}` : "",
    reminder.note ? `事项：${reminder.note}` : "",
  ].filter(Boolean).join("\n");
}

function buildPublicReminderMessage(reminder) {
  return [
    "【WorkPad 公共提醒】",
    `事项：${reminder.note}`,
    `提醒人：${reminder.person}`,
    `提醒时间：${reminder.date}`,
    reminder.actor ? `发起人：${reminder.actor}` : "",
  ].filter(Boolean).join("\n");
}

function withConfirmationLink(content, reminder, enabled = true) {
  if (!enabled) return content;
  const url = ensureReminderConfirmation(reminder);
  return url ? `${content}\n\n完成后点击确认：${url}` : content;
}

function confirmationPayload(reminder, scope, enabled = true) {
  const confirmable = enabled && reminder.confirmable !== false;
  return {
    confirmable,
    confirmationToken: confirmable ? reminder.confirmationToken || "" : "",
    confirmationUrl: confirmable ? reminder.confirmationUrl || "" : "",
    completionStatus: confirmable ? "待确认" : "无需确认",
    reminderId: reminder.id,
    reminderScope: scope,
  };
}

function isDemoReminder(reminder) {
  const id = String(reminder?.id || "");
  const source = String(reminder?.source || "");
  return id.startsWith("reminder-demo-") || source === "演示数据";
}

async function dispatchDueReminders({ dryRun = false } = {}) {
  const snapshot = await readStoredState();
  let state = snapshot.state;
  const confirmationEnabled = state.confirmablePushEnabled !== false;
  const now = new Date();
  const dueItems = state.projects.flatMap((project) => normalizeProjectReminders(project)
    .map((reminder, index) => ({ project, projectId: project.id, projectCode: project.code, reminder, reminderId: reminder.id, reminderIndex: index }))
    .filter(({ reminder }) => !isDemoReminder(reminder) && shouldDispatchReminder(project, reminder, now)));
  const results = [];

  for (const item of dueItems) {
    let { project } = item;
    project.reminders = normalizeProjectReminders(project);
    let reminder = project.reminders.find((entry) => entry.id === item.reminderId) || project.reminders[item.reminderIndex];
    if (!reminder) continue;

    if (!dryRun) {
      const dispatchToken = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const lockSnapshot = await readStoredState();
      const lockState = lockSnapshot.state;
      const lockProject = (Array.isArray(lockState.projects) ? lockState.projects : []).find((entry) => entry.id === item.projectId || entry.code === item.projectCode);
      if (!lockProject) continue;
      lockProject.reminders = normalizeProjectReminders(lockProject);
      const lockReminder = lockProject.reminders.find((entry) => entry.id === item.reminderId) || lockProject.reminders[item.reminderIndex];
      if (!lockReminder || isDemoReminder(lockReminder) || !shouldDispatchReminder(lockProject, lockReminder, new Date())) {
        results.push({
          projectId: item.projectId,
          projectCode: item.projectCode,
          reminderId: item.reminderId,
          ok: true,
          skipped: true,
          reason: "提醒正在发送或已经处理完成。",
        });
        continue;
      }
      reminder = lockReminder;
      project = lockProject;
      reminder.status = "sending";
      reminder.pending = true;
      reminder.lastAttemptAt = now.toISOString();
      reminder.dispatchToken = dispatchToken;
      syncProjectReminderFields(project);
      await writeStoredState(lockState);

      const verifySnapshot = await readStoredState();
      const verifyState = verifySnapshot.state;
      const verifiedProject = (Array.isArray(verifyState.projects) ? verifyState.projects : []).find((entry) => entry.id === item.projectId || entry.code === item.projectCode);
      if (!verifiedProject) continue;
      verifiedProject.reminders = normalizeProjectReminders(verifiedProject);
      const verifiedReminder = verifiedProject.reminders.find((entry) => entry.id === item.reminderId) || verifiedProject.reminders[item.reminderIndex];
      if (!verifiedReminder || verifiedReminder.dispatchToken !== dispatchToken || verifiedReminder.status !== "sending") {
        results.push({
          projectId: item.projectId,
          projectCode: item.projectCode,
          reminderId: item.reminderId,
          ok: true,
          skipped: true,
          reason: "提醒发送锁已被其他任务占用。",
        });
        continue;
      }
      state = verifyState;
      project = verifiedProject;
      reminder = verifiedReminder;
    }

    const member = findMember(state, reminder.person);
    let content = buildReminderMessage(project, reminder);
    const actor = reminder.actor || project.reminderRecordActor || "WorkPad 管家";
    const baseResult = {
      projectId: project.id,
      projectCode: project.code,
      projectTitle: project.title,
      reminderId: reminder.id,
      reminderPerson: reminder.person,
      reminderDate: reminder.date,
    };

    if (!member || !member.wecomUserId) {
      reminder.status = "failed";
      reminder.pending = true;
      reminder.dispatchToken = "";
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = "提醒人还没有绑定企微账号 UserId。";
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      syncProjectReminderFields(project);
      if (!dryRun) {
        appendPushLog(state, {
          content,
          actor,
          receiver: reminder.person,
          success: false,
          source: "到点提醒",
          error: reminder.lastError,
          projectCode: project.code,
          projectTitle: project.title,
        });
      }
      results.push({ ...baseResult, ok: false, skipped: true, error: reminder.lastError });
      continue;
    }

    content = withConfirmationLink(content, reminder, confirmationEnabled);

    if (dryRun) {
      results.push({ ...baseResult, ok: true, dryRun: true, toUser: member.wecomUserId });
      continue;
    }

    try {
      await sendAppTextMessage({
        toUser: member.wecomUserId,
        content,
      });
      reminder.pending = false;
      reminder.status = "sent";
      reminder.dispatchToken = "";
      reminder.sentAt = now.toISOString();
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = "";
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      project.logs = [
        {
          time: reminder.date,
          actor: "WorkPad 管家",
          action: "企业微信到点提醒",
          detail: `已提醒 ${reminder.person}：${reminder.note || project.title}`,
        },
        ...(Array.isArray(project.logs) ? project.logs : []),
      ].slice(0, 100);
      syncProjectReminderFields(project);
      appendPushLog(state, {
        content,
        actor,
        receiver: member.name,
        receiverUserId: member.wecomUserId,
        success: true,
        source: "到点提醒",
        projectCode: project.code,
        projectTitle: project.title,
        ...confirmationPayload(reminder, "project", confirmationEnabled),
      });
      results.push({ ...baseResult, ok: true, toUser: member.wecomUserId });
    } catch (error) {
      reminder.status = "failed";
      reminder.pending = true;
      reminder.dispatchToken = "";
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = error instanceof Error ? error.message : String(error);
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      syncProjectReminderFields(project);
      appendPushLog(state, {
        content,
        actor,
        receiver: member.name,
        receiverUserId: member.wecomUserId,
        success: false,
        source: "到点提醒",
        error: reminder.lastError,
        projectCode: project.code,
        projectTitle: project.title,
        ...confirmationPayload(reminder, "project", confirmationEnabled),
      });
      results.push({ ...baseResult, ok: false, toUser: member.wecomUserId, error: reminder.lastError });
    }
  }

  state.publicReminders = normalizePublicReminders(state.publicReminders);
  const duePublicItems = state.publicReminders
    .map((reminder, index) => ({ reminder, reminderId: reminder.id, reminderIndex: index }))
    .filter(({ reminder }) => !isDemoReminder(reminder) && shouldDispatchReminder({ status: "进行中" }, reminder, now));

  for (const item of duePublicItems) {
    let reminder = state.publicReminders.find((entry) => entry.id === item.reminderId) || state.publicReminders[item.reminderIndex];
    if (!reminder) continue;

    if (!dryRun) {
      const dispatchToken = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const lockSnapshot = await readStoredState();
      const lockState = lockSnapshot.state;
      lockState.publicReminders = normalizePublicReminders(lockState.publicReminders);
      const lockReminder = lockState.publicReminders.find((entry) => entry.id === item.reminderId) || lockState.publicReminders[item.reminderIndex];
      if (!lockReminder || isDemoReminder(lockReminder) || !shouldDispatchReminder({ status: "进行中" }, lockReminder, new Date())) {
        results.push({
          scope: "public",
          reminderId: item.reminderId,
          ok: true,
          skipped: true,
          reason: "公共提醒正在发送或已经处理完成。",
        });
        continue;
      }
      reminder = lockReminder;
      reminder.status = "sending";
      reminder.pending = true;
      reminder.lastAttemptAt = now.toISOString();
      reminder.dispatchToken = dispatchToken;
      await writeStoredState(lockState);

      const verifySnapshot = await readStoredState();
      const verifyState = verifySnapshot.state;
      verifyState.publicReminders = normalizePublicReminders(verifyState.publicReminders);
      const verifiedReminder = verifyState.publicReminders.find((entry) => entry.id === item.reminderId) || verifyState.publicReminders[item.reminderIndex];
      if (!verifiedReminder || verifiedReminder.dispatchToken !== dispatchToken || verifiedReminder.status !== "sending") {
        results.push({
          scope: "public",
          reminderId: item.reminderId,
          ok: true,
          skipped: true,
          reason: "公共提醒发送锁已被其他任务占用。",
        });
        continue;
      }
      state = verifyState;
      reminder = verifiedReminder;
    }

    const member = findMember(state, reminder.person);
    let content = buildPublicReminderMessage(reminder);
    const actor = reminder.actor || "WorkPad 管家";
    const baseResult = {
      scope: "public",
      reminderId: reminder.id,
      reminderPerson: reminder.person,
      reminderDate: reminder.date,
    };

    if (!member || !member.wecomUserId) {
      reminder.status = "failed";
      reminder.pending = true;
      reminder.dispatchToken = "";
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = "提醒人还没有绑定企微账号 UserId。";
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      if (!dryRun) {
        appendPushLog(state, {
          content,
          actor,
          receiver: reminder.person,
          success: false,
          source: "公共提醒",
          error: reminder.lastError,
          ...confirmationPayload(reminder, "public", confirmationEnabled),
        });
      }
      results.push({ ...baseResult, ok: false, skipped: true, error: reminder.lastError });
      continue;
    }

    content = withConfirmationLink(content, reminder, confirmationEnabled);

    if (dryRun) {
      results.push({ ...baseResult, ok: true, dryRun: true, toUser: member.wecomUserId });
      continue;
    }

    try {
      await sendAppTextMessage({
        toUser: member.wecomUserId,
        content,
      });
      reminder.pending = false;
      reminder.status = "sent";
      reminder.dispatchToken = "";
      reminder.sentAt = now.toISOString();
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = "";
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      appendPushLog(state, {
        content,
        actor,
        receiver: member.name,
        receiverUserId: member.wecomUserId,
        success: true,
        source: "公共提醒",
        ...confirmationPayload(reminder, "public", confirmationEnabled),
      });
      results.push({ ...baseResult, ok: true, toUser: member.wecomUserId });
    } catch (error) {
      reminder.status = "failed";
      reminder.pending = true;
      reminder.dispatchToken = "";
      reminder.lastAttemptAt = now.toISOString();
      reminder.lastError = error instanceof Error ? error.message : String(error);
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      appendPushLog(state, {
        content,
        actor,
        receiver: member.name,
        receiverUserId: member.wecomUserId,
        success: false,
        source: "公共提醒",
        error: reminder.lastError,
        ...confirmationPayload(reminder, "public", confirmationEnabled),
      });
      results.push({ ...baseResult, ok: false, toUser: member.wecomUserId, error: reminder.lastError });
    }
  }

  if (!dryRun && (dueItems.length || duePublicItems.length)) {
    await writeStoredState(state);
  }

  return {
    ok: true,
    checkedAt: now.toISOString(),
    dueCount: dueItems.length + duePublicItems.length,
    results,
  };
}

module.exports = {
  dispatchDueReminders,
  parseChinaReminderDate,
};
