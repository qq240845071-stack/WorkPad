const { readStoredState, writeStoredState } = require("./store");
const { getConfig } = require("./wecom-crypto");
const { createAudioTranscription, createChatCompletion } = require("./ai-client");
const { appendProjectReminder, appendPublicReminder, normalizeProjectReminders, normalizePublicReminders, syncProjectReminderFields } = require("./reminders");

const MESSAGE_DEDUPE_TTL_MS = 10 * 60 * 1000;
const QUEUED_MESSAGE_RETRY_MS = 10 * 60 * 1000;
const recentMessageKeys = new Map();

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
  const normalized = String(fromUserName || "").trim().toLowerCase();
  return state.teamMembers.find((item) => String(item.wecomUserId || "").toLowerCase() === normalized || item.name === fromUserName)?.name || fromUserName;
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
  const logs = Array.isArray(state.wecomInbox) ? state.wecomInbox : [];
  const existing = logs.find((entry) => entry.messageKey && entry.messageKey === payload.messageKey);
  if (existing) {
    Object.assign(existing, payload);
    state.wecomInbox = [existing, ...logs.filter((entry) => entry !== existing)].slice(0, 200);
    return existing;
  }
  const item = {
    id: `wx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: dateTimeString(nowDate()),
    ...payload,
  };
  state.wecomInbox = [
    item,
    ...logs,
  ].slice(0, 200);
  return item;
}

function shouldStoreIncomingMessage(message) {
  return message.MsgType !== "event";
}

function messageKey(message) {
  return String(message.MsgId || message.MsgID || [message.FromUserName, message.CreateTime, message.MsgType, message.Content || message.MediaId].join(":")).trim();
}

function rememberMessageKey(key) {
  const normalized = String(key || "").trim();
  if (!normalized) return true;
  const now = Date.now();
  for (const [storedKey, timestamp] of recentMessageKeys.entries()) {
    if (now - timestamp > MESSAGE_DEDUPE_TTL_MS) recentMessageKeys.delete(storedKey);
  }
  if (recentMessageKeys.has(normalized)) return false;
  recentMessageKeys.set(normalized, now);
  return true;
}

function updateInboxByKey(state, key, patch) {
  (Array.isArray(state.wecomInbox) ? state.wecomInbox : []).forEach((item) => {
    if (item.messageKey === key) Object.assign(item, patch);
  });
}

function dedupeWecomInbox(state) {
  const inbox = Array.isArray(state.wecomInbox) ? state.wecomInbox : [];
  const seen = new Set();
  let removedCount = 0;
  state.wecomInbox = inbox.filter((item) => {
    const key = String(item.messageKey || "").trim();
    if (!key) return true;
    if (seen.has(key)) {
      removedCount += 1;
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 200);
  return removedCount;
}

function parseStoredTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date : null;
}

function shouldProcessQueuedInboxItem(item, nowMs = Date.now()) {
  if (!item || item.msgType !== "voice" || (!item.mediaId && !item.transcript)) return false;
  if (item.status === "queued") return true;
  if (item.status !== "processing" || item.activeReplySent) return false;
  const startedAt = parseStoredTime(item.processingStartedAtIso || item.processingStartedAt);
  return !startedAt || nowMs - startedAt.getTime() > QUEUED_MESSAGE_RETRY_MS;
}

function friendlyWecomError(payload, fallback) {
  const message = String(payload?.errmsg || payload?.message || fallback || "企业微信接口请求失败。");
  if (payload?.errcode === 60020 || message.includes("not allow to access from your ip")) {
    const ip = message.match(/from ip:\s*([^,，\s]+)/i)?.[1] || "";
    return [
      "企业微信接口被“可信 IP”拦截。",
      ip ? `当前服务器出口 IP：${ip}` : "",
      hasWecomProxyConfig()
        ? "处理办法：当前已启用固定 IP 代理，请把代理服务器的固定公网 IP 加到企业微信自建应用可信 IP / IP 白名单里。"
        : "处理办法：短期可以把这个 IP 加到企业微信自建应用可信 IP / IP 白名单里；长期建议启用 WorkPad 固定 IP 代理。",
      "说明：企业微信获取 access_token、下载语音素材、主动发消息都会触发可信 IP 校验。",
    ].filter(Boolean).join("\n");
  }
  return message;
}

function getWecomProxyConfig() {
  return {
    baseUrl: String(process.env.WECOM_PROXY_BASE_URL || process.env.WECOM_PROXY_URL || "").trim().replace(/\/+$/, ""),
    secret: String(process.env.WECOM_PROXY_SECRET || "").trim(),
  };
}

function hasWecomProxyConfig() {
  const { baseUrl, secret } = getWecomProxyConfig();
  return Boolean(baseUrl && secret);
}

async function requestWecomProxyJson(path, body) {
  const { baseUrl, secret } = getWecomProxyConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error || payload.errcode) {
    throw new Error(friendlyWecomError(payload, `企业微信固定 IP 代理请求失败：${response.status}`));
  }
  return payload;
}

async function requestWecomProxyMedia(message) {
  const { baseUrl, secret } = getWecomProxyConfig();
  const url = new URL(`${baseUrl}/media`);
  url.searchParams.set("mediaId", message.MediaId);
  url.searchParams.set("format", String(message.Format || "amr"));
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${secret}`,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!response.ok || contentType.includes("application/json")) {
    let payload = {};
    try {
      payload = JSON.parse(buffer.toString("utf8"));
    } catch (error) {
      payload = { message: buffer.toString("utf8") };
    }
    throw new Error(friendlyWecomError(payload, `企业微信固定 IP 代理下载语音失败：${response.status}`));
  }
  return {
    audioBuffer: buffer,
    filename: mediaFileName(message),
    contentType: mediaContentType(message, contentType),
  };
}

