const { readStoredState, writeStoredState } = require("./store");
const { getConfig } = require("./wecom-crypto");

function nowDate() {
  return new Date();
}

function dateString(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateTimeString(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function actorNameFromMessage(state, fromUserName) {
  return state.teamMembers.find((item) => item.wecomUserId === fromUserName || item.name === fromUserName)?.name || fromUserName;
}

function findMember(state, keyword) {
  const normalized = String(keyword || "").trim().toLowerCase();
  return state.teamMembers.find((item) => {
    return item.name === keyword || String(item.wecomUserId || "").toLowerCase() === normalized;
  });
}

function findProject(state, keyword) {
  const normalized = String(keyword || "").trim().toLowerCase();
  return state.projects.find((item) => item.code.toLowerCase() === normalized)
    || state.projects.find((item) => item.title === keyword)
    || state.projects.find((item) => item.title.toLowerCase().includes(normalized));
}

function pushInbox(state, payload) {
  state.wecomInbox = [
    {
      id: `wx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: dateTimeString(nowDate()),
      ...payload,
    },
    ...(Array.isArray(state.wecomInbox) ? state.wecomInbox : []),
  ].slice(0, 200);
}

function shouldStoreIncomingMessage(message) {
  return !(message.MsgType === "event" && message.Event === "LOCATION");
}

function hasRecentEnterAgentEvent(state, sender) {
  const recentWindowMs = 10 * 60 * 1000;
  const now = nowDate().getTime();
  return (Array.isArray(state.wecomInbox) ? state.wecomInbox : []).some((item) => {
    if (item.fromUserId !== sender || item.msgType !== "event" || item.event !== "enter_agent") return false;
    const createdAt = new Date(String(item.createdAt || "").replace(" ", "T")).getTime();
    return Number.isFinite(createdAt) && now - createdAt <= recentWindowMs;
  });
}

function projectDigest(project) {
  return [
    `《${project.title}》`,
    `编号：${project.code}`,
    `状态：${project.status}`,
    `节点：${project.currentNode}`,
    `负责人：${project.owner}`,
    `提醒人：${project.reminderPerson}`,
    `提醒时间：${project.reminderDate}`,
    `下一步：${project.nextAction}`,
  ].join("\n");
}

function helpText() {
  return [
    "WorkPad 管家可识别这些指令：",
    "1. 帮助",
    "2. 查看 BK-2026-001",
    "3. 记录 BK-2026-001 作者已回稿，准备二校",
    "4. 提醒 陈敏 BK-2026-005 2026-05-20 15:30 催合同回签",
    "5. 我的提醒",
    "6. 绑定 贾涛",
  ].join("\n");
}

function updateProjectFollowUp(project, actor, progress, nextAction, detailAction = "企业微信记录") {
  const now = nowDate();
  project.updatedAt = dateTimeString(now);
  project.nextAction = nextAction || project.nextAction;
  project.followUps = [
    { time: dateTimeString(now), user: actor, progress, nextAction: project.nextAction || "待补充下一步动作" },
    ...(Array.isArray(project.followUps) ? project.followUps : []),
  ].slice(0, 50);
  project.logs = [
    { time: dateTimeString(now), actor, action: detailAction, detail: progress },
    ...(Array.isArray(project.logs) ? project.logs : []),
  ].slice(0, 100);
}

function buildReminderText(project, note) {
  return [
    "已记录新的提醒任务：",
    `项目：${project.title}`,
    `状态：${project.status} / ${project.currentNode}`,
    `提醒人：${project.reminderPerson}`,
    `提醒时间：${project.reminderDate}`,
    note ? `说明：${note}` : "",
  ].filter(Boolean).join("\n");
}

function myRemindersText(state, sender) {
  const member = findMember(state, sender) || findMember(state, actorNameFromMessage(state, sender));
  if (!member) return "当前企微账号还没有在 WorkPad 人员表里建立映射，请先在后台补充企微账号 UserId。";
  const list = state.projects.filter((item) => item.reminderPerson === member.name && item.status !== "已完成").slice(0, 5);
  if (!list.length) return "你当前没有待处理提醒。";
  return ["你当前的待提醒项目：", ...list.map((project) => `- ${project.code}《${project.title}》 ${project.status}/${project.currentNode}，提醒时间 ${project.reminderDate}`)].join("\n");
}

function bindMemberText(state, sender, memberKeyword) {
  const member = findMember(state, memberKeyword);
  if (!member) {
    return `没有找到人员「${memberKeyword}」，请先确认后台人员名称一致。`;
  }

  if (member.wecomUserId === sender) {
    return `已确认绑定成功：${member.name} -> ${sender}`;
  }

  if (member.wecomUserId && member.wecomUserId !== sender) {
    return `人员「${member.name}」当前已绑定企微账号 ${member.wecomUserId}，请先在后台确认后再改绑。`;
  }

  const previousMember = state.teamMembers.find((item) => item.wecomUserId === sender);
  if (previousMember && previousMember.id !== member.id) {
    previousMember.wecomUserId = "";
  }

  member.wecomUserId = sender;
  return `已绑定成功：${member.name} -> ${sender}\n现在你可以直接发送“我的提醒”查看和自己相关的项目。`;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function dateFromToken(token) {
  const value = String(token || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value === "今天") return dateString(nowDate());
  if (value === "明天") return dateString(addDays(nowDate(), 1));
  if (value === "后天") return dateString(addDays(nowDate(), 2));
  return "";
}

function timeFromToken(token) {
  const value = String(token || "").trim().replace("：", ":");
  let match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  let period = "";
  let hourIndex = 1;
  let minuteIndex = 2;
  if (!match) {
    match = value.match(/^(上午|早上|中午|下午|晚上)?(\d{1,2})点(?:(\d{1,2})分?)?$/);
    period = match ? match[1] || "" : "";
    hourIndex = 2;
    minuteIndex = 3;
  }
  if (!match) return "";

  let hour = Number(match[hourIndex]);
  const minute = Number(match[minuteIndex] || 0);
  if (["下午", "晚上"].includes(period) && hour < 12) hour += 12;
  if (period === "中午" && hour < 11) hour += 12;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseReminderSchedule(rawText) {
  const parts = String(rawText || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { error: "missing-time", note: "" };

  let date = dateFromToken(parts[0]);
  let time = "";
  let consumed = date ? 1 : 0;

  time = timeFromToken(parts[consumed]);
  if (time) {
    consumed += 1;
  } else if (!date) {
    time = timeFromToken(parts[0]);
    if (time) {
      date = dateString(nowDate());
      consumed = 1;
    }
  }

  const note = parts.slice(consumed).join(" ").trim();
  if (!time) return { error: "missing-time", note: String(rawText || "").trim() };
  if (!date) date = dateString(nowDate());
  if (!note) return { error: "missing-note", note: "" };

  return { reminderDate: `${date} ${time}`, note };
}

function reminderFormatTip() {
  return "提醒需要具体到几点几分。\n格式：提醒 陈敏 BK-2026-005 2026-05-20 15:30 催合同回签\n也可以写：提醒 陈敏 BK-2026-005 明天 9:30 催合同回签";
}

function parseCommand(content) {
  const text = String(content || "").trim();
  if (!text) return { type: "empty" };
  if (/^(帮助|help)$/i.test(text)) return { type: "help" };
  if (/^(我的提醒|提醒我)$/i.test(text)) return { type: "my-reminders" };

  const bindMatch = text.match(/^绑定\s+(\S+)$/);
  if (bindMatch) {
    return { type: "bind", memberKeyword: bindMatch[1].trim() };
  }

  const viewMatch = text.match(/^(查看|查询)\s+(.+)$/);
  if (viewMatch) {
    return { type: "view", keyword: viewMatch[2].trim() };
  }

  const recordMatch = text.match(/^记录\s+(\S+)\s+([\s\S]+)$/);
  if (recordMatch) {
    return { type: "record", projectKeyword: recordMatch[1].trim(), note: recordMatch[2].trim() };
  }

  const remindMatch = text.match(/^提醒\s+(\S+)\s+(\S+)\s+([\s\S]+)$/);
  if (remindMatch) {
    const schedule = parseReminderSchedule(remindMatch[3]);
    return {
      type: "remind",
      memberKeyword: remindMatch[1].trim(),
      projectKeyword: remindMatch[2].trim(),
      ...schedule,
    };
  }

  return { type: "unknown", raw: text };
}

async function handleIncomingMessage(message) {
  const snapshot = await readStoredState();
  const state = snapshot.state;
  const actor = actorNameFromMessage(state, message.FromUserName);
  const content = String(message.Content || "").trim();
  const alreadyEnteredRecently = hasRecentEnterAgentEvent(state, message.FromUserName);

  if (shouldStoreIncomingMessage(message)) {
    pushInbox(state, {
      direction: "inbound",
      fromUserId: message.FromUserName,
      actor,
      msgType: message.MsgType,
      event: message.Event || "",
      content,
    });
  }

  if (message.MsgType === "event" && message.Event === "enter_agent") {
    const saved = await writeStoredState(state);
    return { replyText: alreadyEnteredRecently ? "" : helpText(), snapshot: saved };
  }

  if (message.MsgType === "event") {
    const saved = await writeStoredState(state);
    return { replyText: "", snapshot: saved };
  }

  if (message.MsgType !== "text") {
    const saved = await writeStoredState(state);
    return { replyText: "当前先支持文本指令。你可以发送“帮助”查看可用命令。", snapshot: saved };
  }

  const command = parseCommand(content);

  if (command.type === "help" || command.type === "unknown" || command.type === "empty") {
    const saved = await writeStoredState(state);
    return { replyText: helpText(), snapshot: saved };
  }

  if (command.type === "my-reminders") {
    const saved = await writeStoredState(state);
    return { replyText: myRemindersText(state, message.FromUserName), snapshot: saved };
  }

  if (command.type === "bind") {
    const replyText = bindMemberText(state, message.FromUserName, command.memberKeyword);
    const saved = await writeStoredState(state);
    return { replyText, snapshot: saved };
  }

  if (command.type === "view") {
    const project = findProject(state, command.keyword);
    const saved = await writeStoredState(state);
    if (!project) return { replyText: `没有找到项目「${command.keyword}」，可以直接发项目编号试试。`, snapshot: saved };
    return { replyText: projectDigest(project), snapshot: saved };
  }

  if (command.type === "record") {
    const project = findProject(state, command.projectKeyword);
    if (!project) {
      const saved = await writeStoredState(state);
      return { replyText: `没有找到项目「${command.projectKeyword}」，这次记录没有写入。`, snapshot: saved };
    }
    updateProjectFollowUp(project, actor, command.note, command.note, "企业微信记录");
    const saved = await writeStoredState(state);
    return { replyText: `已记录到《${project.title}》。\n当前下一步：${project.nextAction}`, snapshot: saved, changedProject: project };
  }

  if (command.type === "remind") {
    if (command.error) {
      const saved = await writeStoredState(state);
      const missingNote = command.error === "missing-note" ? "\n另外需要补充提醒内容，比如“催合同回签”。" : "";
      return { replyText: `${reminderFormatTip()}${missingNote}`, snapshot: saved };
    }
    const member = findMember(state, command.memberKeyword);
    const project = findProject(state, command.projectKeyword);
    if (!member) {
      const saved = await writeStoredState(state);
      return { replyText: `没有找到人员「${command.memberKeyword}」，请先在后台人员录入里补企微账号。`, snapshot: saved };
    }
    if (!project) {
      const saved = await writeStoredState(state);
      return { replyText: `没有找到项目「${command.projectKeyword}」，这次提醒没有写入。`, snapshot: saved };
    }
    project.reminderPerson = member.name;
    project.reminderDate = command.reminderDate;
    project.nextAction = command.note || project.nextAction;
    updateProjectFollowUp(project, actor, `提醒 ${member.name}：${command.note}`, command.note, "企业微信提醒");
    const saved = await writeStoredState(state);
    return { replyText: buildReminderText(project, command.note), snapshot: saved, changedProject: project, targetMember: member };
  }

  const saved = await writeStoredState(state);
  return { replyText: helpText(), snapshot: saved };
}

async function fetchAccessToken() {
  const { corpId, appSecret } = getConfig();
  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
  url.searchParams.set("corpid", corpId);
  url.searchParams.set("corpsecret", appSecret);
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.errcode) {
    throw new Error(json.errmsg || "获取企业微信 access_token 失败。");
  }
  return json.access_token;
}

async function sendAppTextMessage({ toUser, content }) {
  const { agentId } = getConfig();
  const accessToken = await fetchAccessToken();
  const response = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      touser: toUser,
      msgtype: "text",
      agentid: Number(agentId),
      text: { content },
      safe: 0,
      enable_duplicate_check: 0,
    }),
  });
  const json = await response.json();
  if (!response.ok || json.errcode) {
    throw new Error(json.errmsg || "发送企业微信应用消息失败。");
  }
  return json;
}

module.exports = {
  handleIncomingMessage,
  sendAppTextMessage,
  findMember,
  findProject,
  projectDigest,
};
