const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  createDefaultState,
  DEFAULT_DEPARTMENTS,
  DEFAULT_ROLES,
  DEFAULT_PARTNERS,
  DEFAULT_BUSINESS_LINES,
  DEFAULT_BUSINESS_LINE_ID,
  ROLE_PERMISSION_ROWS,
} = require("./demo-state");
const { normalizeProjectReminders, normalizePublicReminders, syncProjectReminderFields } = require("./reminders");

const BLOB_PATHNAME = "workpad/state.json";

function nowIso() {
  return new Date().toISOString();
}

function deploymentVersion() {
  return String(process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || process.env.NODE_ENV || "local").trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function textValue(value) {
  return String(value ?? "").trim();
}

function sortZh(values) {
  return values.sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function uniqueText(values) {
  return sortZh([...new Set(values.map(textValue).filter(Boolean))]);
}

function recordId(prefix, value) {
  const raw = textValue(value);
  const ascii = raw.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (ascii) return `${prefix}-${ascii}`;
  const encoded = Array.from(raw || String(Date.now()))
    .map((char) => char.charCodeAt(0).toString(36))
    .join("")
    .slice(0, 24);
  return `${prefix}-${encoded || Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDepartments(departments, members = []) {
  const base = Array.isArray(departments) && departments.length ? departments : DEFAULT_DEPARTMENTS;
  return uniqueText([...base, ...members.map((member) => member.department), "未分配部门"]);
}

function normalizeRoles(roles) {
  const normalized = new Map(DEFAULT_ROLES.map((role) => [role.key, clone(role)]));
  (Array.isArray(roles) ? roles : []).forEach((role, index) => {
    const source = typeof role === "string" ? { name: role } : role || {};
    const name = textValue(source.name);
    if (!name) return;
    const defaultRole = DEFAULT_ROLES.find((item) => item.key === source.key || item.name === name);
    const key = textValue(defaultRole?.key || source.key || recordId("role", `${name}-${index}`));
    normalized.set(key, {
      key,
      name,
      description: textValue(source.description || defaultRole?.description || "自定义角色"),
      locked: Boolean(defaultRole?.locked || source.locked),
    });
  });
  return Array.from(normalized.values());
}

function defaultPermissionRows(roles = DEFAULT_ROLES) {
  return ROLE_PERMISSION_ROWS.map((row) => ({
    label: row[0],
    description: row[1],
    values: roles.reduce((values, role) => {
      const roleIndex = DEFAULT_ROLES.findIndex((item) => item.key === role.key);
      values[role.key] = roleIndex >= 0 ? row[roleIndex + 2] : "否";
      return values;
    }, {}),
  }));
}

function normalizePermissionRows(rows, roles) {
  const defaults = defaultPermissionRows(roles);
  return defaults.map((defaultRow) => {
    const existing = (Array.isArray(rows) ? rows : []).find((row) => row.label === defaultRow.label) || {};
    const values = { ...defaultRow.values, ...(existing.values || {}) };
    roles.forEach((role) => {
      if (!["是", "否"].includes(values[role.key])) values[role.key] = "否";
    });
    return {
      label: defaultRow.label,
      description: textValue(existing.description || defaultRow.description),
      values,
    };
  });
}

function normalizePartnerProfile(partner, index = 0) {
  const source = typeof partner === "string" ? { name: partner } : partner || {};
  const fallback = DEFAULT_PARTNERS.find((item) => item.id === source.id || item.name === source.name) || {};
  const name = textValue(source.name || fallback.name);
  if (!name) return null;
  return {
    id: textValue(source.id || fallback.id || recordId("partner", `${name}-${index}`)),
    name,
    contact: textValue(source.contact || fallback.contact),
    phone: textValue(source.phone || fallback.phone),
    address: textValue(source.address || fallback.address),
    note: textValue(source.note || fallback.note || "项目录入时通过选择进入"),
  };
}

function normalizePartners(partners, projects = []) {
  const byName = new Map();
  (Array.isArray(partners) ? partners : []).forEach((partner, index) => {
    const profile = normalizePartnerProfile(partner, index);
    if (profile) byName.set(profile.name, profile);
  });
  projects.map((project) => project.partner).filter(Boolean).forEach((name) => {
    if (!byName.has(name)) {
      const profile = normalizePartnerProfile(name, byName.size);
      if (profile) byName.set(profile.name, profile);
    }
  });
  return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
}

function normalizeWorkflowNode(node, index = 0) {
  const source = node || {};
  const name = textValue(source.name || `节点 ${index + 1}`);
  return {
    id: textValue(source.id || recordId("node", `${name}-${index}`)),
    name,
    ownerRole: textValue(source.ownerRole || "编辑"),
    reminderRole: textValue(source.reminderRole || "项目主管"),
    cycle: Math.max(0, Number(source.cycle) || 0),
  };
}

function normalizeWorkflowNodes(nodes) {
  const normalized = (Array.isArray(nodes) ? nodes : []).map(normalizeWorkflowNode).filter((node) => node.name);
  return normalized.length ? normalized : DEFAULT_BUSINESS_LINES[0].nodes.map(normalizeWorkflowNode);
}

const PROCESS_FIELD_TYPES = new Set(["text", "textarea", "select", "checkbox"]);

function normalizeProcessCardField(field, index = 0, fallbackFields = []) {
  const source = field || {};
  const fallback = fallbackFields[index] || {};
  const label = textValue(source.label || fallback.label || `工艺字段 ${index + 1}`);
  const hasRequiredValue = Object.prototype.hasOwnProperty.call(source, "required");
  return {
    id: textValue(source.id || fallback.id || recordId("process-field", `${label}-${index}`)),
    label,
    type: PROCESS_FIELD_TYPES.has(source.type) ? source.type : fallback.type || "text",
    options: textValue(Array.isArray(source.options) ? source.options.join("\n") : source.options || fallback.options || ""),
    required: hasRequiredValue ? source.required === true || source.required === "true" || source.required === "是" : Boolean(fallback.required),
    placeholder: textValue(source.placeholder || fallback.placeholder || ""),
  };
}

function normalizeProcessCardFields(fields, fallbackFields = DEFAULT_BUSINESS_LINES[0].processCardFields || []) {
  const source = Array.isArray(fields) && fields.length ? fields : fallbackFields;
  const byId = new Map();
  source.forEach((field, index) => {
    const normalized = normalizeProcessCardField(field, index, fallbackFields);
    if (normalized.label) byId.set(normalized.id, normalized);
  });
  return Array.from(byId.values());
}

function normalizeRiskConfig(config = {}, fallback = {}) {
  const source = config || {};
  return {
    enabled: source.enabled !== undefined ? source.enabled !== false && source.enabled !== "false" : fallback.enabled !== false,
    reviewer: textValue(source.reviewer || fallback.reviewer || ""),
    focus: textValue(source.focus || fallback.focus || "排版、内容、进度、合同、质检等环节的潜在风险。"),
    qualityStandard: textValue(source.qualityStandard || fallback.qualityStandard || "结合工艺卡、节点进度、订单备注和质检标准判断是否需要人工复核。"),
  };
}

function normalizeBusinessLine(line, index = 0) {
  const source = line || {};
  const fallback = DEFAULT_BUSINESS_LINES.find((item) => item.id === source.id || item.name === source.name) || {};
  const name = textValue(source.name || fallback.name || `业务线 ${index + 1}`);
  return {
    id: textValue(source.id || fallback.id || recordId("line", `${name}-${index}`)),
    name,
    workflowName: textValue(source.workflowName || fallback.workflowName || `${name}流程`),
    description: textValue(source.description || fallback.description || "可在后台维护该业务线对应的流程节点。"),
    processCardFields: normalizeProcessCardFields(source.processCardFields, fallback.processCardFields || DEFAULT_BUSINESS_LINES[0].processCardFields || []),
    riskConfig: normalizeRiskConfig(source.riskConfig, fallback.riskConfig),
    nodes: normalizeWorkflowNodes(source.nodes || fallback.nodes),
  };
}

function normalizeBusinessLines(lines, legacyWorkflowConfig = []) {
  if (Array.isArray(lines) && lines.length) {
    return lines.map(normalizeBusinessLine);
  }
  const defaults = clone(DEFAULT_BUSINESS_LINES).map(normalizeBusinessLine);
  if (Array.isArray(legacyWorkflowConfig) && legacyWorkflowConfig.length) {
    defaults[0].nodes = normalizeWorkflowNodes(legacyWorkflowConfig);
  }
  return defaults;
}

function normalizeReminderDate(value, fallback) {
  const raw = String(value || fallback || "").trim();
  if (!raw) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 09:00`;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if (match) return `${match[1]} ${match[2].padStart(2, "0")}:${match[3]}`;
  return raw;
}

function normalizeProjects(projects) {
  return projects.map((project) => {
    const normalized = {
      ...project,
      businessLineId: project.businessLineId || DEFAULT_BUSINESS_LINE_ID,
      businessLineName: project.businessLineName || "出版类业务线",
      processCardValues: project.processCardValues && typeof project.processCardValues === "object" ? project.processCardValues : {},
      aiRiskReport: textValue(project.aiRiskReport),
      aiRiskAssessedAt: textValue(project.aiRiskAssessedAt),
      aiRiskAssessedBy: textValue(project.aiRiskAssessedBy),
      aiRiskReviewer: textValue(project.aiRiskReviewer),
      aiRiskReviewStatus: textValue(project.aiRiskReviewStatus),
      aiRiskReviewToken: textValue(project.aiRiskReviewToken),
      aiRiskReviewUrl: textValue(project.aiRiskReviewUrl),
      aiRiskReviewRequestedAt: textValue(project.aiRiskReviewRequestedAt),
      aiRiskReviewRequestedBy: textValue(project.aiRiskReviewRequestedBy),
      aiRiskReviewSentAt: textValue(project.aiRiskReviewSentAt),
      aiRiskReviewError: textValue(project.aiRiskReviewError),
      aiRiskReviewedAt: textValue(project.aiRiskReviewedAt),
      aiRiskReviewedBy: textValue(project.aiRiskReviewedBy),
      aiRiskReviewNote: textValue(project.aiRiskReviewNote),
      aiRiskAdditionalRisks: textValue(project.aiRiskAdditionalRisks),
      aiRiskReviewReceiptError: textValue(project.aiRiskReviewReceiptError),
      reminderDate: normalizeReminderDate(project.reminderDate, project.planFinish),
      reminders: normalizeProjectReminders(project),
      nodes: Array.isArray(project.nodes)
        ? project.nodes.map((node) => ({ ...node, reminderDate: normalizeReminderDate(node.reminderDate, node.planned) }))
        : project.nodes,
    };
    return syncProjectReminderFields(normalized);
  });
}

function normalizePushLogs(pushLogs) {
  return (Array.isArray(pushLogs) ? pushLogs : []).map((item, index) => {
    const success = item.success === true || item.success === "true" || item.status === "成功";
    return {
      id: String(item.id || `push-log-${index}`),
      content: String(item.content || "未填写推送内容"),
      pushedAt: String(item.pushedAt || item.time || ""),
      actor: String(item.actor || "WorkPad 管家"),
      receiver: String(item.receiver || item.toUser || "未设置接收人"),
      receiverUserId: String(item.receiverUserId || item.toUser || ""),
      success,
      status: String(item.status || (success ? "成功" : "失败")),
      error: String(item.error || ""),
      source: String(item.source || "企业微信推送"),
      projectCode: String(item.projectCode || ""),
      projectTitle: String(item.projectTitle || ""),
      confirmable: item.confirmable === true || item.confirmable === "true",
      confirmationToken: String(item.confirmationToken || ""),
      confirmationUrl: String(item.confirmationUrl || ""),
      completionStatus: String(item.completionStatus || ""),
      completedAt: String(item.completedAt || ""),
      completedBy: String(item.completedBy || ""),
      completionNote: String(item.completionNote || ""),
      reminderId: String(item.reminderId || ""),
      reminderScope: String(item.reminderScope || ""),
    };
  });
}

const REMINDER_STATUS_RANK = {
  pending: 1,
  failed: 2,
  sending: 3,
  sent: 4,
  completed: 5,
  cancelled: 6,
};

function reminderMatchKey(reminder = {}) {
  return [
    textValue(reminder.person || reminder.reminderPerson),
    textValue(reminder.date || reminder.reminderDate),
    textValue(reminder.note || reminder.nextAction),
  ].join("||");
}

function reminderStatusRank(reminder = {}) {
  const status = textValue(reminder.status);
  if (REMINDER_STATUS_RANK[status]) return REMINDER_STATUS_RANK[status];
  if (textValue(reminder.completedAt)) return REMINDER_STATUS_RANK.completed;
  if (textValue(reminder.sentAt)) return REMINDER_STATUS_RANK.sent;
  if (textValue(reminder.dispatchToken)) return REMINDER_STATUS_RANK.sending;
  if (textValue(reminder.lastError) || Number(reminder.attempts || 0) > 0) return REMINDER_STATUS_RANK.failed;
  return REMINDER_STATUS_RANK.pending;
}

function shouldPreferPreviousReminder(previous, next) {
  const previousRank = reminderStatusRank(previous);
  const nextRank = reminderStatusRank(next);
  if (previousRank !== nextRank) return previousRank > nextRank;
  if (Number(previous.attempts || 0) !== Number(next.attempts || 0)) {
    return Number(previous.attempts || 0) > Number(next.attempts || 0);
  }
  return (
    (textValue(previous.sentAt) && !textValue(next.sentAt))
    || (textValue(previous.completedAt) && !textValue(next.completedAt))
    || (textValue(previous.lastAttemptAt) && !textValue(next.lastAttemptAt))
    || (textValue(previous.confirmationToken) && !textValue(next.confirmationToken))
  );
}

function mergeReminderRuntimeFields(previous, next) {
  if (!previous) return next;
  const merged = { ...next };
  const preservePrevious = shouldPreferPreviousReminder(previous, next);
  if (!textValue(merged.id) || preservePrevious) merged.id = textValue(previous.id || merged.id);
  if (preservePrevious) {
    merged.status = previous.status;
    merged.pending = previous.pending;
  } else if (merged.pending === undefined && previous.pending !== undefined) {
    merged.pending = previous.pending;
  }
  [
    "createdAt",
    "sentAt",
    "lastAttemptAt",
    "lastError",
    "dispatchToken",
    "confirmationToken",
    "confirmationUrl",
    "completedAt",
    "completedBy",
    "completionNote",
    "receiptStatus",
    "receiptTarget",
    "receiptRequestedAt",
    "receiptSentAt",
    "receiptError",
    "updatedAt",
    "updatedBy",
  ].forEach((field) => {
    if ((preservePrevious || !textValue(merged[field])) && textValue(previous[field])) {
      merged[field] = previous[field];
    }
  });
  if (preservePrevious || Number(merged.attempts || 0) < Number(previous.attempts || 0)) {
    merged.attempts = Number(previous.attempts || 0);
  }
  if (merged.confirmable === undefined && previous.confirmable !== undefined) {
    merged.confirmable = previous.confirmable;
  }
  return merged;
}

function createReminderLookup(reminders = []) {
  const byId = new Map();
  const byKey = new Map();
  reminders.forEach((reminder) => {
    if (textValue(reminder.id)) byId.set(reminder.id, reminder);
    const key = reminderMatchKey(reminder);
    if (key && !byKey.has(key)) byKey.set(key, reminder);
  });
  return { byId, byKey };
}

function reminderStableKey(reminder = {}) {
  return textValue(reminder.id) || reminderMatchKey(reminder);
}

function mergeReminderCollections(nextReminders = [], previousReminders = []) {
  const previousLookup = createReminderLookup(previousReminders);
  const consumed = new Set();
  const merged = nextReminders.map((reminder) => {
    const previous = previousLookup.byId.get(reminder.id) || previousLookup.byKey.get(reminderMatchKey(reminder));
    if (previous) consumed.add(reminderStableKey(previous));
    return mergeReminderRuntimeFields(previous, reminder);
  });
  previousReminders.forEach((reminder) => {
    const stableKey = reminderStableKey(reminder);
    if (!stableKey || consumed.has(stableKey)) return;
    if (merged.some((item) => reminderStableKey(item) === stableKey)) return;
    merged.push(reminder);
  });
  return merged;
}

function pushLogStableKey(log = {}) {
  return [
    textValue(log.id),
    textValue(log.confirmationToken),
    textValue(log.receiverUserId),
    textValue(log.pushedAt),
    textValue(log.source),
    textValue(log.content),
  ].find(Boolean) || "";
}

function mergePushLogEntry(previous, next) {
  if (!previous) return next;
  const merged = { ...previous, ...next };
  [
    "error",
    "confirmationToken",
    "confirmationUrl",
    "completionStatus",
    "completedAt",
    "completedBy",
    "completionNote",
    "reminderId",
    "reminderScope",
    "projectCode",
    "projectTitle",
  ].forEach((field) => {
    if (!textValue(merged[field]) && textValue(previous[field])) merged[field] = previous[field];
  });
  if (!merged.confirmable && previous.confirmable) merged.confirmable = true;
  if (!merged.success && previous.success) merged.success = true;
  return merged;
}

function mergePushLogs(nextLogs = [], previousLogs = []) {
  const byKey = new Map();
  previousLogs.forEach((log) => {
    const key = pushLogStableKey(log);
    if (key) byKey.set(key, log);
  });
  nextLogs.forEach((log) => {
    const key = pushLogStableKey(log);
    if (!key) return;
    byKey.set(key, mergePushLogEntry(byKey.get(key), log));
  });
  return normalizePushLogs(Array.from(byKey.values()))
    .sort((left, right) => String(right.pushedAt).localeCompare(String(left.pushedAt)))
    .slice(0, 500);
}

function mergeIncomingStateWithStoredState(nextState, previousState) {
  const previousProjects = Array.isArray(previousState.projects) ? previousState.projects : [];
  const byProjectId = new Map(previousProjects.map((project) => [project.id, project]));
  const byProjectCode = new Map(previousProjects.map((project) => [project.code, project]));
  const projects = (Array.isArray(nextState.projects) ? nextState.projects : []).map((project) => {
    const previous = byProjectId.get(project.id) || byProjectCode.get(project.code);
    if (!previous) return project;
    const mergedReminders = mergeReminderCollections(
      normalizeProjectReminders(project),
      normalizeProjectReminders(previous),
    );
    return syncProjectReminderFields({
      ...project,
      reminders: mergedReminders,
    });
  });
  const publicReminders = normalizePublicReminders(mergeReminderCollections(
    normalizePublicReminders(nextState.publicReminders),
    normalizePublicReminders(previousState.publicReminders),
  ));
  const pushLogs = mergePushLogs(
    normalizePushLogs(nextState.pushLogs),
    normalizePushLogs(previousState.pushLogs),
  );
  return {
    ...nextState,
    projects,
    publicReminders,
    pushLogs,
  };
}

function normalizeState(rawState) {
  const seed = createDefaultState();
  const state = rawState && typeof rawState === "object" ? rawState : {};
  const projects = Array.isArray(state.projects) ? normalizeProjects(state.projects) : seed.projects;
  const teamMembers = Array.isArray(state.teamMembers) && state.teamMembers.length ? state.teamMembers : seed.teamMembers;
  const roles = normalizeRoles(state.roles);
  const workflowConfig = Array.isArray(state.workflowConfig) && state.workflowConfig.length ? normalizeWorkflowNodes(state.workflowConfig) : seed.workflowConfig;
  const businessLines = normalizeBusinessLines(state.businessLines, workflowConfig);
  const normalizedProjects = projects.map((project) => {
    const line = businessLines.find((item) => item.id === project.businessLineId) || businessLines[0];
    return { ...project, businessLineId: line.id, businessLineName: line.name };
  });
  return {
    version: 2,
    stateRevision: Math.max(1, Number(state.stateRevision) || 1),
    stateUpdatedAt: String(state.stateUpdatedAt || ""),
    authPolicyVersion: String(state.authPolicyVersion || ""),
    projects: normalizedProjects,
    teamMembers,
    departments: normalizeDepartments(state.departments, teamMembers),
    roles,
    permissionRows: normalizePermissionRows(state.permissionRows, roles),
    partners: Array.isArray(state.partners) ? normalizePartners(state.partners, normalizedProjects) : seed.partners,
    workflowConfig,
    businessLines,
    selectedWorkflowLineId: businessLines.some((line) => line.id === state.selectedWorkflowLineId) ? state.selectedWorkflowLineId : businessLines[0]?.id || DEFAULT_BUSINESS_LINE_ID,
    confirmablePushEnabled: state.confirmablePushEnabled !== false,
    currentUserId: state.currentUserId || seed.currentUserId,
    wecomInbox: Array.isArray(state.wecomInbox) ? state.wecomInbox.slice(0, 200) : [],
    publicReminders: normalizePublicReminders(state.publicReminders || seed.publicReminders),
    pushLogs: normalizePushLogs(state.pushLogs),
  };
}

function resolveLocalFile() {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      storageMode: "vercel-tmp",
      persistence: "ephemeral",
      filePath: path.join(os.tmpdir(), "workpad-state.json"),
    };
  }
  return {
    storageMode: "local-file",
    persistence: "persistent",
    filePath: path.join(process.cwd(), "data", "workpad-state.json"),
  };
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readLocalFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return "";
    throw error;
  }
}