function projectDigest(project) {
  const reminders = normalizeProjectReminders(project).filter((item) => !["completed", "cancelled"].includes(item.status)).slice(0, 6);
  return [
    `《${project.title}》`,
    `编号：${project.code}`,
    `状态：${project.status}`,
    `节点：${project.currentNode}`,
    `负责人：${project.owner}`,
    reminders.length ? `提醒：${reminders.map((item) => `${item.person} ${item.date} ${item.note}`).join("；")}` : `提醒人：${project.reminderPerson}`,
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
    "7. 公共提醒：提醒 张莹 明天 9:30 参加选题会",
    "8. 修改刚才的提醒：改成今天晚上8点15",
    "也可以直接发语音或自然语言：明天下午三点提醒张莹跟进 BK-2026-005 合同回签",
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

function buildReminderText(project, reminder) {
  return [
    "已记录新的提醒任务：",
    `项目：${project.title}`,
    `状态：${project.status} / ${project.currentNode}`,
    `提醒人：${reminder.person}`,
    `提醒时间：${reminder.date}`,
    reminder.actor ? `发起人：${reminder.actor}` : "",
    reminder.note ? `说明：${reminder.note}` : "",
  ].filter(Boolean).join("\n");
}

function buildPublicReminderText(reminder) {
  return [
    "已记录新的公共提醒：",
    `提醒人：${reminder.person}`,
    `提醒时间：${reminder.date}`,
    reminder.actor ? `发起人：${reminder.actor}` : "",
    reminder.note ? `说明：${reminder.note}` : "",
  ].filter(Boolean).join("\n");
}

function buildUpdatedReminderText(target, reminder, changes) {
  return [
    "已修改提醒任务：",
    target.scope === "project" && target.project ? `项目：${target.project.title}` : "类型：公共提醒",
    target.scope === "project" && target.project ? `状态：${target.project.status} / ${target.project.currentNode}` : "",
    `提醒人：${reminder.person}`,
    changes.oldDate && changes.newDate ? `提醒时间：${changes.oldDate} -> ${changes.newDate}` : `提醒时间：${reminder.date}`,
    changes.oldNote && changes.newNote ? `说明：${changes.oldNote} -> ${changes.newNote}` : reminder.note ? `说明：${reminder.note}` : "",
  ].filter(Boolean).join("\n");
}

function buildReminderRecordNotice(actor, member, reminder) {
  return `${actor} 已通过企业微信记录提醒：${member.name} · ${reminder.date} · ${reminder.note}`;
}

function myRemindersText(state, sender) {
  const member = findMember(state, sender) || findMember(state, actorNameFromMessage(state, sender));
  if (!member) return "当前企微账号还没有在 WorkPad 人员表里建立映射，请先在后台补充企微账号 UserId。";
  const projectList = state.projects.flatMap((project) => normalizeProjectReminders(project)
    .filter((reminder) => reminder.person === member.name && !["completed", "cancelled"].includes(reminder.status) && project.status !== "已完成")
    .map((reminder) => ({ project, reminder })))
    .slice(0, 8);
  const publicList = normalizePublicReminders(state.publicReminders)
    .filter((reminder) => reminder.person === member.name && !["completed", "cancelled"].includes(reminder.status))
    .slice(0, 8);
  if (!projectList.length && !publicList.length) return "你当前没有待处理提醒。";
  return [
    "你当前的待处理提醒：",
    ...projectList.map(({ project, reminder }) => `- ${project.code}《${project.title}》 ${project.status}/${project.currentNode}，提醒时间 ${reminder.date}，事项：${reminder.note}`),
    ...publicList.map((reminder) => `- 公共提醒，提醒时间 ${reminder.date}，事项：${reminder.note}`),
  ].join("\n");
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

function toChinaDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 0;
  return date.getTime();
}

function parseChinaDateTimeValue(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/);
  if (!match) return toChinaDateTime(text);
  const [, year, month, day, hour, minute] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 8, Number(minute), 0, 0);
}

function normalizePeriodHour(hour, period) {
  let nextHour = Number(hour);
  if (["下午", "晚上", "今晚", "明晚"].includes(period) && nextHour < 12) nextHour += 12;
  if (["中午"].includes(period) && nextHour < 11) nextHour += 12;
  return nextHour;
}

function monthDayDate(month, day) {
  const now = nowDate();
  const year = now.getFullYear();
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
}

function parseLooseDateTime(rawText) {
  const text = String(rawText || "").trim().replace(/：/g, ":");
  if (!text) return null;

  const explicitDateTime = text.match(/(\d{4}-\d{1,2}-\d{1,2})\s*(上午|早上|中午|下午|晚上)?\s*(\d{1,2})(?:[:点](\d{1,2}))?/);
  if (explicitDateTime) {
    const [, rawDate, period = "", rawHour, rawMinute = "0"] = explicitDateTime;
    const [year, month, day] = rawDate.split("-");
    const hour = normalizePeriodHour(rawHour, period);
    const minute = Number(rawMinute);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        reminderDate: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        matchedText: explicitDateTime[0],
      };
    }
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?\s*(上午|早上|中午|下午|晚上)?\s*(\d{1,2})(?:[:点](\d{1,2}))?/);
  if (monthDayMatch) {
    const [, month, day, period = "", rawHour, rawMinute = "0"] = monthDayMatch;
    const hour = normalizePeriodHour(rawHour, period);
    const minute = Number(rawMinute);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return {
        reminderDate: `${monthDayDate(month, day)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        matchedText: monthDayMatch[0],
      };
    }
  }

  let date = "";
  let impliedPeriod = "";
  if (/后天/.test(text)) date = dateString(addDays(nowDate(), 2));
  else if (/明天|明早|明晚/.test(text)) date = dateString(addDays(nowDate(), 1));
  else if (/今天|今晚|今早|今上午|今下午|今晚上/.test(text)) date = dateString(nowDate());

  if (/今晚|晚上/.test(text)) impliedPeriod = "晚上";
  else if (/下午/.test(text)) impliedPeriod = "下午";
  else if (/中午/.test(text)) impliedPeriod = "中午";
  else if (/明早|早上|上午/.test(text)) impliedPeriod = "上午";

  const timeMatch = text.match(/(上午|早上|中午|下午|晚上)?\s*(\d{1,2})(?:[:点](\d{1,2}))?/);
  if (!timeMatch) return null;
  const period = timeMatch[1] || impliedPeriod;
  const hour = normalizePeriodHour(timeMatch[2], period);
  const minute = Number(timeMatch[3] || 0);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return {
    reminderDate: `${date || dateString(nowDate())} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    matchedText: timeMatch[0],
  };
}

function parseUpdateReminderCommand(text) {
  const raw = String(text || "").trim();
  if (!/^(改|修改|更改|调整|变更|改成|改为|改到|换成|把)/.test(raw)) return null;
  const parsedDate = parseLooseDateTime(raw);
  if (!parsedDate) return { type: "update-reminder", error: "missing-time", raw };
  const note = raw
    .replace(/^(把)?(刚才|上一个|上一条|那个|这个)?(的)?(提醒|任务)?/, "")
    .replace(/^(改|修改|更改|调整|变更|改成|改为|改到|换成|到)\s*/, "")
    .replace(parsedDate.matchedText, "")
    .replace(/今天|明天|后天|今晚|明早|明晚|今早|今上午|今下午|今晚上|上午|早上|中午|下午|晚上/g, "")
    .replace(/[，,。；;：:]/g, " ")
    .replace(/^(说明|内容|备注)\s*/, "")
    .trim();
  return {
    type: "update-reminder",
    reminderDate: parsedDate.reminderDate,
    note,
    targetHint: raw,
  };
}

function reminderFormatTip() {
  return "提醒需要具体到几点几分。\n订单提醒格式：提醒 陈敏 BK-2026-005 2026-05-20 15:30 催合同回签\n公共提醒格式：提醒 张莹 明天 9:30 参加选题会";
}