async function writeLocalFile(filePath, content) {
  await ensureDir(filePath);
  const tempPath = `${filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}

async function readBlobText() {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATHNAME, { access: "private" });
  if (!result || !result.stream) return "";
  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return buffer.toString("utf8");
}

async function writeBlobText(content) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, content, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
  });
}

async function readStoredState() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const raw = await readBlobText();
    if (!raw) {
      const seed = normalizeState({
        ...createDefaultState(),
        stateRevision: 1,
        stateUpdatedAt: nowIso(),
      });
      await writeBlobText(JSON.stringify(seed, null, 2));
      return {
        state: seed,
        meta: {
          storageMode: "vercel-blob",
          persistence: "persistent",
          updatedAt: seed.stateUpdatedAt,
          stateRevision: seed.stateRevision,
          deploymentVersion: deploymentVersion(),
        },
      };
    }
    const normalized = normalizeState(JSON.parse(raw));
    return {
      state: normalized,
      meta: {
        storageMode: "vercel-blob",
        persistence: "persistent",
        updatedAt: normalized.stateUpdatedAt || nowIso(),
        stateRevision: normalized.stateRevision,
        deploymentVersion: deploymentVersion(),
      },
    };
  }

  const { storageMode, persistence, filePath } = resolveLocalFile();
  const raw = await readLocalFile(filePath);
  if (!raw) {
    const seed = normalizeState({
      ...createDefaultState(),
      stateRevision: 1,
      stateUpdatedAt: nowIso(),
    });
    await writeLocalFile(filePath, JSON.stringify(seed, null, 2));
    return {
      state: seed,
      meta: {
        storageMode,
        persistence,
        updatedAt: seed.stateUpdatedAt,
        stateRevision: seed.stateRevision,
        deploymentVersion: deploymentVersion(),
      },
    };
  }
  const normalized = normalizeState(JSON.parse(raw));
  return {
    state: normalized,
    meta: {
      storageMode,
      persistence,
      updatedAt: normalized.stateUpdatedAt || nowIso(),
      stateRevision: normalized.stateRevision,
      deploymentVersion: deploymentVersion(),
    },
  };
}

async function writeStoredState(nextState) {
  const normalized = normalizeState(clone(nextState));
  normalized.stateRevision = Math.max(1, Number(nextState?.stateRevision || 0) + 1);
  normalized.stateUpdatedAt = nowIso();
  const content = JSON.stringify(normalized, null, 2);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await writeBlobText(content);
    return {
      state: normalized,
      meta: {
        storageMode: "vercel-blob",
        persistence: "persistent",
        updatedAt: normalized.stateUpdatedAt,
        stateRevision: normalized.stateRevision,
        deploymentVersion: deploymentVersion(),
      },
    };
  }

  const { storageMode, persistence, filePath } = resolveLocalFile();
  await writeLocalFile(filePath, content);
  return {
    state: normalized,
    meta: {
      storageMode,
      persistence,
      updatedAt: normalized.stateUpdatedAt,
      stateRevision: normalized.stateRevision,
      deploymentVersion: deploymentVersion(),
    },
  };
}

async function resetStoredState() {
  return writeStoredState(createDefaultState());
}

module.exports = {
  mergeIncomingStateWithStoredState,
  readStoredState,
  writeStoredState,
  resetStoredState,
  normalizeState,
};