function parseCommand(content) {
  const text = String(content || "").trim();
  if (!text) return { type: "empty" };
  if (/^(帮助|help)$/i.test(text)) return { type: "help" };
  if (/^(我的提醒|提醒我)$/i.test(text)) return { type: "my-reminders" };

  const updateMatch = parseUpdateReminderCommand(text);
  if (updateMatch) return updateMatch;

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
    const maybeDate = dateFromToken(remindMatch[2]) || timeFromToken(remindMatch[2]);
    if (maybeDate) {
      const schedule = parseReminderSchedule(`${remindMatch[2]} ${remindMatch[3]}`);
      return {
        type: "public-remind",
        memberKeyword: remindMatch[1].trim(),
        ...schedule,
      };
    }
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

function chinaNowText() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}`;
}

function extractJsonObject(text) {
  const raw = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw error;
  }
}

function projectCandidates(state) {
  return state.projects
    .filter((project) => project.status !== "已完成")
    .slice(0, 60)
    .map((project) => `${project.code}｜${project.title}｜负责人:${project.owner}｜节点:${project.currentNode}`)
    .join("\n");
}

function memberCandidates(state) {
  return state.teamMembers.map((member) => `${member.name}｜${member.role}｜${member.department}`).join("\n");
}

function normalizeAiCommand(payload) {
  const type = String(payload?.type || "unknown").trim();
  if (!["help", "my-reminders", "view", "record", "remind", "public-remind", "update-reminder", "bind", "unknown"].includes(type)) {
    return { type: "unknown", raw: JSON.stringify(payload || {}) };
  }
  const command = {
    type,
    memberKeyword: String(payload.memberKeyword || "").trim(),
    projectKeyword: String(payload.projectKeyword || payload.keyword || "").trim(),
    keyword: String(payload.keyword || payload.projectKeyword || "").trim(),
    reminderDate: String(payload.reminderDate || "").trim(),
    note: String(payload.note || "").trim(),
    targetHint: String(payload.targetHint || "").trim(),
    reason: String(payload.reason || "").trim(),
  };
  if (command.type === "remind") {
    if (!command.memberKeyword) return { type: "unknown", reason: "缺少提醒人" };
    if (!command.projectKeyword) return { type: "unknown", reason: "缺少项目" };
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(command.reminderDate)) return { type: "unknown", reason: "缺少精确到分钟的提醒时间" };
    if (!command.note) return { type: "unknown", reason: "缺少提醒内容" };
  }
  if (command.type === "public-remind") {
    if (!command.memberKeyword) return { type: "unknown", reason: "缺少提醒人" };
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(command.reminderDate)) return { type: "unknown", reason: "缺少精确到分钟的提醒时间" };
    if (!command.note) return { type: "unknown", reason: "缺少提醒内容" };
  }
  if (command.type === "update-reminder") {
    if (!command.reminderDate && !command.note && !command.memberKeyword) return { type: "unknown", reason: "缺少要修改的时间、提醒人或内容" };
    if (command.reminderDate && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(command.reminderDate)) return { type: "unknown", reason: "修改提醒时缺少精确到分钟的提醒时间" };
  }
  if (command.type === "record" && (!command.projectKeyword || !command.note)) return { type: "unknown", reason: "记录指令缺少项目或内容" };
  if (command.type === "view" && !command.keyword) return { type: "unknown", reason: "查看指令缺少项目" };
  if (command.type === "bind" && !command.memberKeyword) return { type: "unknown", reason: "绑定指令缺少人员姓名" };
  return command;
}

async function parseNaturalCommand(content, state, actor) {
  const text = String(content || "").trim();
  if (!text) return { type: "empty" };
  const completion = await createChatCompletion({
    task: "command",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: [
          "你是 WorkPad 订单大看板的企业微信指令解析器，只输出 JSON，不要输出 Markdown。",
          "目标：把员工的自然语言、语音转写文本解析为可执行命令。",
          "可用 type：help、my-reminders、view、record、remind、public-remind、update-reminder、bind、unknown。",
          "remind 是订单提醒，必须输出 memberKeyword、projectKeyword、reminderDate、note。reminderDate 必须是 YYYY-MM-DD HH:mm，必须精确到分钟。",
          "public-remind 是公共提醒，不绑定订单；必须输出 memberKeyword、reminderDate、note，不要输出 projectKeyword。",
          "update-reminder 是修改当前说话人最近创建且未完成的提醒。用户说“改成今天晚上8点15”“把刚才那个提醒改到今晚八点十五”时，输出 update-reminder，并输出 reminderDate。可选输出 note、memberKeyword、projectKeyword、targetHint。",
          "如果用户说“提醒我”，memberKeyword 用当前说话人姓名。",
          "record 必须输出 projectKeyword 和 note。",
          "view 必须输出 keyword 或 projectKeyword。",
          "bind 必须输出 memberKeyword。",
          "项目和人员只能从候选列表里选，项目优先输出项目编号。",
          "如果用户要提醒某人做事但没有明确订单、项目编号或书名，优先输出 type=public-remind。",
          "如果没有明确时间或人员，不要猜，输出 type=unknown 并写 reason。",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `当前北京时间：${chinaNowText()}`,
          `当前说话人：${actor}`,
          "人员候选：",
          memberCandidates(state),
          "项目候选：",
          projectCandidates(state),
          "用户输入：",
          text,
          "请输出 JSON，订单提醒示例：{\"type\":\"remind\",\"memberKeyword\":\"张莹\",\"projectKeyword\":\"BK-2026-005\",\"reminderDate\":\"2026-05-20 15:30\",\"note\":\"催合同回签\"}",
          "公共提醒示例：{\"type\":\"public-remind\",\"memberKeyword\":\"张莹\",\"reminderDate\":\"2026-05-20 09:30\",\"note\":\"参加选题会\"}",
          "修改提醒示例：{\"type\":\"update-reminder\",\"reminderDate\":\"2026-05-20 20:15\",\"targetHint\":\"刚才那个提醒\"}",
        ].join("\n"),
      },
    ],
  });
  return normalizeAiCommand(extractJsonObject(completion.reply));
}

function reminderActivityTime(reminder) {
  return Math.max(
    parseChinaDateTimeValue(reminder.updatedAt),
    parseChinaDateTimeValue(reminder.recordAt),
    parseChinaDateTimeValue(reminder.createdAt),
    0,
  );
}

function activeReminderForUpdate(reminder) {
  return !["completed", "cancelled"].includes(String(reminder.status || "").trim());
}

function sameText(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function collectReminderTargets(state, command, actor) {
  const projectFilter = command.projectKeyword ? findProject(state, command.projectKeyword) : null;
  const memberFilter = command.memberKeyword ? findMember(state, command.memberKeyword) : null;
  const personFilter = memberFilter?.name || command.memberKeyword || "";
  const targets = [];

  if (command.projectKeyword && !projectFilter) {
    return { error: `没有找到项目「${command.projectKeyword}」。`, targets: [] };
  }

  for (const project of Array.isArray(state.projects) ? state.projects : []) {
    if (projectFilter && project.id !== projectFilter.id) continue;
    project.reminders = normalizeProjectReminders(project);
    project.reminders.forEach((reminder, index) => {
      if (!activeReminderForUpdate(reminder)) return;
      if (personFilter && reminder.person !== personFilter) return;
      targets.push({
        scope: "project",
        project,
        reminder,
        index,
        actorMatched: sameText(reminder.actor, actor),
        activityTime: reminderActivityTime(reminder),
      });
    });
  }

  state.publicReminders = normalizePublicReminders(state.publicReminders);
  state.publicReminders.forEach((reminder, index) => {
    if (!activeReminderForUpdate(reminder)) return;
    if (personFilter && reminder.person !== personFilter) return;
    targets.push({
      scope: "public",
      reminder,
      index,
      actorMatched: sameText(reminder.actor, actor),
      activityTime: reminderActivityTime(reminder),
    });
  });

  const actorTargets = targets.filter((target) => target.actorMatched);
  return {
    targets: (actorTargets.length ? actorTargets : targets)
      .sort((left, right) => right.activityTime - left.activityTime),
  };
}

function updateReminderByCommand(state, command, actor) {
  if (command.error) {
    return {
      ok: false,
      reason: "修改提醒需要写清楚新的时间，且要精确到分钟。例如：改成今天晚上8点15。",
    };
  }

  const member = command.memberKeyword ? findMember(state, command.memberKeyword) : null;
  if (command.memberKeyword && !member) {
    return { ok: false, reason: `没有找到人员「${command.memberKeyword}」。` };
  }

  const { error, targets } = collectReminderTargets(state, command, actor);
  if (error) return { ok: false, reason: error };
  if (!targets.length) {
    return {
      ok: false,
      reason: "没有找到可修改的提醒。你可以先创建一条提醒，或在修改时带上项目/提醒人。",
    };
  }

  const target = targets[0];
  const reminder = target.reminder;
  const changes = {
    oldDate: reminder.date,
    oldNote: reminder.note,
    oldPerson: reminder.person,
    newDate: command.reminderDate || reminder.date,
    newNote: command.note || reminder.note,
    newPerson: member?.name || reminder.person,
  };

  if (command.reminderDate) reminder.date = command.reminderDate;
  if (command.note) reminder.note = command.note;
  if (member) reminder.person = member.name;
  reminder.status = "pending";
  reminder.pending = true;
  reminder.sentAt = "";
  reminder.lastAttemptAt = "";
  reminder.lastError = "";
  reminder.attempts = 0;
  reminder.updatedAt = dateTimeString(nowDate());
  reminder.updatedBy = actor;

  if (target.scope === "project" && target.project) {
    target.project.nextAction = reminder.note || target.project.nextAction;
    target.project.reminderRecordNotice = `${actor} 已通过企业微信修改提醒：${reminder.person} · ${reminder.date} · ${reminder.note}`;
    target.project.logs = [
      { time: dateTimeString(nowDate()), actor, action: "企业微信修改提醒", detail: `提醒修改为：${reminder.person} · ${reminder.date} · ${reminder.note}` },
      ...(Array.isArray(target.project.logs) ? target.project.logs : []),
    ].slice(0, 100);
    syncProjectReminderFields(target.project);
  } else {
    state.publicReminders = normalizePublicReminders(state.publicReminders);
  }

  return {
    ok: true,
    target,
    reminder,
    changes,
  };
}

async function resolveCommand(content, state, actor, options = {}) {
  const direct = parseCommand(content);
  const shouldAskAi = options.preferAi || direct.type === "unknown" || direct.type === "empty" || Boolean(direct.error);
  if (!shouldAskAi) return { command: direct, source: "rule" };
  try {
    const aiCommand = await parseNaturalCommand(content, state, actor);
    if (aiCommand.type !== "unknown" && aiCommand.type !== "empty") {
      return { command: aiCommand, source: "ai" };
    }
  } catch (error) {
    return { command: direct, source: "rule", parseError: error instanceof Error ? error.message : String(error) };
  }
  return { command: direct, source: "rule" };
}

function mediaFileName(message) {
  const format = String(message.Format || "amr").replace(/[^a-z0-9]/gi, "").toLowerCase() || "amr";
  return `wecom-voice-${message.MsgId || Date.now()}.${format}`;
}

function mediaContentType(message, responseContentType) {
  const format = String(message.Format || "").toLowerCase();
  if (responseContentType && !responseContentType.includes("application/json")) return responseContentType;
  if (format === "amr") return "audio/amr";
  if (format === "speex") return "audio/speex";
  if (format === "mp3") return "audio/mpeg";
  if (format === "wav") return "audio/wav";
  return "application/octet-stream";
}

async function fetchWecomMedia(message) {
  if (!message.MediaId) throw new Error("语音消息里没有 MediaId，无法下载语音。");
  if (hasWecomProxyConfig()) return requestWecomProxyMedia(message);
  const accessToken = await fetchAccessToken();
  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/media/get");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("media_id", message.MediaId);
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!response.ok || contentType.includes("application/json")) {
    const text = buffer.toString("utf8");
    let payload = {};
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = { errmsg: text };
    }
    throw new Error(payload.errmsg || `下载企业微信语音失败：${response.status}`);
  }
  return {
    audioBuffer: buffer,
    filename: mediaFileName(message),
    contentType: mediaContentType(message, contentType),
  };
}

async function transcribeVoiceMessage(message) {
  const recognition = String(message.Recognition || "").trim();
  if (recognition) return { text: recognition, source: "wecom-recognition" };
  const media = await fetchWecomMedia(message);
  const result = await createAudioTranscription({
    ...media,
    prompt: "这是出版订单管理场景下的企业微信语音指令，可能包含项目编号、人员姓名、日期、时间和提醒内容。",
  });
  return { text: result.text, source: "ai-transcription", model: result.model, providerName: result.providerName };
}

async function handleIncomingMessage(message, options = {}) {
  const key = messageKey(message);
  const firstSeenInProcess = rememberMessageKey(key);
  const snapshot = await readStoredState();
  const state = snapshot.state;
  const actor = actorNameFromMessage(state, message.FromUserName);
  const existingInbox = (Array.isArray(state.wecomInbox) ? state.wecomInbox : []).find((item) => item.messageKey === key);

  if (!firstSeenInProcess && !options.reprocessExisting) {
    return { replyText: "", snapshot };
  }

  if (existingInbox && !options.reprocessExisting) {
    return { replyText: "", snapshot };
  }

  if (message.MsgType === "event") {
    return { replyText: "", snapshot };
  }

  let content = String(message.Content || "").trim();
  let transcript = null;

  if (shouldStoreIncomingMessage(message) && !existingInbox) {
    const recognition = String(message.Recognition || "").trim();
    pushInbox(state, {
      messageKey: key,
      direction: "inbound",
      fromUserId: message.FromUserName,
      actor,
      msgType: message.MsgType,
      event: message.Event || "",
      mediaId: message.MediaId || "",
      format: message.Format || "",
      content: content || recognition || (message.MsgType === "voice" ? "[语音待识别]" : ""),
      transcript: recognition,
      transcriptSource: recognition ? "wecom-recognition" : "",
      status: message.MsgType === "voice" ? "queued" : "received",
    });
    await writeStoredState(state);
  }

  async function saveWithReply(replyText, extra = {}, replyStatus = "done") {
    updateInboxByKey(state, key, {
      replyText,
      status: replyStatus,
      content,
      transcript: transcript?.text || "",
      transcriptSource: transcript?.source || "",
    });
    if (options.forceActiveReply || replyText.startsWith("您发布的")) {
      let saved = await writeStoredState(state);
      try {
        await sendAppTextMessage({ toUser: message.FromUserName, content: replyText });
        updateInboxByKey(state, key, {
          activeReplySent: true,
          activeReplySentAt: dateTimeString(nowDate()),
        });
        saved = await writeStoredState(state);
        return { replyText: "", snapshot: saved, activeReplySent: true, ...extra };
      } catch (error) {
        const activeReplyError = error instanceof Error ? error.message : String(error);
        updateInboxByKey(state, key, {
          activeReplyError,
        });
        saved = await writeStoredState(state);
      }
    }
    const saved = await writeStoredState(state);
    return { replyText, snapshot: saved, ...extra };
  }

  if (message.MsgType === "voice") {
    if (!options.reprocessExisting) {
      const recognition = String(message.Recognition || "").trim();
      const replyText = recognition
        ? "已收到语音，已经拿到转文字结果，正在解析命令。处理完成后，我会再主动给你发送成功或失败结果。"
        : "已收到语音，正在转文字和解析。处理完成后，我会再主动给你发送成功或失败结果。";
      updateInboxByKey(state, key, {
        replyText,
        status: "queued",
        content: recognition || "[语音已入队]",
        transcript: recognition,
        transcriptSource: recognition ? "wecom-recognition" : "",
      });
      const saved = await writeStoredState(state);
      return { replyText, snapshot: saved, queued: true };
    }
    try {
      transcript = await transcribeVoiceMessage(message);
      content = transcript.text;
      updateInboxByKey(state, key, {
        content,
        transcript: transcript.text,
        transcriptSource: transcript.source,
        status: "transcribed",
      });
    } catch (error) {
      const replyText = `收到语音，但转文字失败：${error instanceof Error ? error.message : String(error)}\n可以先改发文字，例如：明天下午三点提醒张莹跟进 BK-2026-005 合同回签。`;
      content = "[语音转文字失败]";
      updateInboxByKey(state, key, { replyText, status: "failed", content: "[语音转文字失败]" });
      return saveWithReply(replyText, {}, "failed");
    }
  } else if (message.MsgType !== "text") {
    const replyText = "当前先支持文本和语音指令。你可以发送“帮助”查看可用命令。";
    updateInboxByKey(state, key, { replyText, status: "unsupported" });
    const saved = await writeStoredState(state);
    return { replyText, snapshot: saved };
  }

  const { command, source, parseError } = await resolveCommand(content, state, actor, { preferAi: message.MsgType === "voice" });

  if (command.type === "help") {
    return saveWithReply(helpText());
  }

  if (command.type === "unknown" || command.type === "empty") {
    const heardText = message.MsgType === "voice" ? `\n我听到的是：${content}` : "";
    const reason = parseError ? `自然语言解析暂时不可用：${parseError}` : command.reason || "没有识别到可执行指令。";
    return saveWithReply(`您发布的命令不成功。\n原因：${reason}\n你可以发送“帮助”查看可用命令，或直接说：明天下午三点提醒张莹跟进 BK-2026-005 合同回签。${heardText}`);
  }

  if (command.type === "my-reminders") {
    const replyText = myRemindersText(state, message.FromUserName);
    const ok = !replyText.includes("还没有在 WorkPad 人员表里建立映射");
    return saveWithReply(ok ? `您发布的我的提醒命令成功。\n\n${replyText}` : `您发布的我的提醒命令不成功。\n原因：${replyText}`);
  }

  if (command.type === "bind") {
    const replyText = bindMemberText(state, message.FromUserName, command.memberKeyword);
    const ok = !replyText.includes("没有找到人员");
    return saveWithReply(ok ? `您发布的绑定命令成功。\n${replyText}` : `您发布的绑定命令不成功。\n原因：${replyText}`);
  }

  if (command.type === "view") {
    const keyword = command.keyword || command.projectKeyword;
    const project = findProject(state, keyword);
    if (!project) return saveWithReply(`您发布的查看命令不成功。\n原因：没有找到项目「${keyword}」，可以直接发项目编号试试。`);
    return saveWithReply(`您发布的查看命令成功。\n\n${projectDigest(project)}`);
  }

  if (command.type === "record") {
    const project = findProject(state, command.projectKeyword);
    if (!project) {
      return saveWithReply(`您发布的记录命令不成功。\n原因：没有找到项目「${command.projectKeyword}」。`);
    }
    updateProjectFollowUp(project, actor, command.note, command.note, "企业微信记录");
    return saveWithReply(`您发布的记录命令成功。\n已记录到《${project.title}》。\n当前下一步：${project.nextAction}`, { changedProject: project });
  }

  if (command.type === "update-reminder") {
    const result = updateReminderByCommand(state, command, actor);
    if (!result.ok) {
      return saveWithReply(`您发布的修改提醒命令不成功。\n原因：${result.reason}`);
    }
    const sourceTip = source === "ai" ? "已按自然语言解析并修改提醒。" : "";
    const transcriptTip = transcript?.text ? `语音识别：${transcript.text}` : "";
    const replyText = ["您发布的修改提醒命令成功。", sourceTip, transcriptTip, buildUpdatedReminderText(result.target, result.reminder, result.changes)].filter(Boolean).join("\n\n");
    return saveWithReply(replyText, result.target.scope === "project" ? { changedProject: result.target.project } : {});
  }

  if (command.type === "public-remind") {
    if (command.error) {
      const missingNote = command.error === "missing-note" ? "\n另外需要补充提醒内容，比如“参加选题会”。" : "";
      return saveWithReply(`您发布的公共提醒命令不成功。\n原因：提醒格式不完整，需要包含提醒人、精确到分钟的时间和提醒内容。\n${reminderFormatTip()}${missingNote}`);
    }
    const member = findMember(state, command.memberKeyword);
    if (!member) {
      return saveWithReply(`您发布的公共提醒命令不成功。\n原因：没有找到人员「${command.memberKeyword}」，请先确认后台人员名称一致。`);
    }
    const reminder = appendPublicReminder(state, {
      person: member.name,
      date: command.reminderDate,
      note: command.note,
      actor,
      source: "企业微信",
      recordAt: dateTimeString(nowDate()),
    });
    const sourceTip = source === "ai" ? "已按自然语言解析并写入公共提醒。" : "";
    const transcriptTip = transcript?.text ? `语音识别：${transcript.text}` : "";
    const replyText = ["您发布的公共提醒命令成功。", sourceTip, transcriptTip, buildPublicReminderText(reminder)].filter(Boolean).join("\n\n");
    return saveWithReply(replyText, { targetMember: member });
  }

  if (command.type === "remind") {
    if (command.error) {
      const missingNote = command.error === "missing-note" ? "\n另外需要补充提醒内容，比如“催合同回签”。" : "";
      return saveWithReply(`您发布的提醒命令不成功。\n原因：提醒格式不完整，需要包含提醒人、项目、精确到分钟的时间和提醒内容。\n${reminderFormatTip()}${missingNote}`);
    }
    const member = findMember(state, command.memberKeyword);
    const project = findProject(state, command.projectKeyword);
    if (!member) {
      return saveWithReply(`您发布的提醒命令不成功。\n原因：没有找到人员「${command.memberKeyword}」，请先确认后台人员名称一致。`);
    }
    if (!project) {
      return saveWithReply(`您发布的提醒命令不成功。\n原因：没有找到项目「${command.projectKeyword}」，这次提醒没有写入。`);
    }
    const reminder = appendProjectReminder(project, {
      person: member.name,
      date: command.reminderDate,
      note: command.note,
      actor,
      source: "企业微信",
      recordAt: dateTimeString(nowDate()),
    });
    project.nextAction = command.note || project.nextAction;
    project.reminderRecordNotice = buildReminderRecordNotice(actor, member, reminder);
    updateProjectFollowUp(project, actor, `提醒 ${member.name}：${command.note}`, command.note, "企业微信提醒");
    const sourceTip = source === "ai" ? "已按自然语言解析并写入提醒。" : "";
    const transcriptTip = transcript?.text ? `语音识别：${transcript.text}` : "";
    const replyText = ["您发布的提醒命令成功。", sourceTip, transcriptTip, buildReminderText(project, reminder)].filter(Boolean).join("\n\n");
    return saveWithReply(replyText, { changedProject: project, targetMember: member });
  }

  return saveWithReply(helpText());
}

async function processQueuedWecomMessages({ limit = 3, dryRun = false } = {}) {
  const snapshot = await readStoredState();
  const state = snapshot.state;
  const dedupedCount = dedupeWecomInbox(state);
  const inbox = Array.isArray(state.wecomInbox) ? state.wecomInbox : [];
  const nowMs = Date.now();
  const candidates = inbox
    .filter((item) => shouldProcessQueuedInboxItem(item, nowMs))
    .slice(0, Math.max(1, Number(limit) || 3));
  const results = [];

  if (dryRun) {
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      dedupedCount,
      queuedCount: candidates.length,
      processedCount: 0,
      results: candidates.map((item) => ({
        ok: true,
        dryRun: true,
        messageKey: item.messageKey,
        actor: item.actor,
        status: item.status,
      })),
    };
  }

  if (dedupedCount > 0) {
    await writeStoredState(state);
  }

  for (const item of candidates) {
    const processingToken = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const lockSnapshot = await readStoredState();
    const lockState = lockSnapshot.state;
    const latestItem = (Array.isArray(lockState.wecomInbox) ? lockState.wecomInbox : []).find((entry) => entry.messageKey === item.messageKey);
    if (!shouldProcessQueuedInboxItem(latestItem)) {
      results.push({
        ok: true,
        skipped: true,
        reason: "消息正在处理中或已经处理完成。",
        messageKey: item.messageKey,
        actor: item.actor,
      });
      continue;
    }

    updateInboxByKey(lockState, item.messageKey, {
      status: "processing",
      processingToken,
      processingStartedAt: dateTimeString(nowDate()),
      processingStartedAtIso: new Date().toISOString(),
    });
    await writeStoredState(lockState);

    const verifySnapshot = await readStoredState();
    const verifyState = verifySnapshot.state;
    const lockedItem = (Array.isArray(verifyState.wecomInbox) ? verifyState.wecomInbox : []).find((entry) => entry.messageKey === item.messageKey);
    if (!lockedItem || lockedItem.processingToken !== processingToken || lockedItem.status !== "processing") {
      results.push({
        ok: true,
        skipped: true,
        reason: "消息处理锁已被其他任务占用。",
        messageKey: item.messageKey,
        actor: item.actor,
      });
      continue;
    }

    try {
      const result = await handleIncomingMessage({
        MsgType: "voice",
        FromUserName: item.fromUserId,
        MediaId: item.mediaId,
        MsgId: item.messageKey,
        Format: item.format || "amr",
        Recognition: item.transcript || "",
      }, {
        reprocessExisting: true,
        forceActiveReply: true,
      });
      results.push({
        ok: true,
        messageKey: item.messageKey,
        actor: item.actor,
        activeReplySent: Boolean(result.activeReplySent),
      });
    } catch (error) {
      const latestSnapshot = await readStoredState();
      const latestState = latestSnapshot.state;
      const message = error instanceof Error ? error.message : String(error);
      updateInboxByKey(latestState, item.messageKey, {
        status: "failed",
        processingToken: "",
        replyText: `语音命令处理失败：${message}`,
        activeReplyError: message,
      });
      await writeStoredState(latestState);
      results.push({
        ok: false,
        messageKey: item.messageKey,
        actor: item.actor,
        error: message,
      });
    }
  }

  return {
    ok: results.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    dedupedCount,
    queuedCount: candidates.length,
    processedCount: results.length,
    results,
  };
}

async function fetchAccessToken() {
  if (hasWecomProxyConfig()) {
    const result = await requestWecomProxyJson("/token", {});
    if (!result.access_token) throw new Error("固定 IP 代理没有返回企业微信 access_token。");
    return result.access_token;
  }
  const { corpId, appSecret } = getConfig();
  const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
  url.searchParams.set("corpid", corpId);
  url.searchParams.set("corpsecret", appSecret);
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok || json.errcode) {
    throw new Error(friendlyWecomError(json, "获取企业微信 access_token 失败。"));
  }
  return json.access_token;
}

async function sendAppTextMessage({ toUser, content }) {
  if (hasWecomProxyConfig()) {
    return requestWecomProxyJson("/send-text", { toUser, content });
  }
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
      enable_duplicate_check: 1,
      duplicate_check_interval: 1800,
    }),
  });
  const json = await response.json();
  if (!response.ok || json.errcode) {
    throw new Error(friendlyWecomError(json, "发送企业微信应用消息失败。"));
  }
  return json;
}

module.exports = {
  handleIncomingMessage,
  processQueuedWecomMessages,
  sendAppTextMessage,
  hasWecomProxyConfig,
  findMember,
  findProject,
  projectDigest,
};
