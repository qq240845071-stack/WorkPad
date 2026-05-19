const STORAGE_KEY = "workpad-projects-v2";
const SETTINGS_KEY = "workpad-settings-v1";
const LEGACY_STORAGE_KEY = "publishing-order-board-v1";

const STATUS_ORDER = [
  "待启动",
  "作者沟通中",
  "排版校稿中",
  "样书处理中",
  "成品制作中",
  "合同处理中",
  "送货处理中",
  "尾印单处理中",
  "已完成",
  "已暂停",
];

const NODE_ORDER = ["作者沟通", "排版", "一校", "二校", "三校", "样书", "成品", "合同", "送货", "尾印单"];

const STATUS_META = {
  待启动: { tone: "#8d6e46", description: "尚未正式进入执行节奏" },
  作者沟通中: { tone: "#a4482f", description: "作者确认、资料回收、版式方向沟通" },
  排版校稿中: { tone: "#23404d", description: "排版、一校、二校、三校集中推进" },
  样书处理中: { tone: "#697443", description: "样书打样、工艺确认、封面细节调整" },
  成品制作中: { tone: "#2f7252", description: "正式印制与成品出库前准备" },
  合同处理中: { tone: "#7b5c3e", description: "合同签署、法务确认、归档" },
  送货处理中: { tone: "#4c6472", description: "出库、物流、到货确认" },
  尾印单处理中: { tone: "#9a5e2a", description: "尾印单补齐、收尾闭环" },
  已完成: { tone: "#245741", description: "项目闭环完成" },
  已暂停: { tone: "#7c7070", description: "项目暂缓推进，等待恢复" },
};

const STATUS_TO_NODE = {
  待启动: "作者沟通",
  作者沟通中: "作者沟通",
  排版校稿中: "一校",
  样书处理中: "样书",
  成品制作中: "成品",
  合同处理中: "合同",
  送货处理中: "送货",
  尾印单处理中: "尾印单",
  已完成: "尾印单",
  已暂停: "作者沟通",
};

const TEAM_MEMBERS = [
  { id: "user-zhou", name: "周雯", role: "超级管理员", department: "出版一组", wecomUserId: "zhouwen" },
  { id: "user-xu", name: "许畅", role: "项目主管", department: "出版二组", wecomUserId: "xuchang" },
  { id: "user-wang", name: "王黎", role: "编辑", department: "出版二组", wecomUserId: "wangli" },
  { id: "user-liu", name: "刘珂", role: "编辑", department: "少儿编辑部", wecomUserId: "liuke" },
  { id: "user-chen", name: "陈敏", role: "协同支持", department: "法务支持", wecomUserId: "chenmin" },
  { id: "user-sun", name: "孙妍", role: "协同支持", department: "发行支持", wecomUserId: "sunyan" },
];

const ROLE_PERMISSION_ROWS = [
  ["查看全部项目", "可以查看所有项目和风险清单", "是", "是", "是", "是"],
  ["编辑项目状态", "可以修改状态、节点、提醒信息", "是", "是", "是", "否"],
  ["管理人员", "可以维护成员名单和身份", "是", "否", "否", "否"],
  ["管理权限", "可以配置角色权限", "是", "否", "否", "否"],
  ["管理合作方", "可以维护合作方主数据", "是", "是", "否", "否"],
  ["管理流程节点", "可以调整节点说明和标准节奏", "是", "是", "否", "否"],
];

const WORKFLOW_CONFIG = [
  { name: "作者沟通", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { name: "排版", ownerRole: "编辑", reminderRole: "项目主管", cycle: 4 },
  { name: "一校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { name: "二校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { name: "三校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { name: "样书", ownerRole: "编辑", reminderRole: "协同支持", cycle: 4 },
  { name: "成品", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 6 },
  { name: "合同", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 4 },
  { name: "送货", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 3 },
  { name: "尾印单", ownerRole: "协同支持", reminderRole: "编辑", cycle: 3 },
];

const DEFAULT_PARTNERS = ["华墨文化", "星图少儿", "四时阅读", "自有项目", "书田学院", "旧闻书局", "晴窗文化", "城市读本", "光谱教育"];

const PROJECT_BLUEPRINTS = [
  ["BK-2026-001", "江南旧影：近代书店档案选", "林书远", "周雯", "华墨文化", "排版校稿中", "二校", -42, 6, -27, "回收作者二校眉批并锁定三校排期", "作者回稿比计划晚 4 天，本周必须完成三校准备。", "夏季档重点人文书，目录已经稳定，正文需要统一脚注样式。", "周雯", 1],
  ["BK-2026-002", "儿童科学手帐：宇宙卷", "陈予安", "许畅", "星图少儿", "样书处理中", "样书", -35, 3, -11, "确认样书封面覆膜和专色效果", "样书工艺还没最终确认，离计划交付只剩 3 天。", "少儿彩图项目，封面工艺是当前最关键风险点。", "许畅", 0],
  ["BK-2026-003", "城市植物观察笔记", "顾澄", "王黎", "四时阅读", "作者沟通中", "作者沟通", -16, 16, -61, "确认增补章节素材版权归属", "作者补图还未齐，资料收集稍慢。", "图文生活方式书，资料细节多，适合提前把素材和授权盯住。", "王黎", 2],
  ["BK-2026-004", "版式训练课：编辑内部手册", "编辑中心", "刘珂", "自有项目", "待启动", "作者沟通", -4, 24, -5, "补充内部培训提纲并确认首批章节分工", "项目刚立项，信息还不完整，需要尽快定目录。", "内部培训资料，适合拿来测试待启动到执行的流程衔接。", "刘珂", 3],
  ["BK-2026-005", "古籍里的日常器物", "沈见秋", "周雯", "华墨文化", "合同处理中", "合同", -57, -2, -208, "催法务确认补充条款并回传盖章版", "合同仍未回签，项目整体已经超计划 2 天。", "书已接近成品，当前主要风险不是制作，而是合同迟迟未闭环。", "陈敏", 0, "合同"],
  ["BK-2026-006", "新编辑实务 100 问", "赵浅", "许畅", "书田学院", "送货处理中", "送货", -63, 4, -19, "确认首批到仓签收与缺件回执", "物流正常，但需要盯住分仓签收反馈。", "首批已经出库，当前关注的是送货回执和分仓交接。", "孙妍", 2],
  ["BK-2026-007", "中国书店招牌史", "乔以宁", "王黎", "旧闻书局", "成品制作中", "成品", -49, 9, -73, "确认印厂成品批次与包装清单", "印厂反馈两种纸张库存紧张，需要盯交期。", "图录项目，印制质量要求高，适合在成品阶段单独高亮。", "王黎", 1],
  ["BK-2026-008", "青年写作者访谈录", "何简", "刘珂", "晴窗文化", "尾印单处理中", "尾印单", -68, 5, -15, "补齐尾印单编号并归档签收单", "主体流程已完成，收尾文件要在本周关掉。", "适合演示收尾阶段，不让已经送货的项目继续悬着。", "刘珂", 2],
  ["BK-2026-009", "读城记：地铁里的城市学", "宋持", "周雯", "城市读本", "已完成", "尾印单", -88, -12, -28, "已完成归档，无待办", "项目已闭环。", "完成项目作为样例，用来显示闭环后的状态样式。", "周雯", -1],
  ["BK-2026-010", "影像中的书页设计", "徐适", "许畅", "晴窗文化", "已暂停", "三校", -52, 18, -265, "等待作者增补章节后恢复三校", "作者新增章节较大，项目暂停中。", "暂停项目用来测试首页是否能把停滞项目从在途工作中区分出来。", "许畅", 1, "三校"],
  ["BK-2026-011", "博物馆教育活动设计", "温栩", "王黎", "光谱教育", "排版校稿中", "一校", -24, 11, -8, "统一图表规范并交回排版修订", "整体推进稳定，目前主要盯一校反馈的回收速度。", "执行顺畅的校稿项目，作为对比样本。", "王黎", 1],
  ["BK-2026-012", "给孩子的印刷小百科", "陶溪", "刘珂", "星图少儿", "作者沟通中", "作者沟通", -12, 14, -182, "确认插图授权范围与补充采访时间", "已连续 7 天未更新，需要尽快推进作者确认。", "少儿百科，信息量大，资料和图片授权同步推进。", "刘珂", 0],
];

const ROLE_KEY_MAP = {
  超级管理员: "admin",
  项目主管: "manager",
  编辑: "editor",
  协同支持: "support",
};

const ADMIN_TAB_RULES = {
  overview: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
  ai: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
  users: ["管理人员"],
  permissions: ["管理权限"],
  partners: ["管理合作方"],
  workflow: ["管理流程节点"],
};

const state = {
  projects: [],
  teamMembers: [],
  permissionRows: [],
  partners: [],
  workflowConfig: [],
  wecomInbox: [],
  filters: { search: "", owner: "全部", status: "全部", risk: "全部", update: "全部", reminder: "全部" },
  selectedProjectId: null,
  editingProjectId: null,
  currentView: "board",
  displayMode: "project",
  currentUserId: TEAM_MEMBERS[0].id,
  adminTab: "overview",
  adminEditingMode: "",
  adminEditingId: "",
  aiChat: [
    {
      role: "assistant",
      content: "我是 WorkPad 后台 AI 管家，已经接入 DeepSeek V4 Flash。你可以问我订单风险、提醒写法、质检规则，或让我把一句话整理成可执行的订单动作。",
    },
  ],
  aiPending: false,
  aiError: "",
};

const runtime = {
  apiReady: false,
  hydrating: false,
  syncInFlight: false,
  syncTimer: 0,
  storageMode: "browser-local",
  persistence: "local",
  lastSyncedAt: "",
  lastError: "",
};

const elements = {
  noticeBar: document.getElementById("noticeBar"),
  boardView: document.getElementById("boardView"),
  adminView: document.getElementById("adminView"),
  viewToggle: document.getElementById("viewToggle"),
  frontDisplayToggle: document.getElementById("frontDisplayToggle"),
  currentUserSelect: document.getElementById("currentUserSelect"),
  currentUserName: document.getElementById("currentUserName"),
  currentUserRole: document.getElementById("currentUserRole"),
  clockDisplay: document.getElementById("clockDisplay"),
  summaryGrid: document.getElementById("summaryGrid"),
  urgentList: document.getElementById("urgentList"),
  boardGrid: document.getElementById("boardGrid"),
  boardMeta: document.getElementById("boardMeta"),
  personBoardSection: document.getElementById("personBoardSection"),
  personBoardGrid: document.getElementById("personBoardGrid"),
  personBoardMeta: document.getElementById("personBoardMeta"),
  adminSummaryGrid: document.getElementById("adminSummaryGrid"),
  adminTabNav: document.getElementById("adminTabNav"),
  adminTitle: document.getElementById("adminTitle"),
  adminMeta: document.getElementById("adminMeta"),
  adminContent: document.getElementById("adminContent"),
  drawer: document.getElementById("detailDrawer"),
  drawerContent: document.getElementById("drawerContent"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  drawerCloseButton: document.getElementById("drawerCloseButton"),
  projectModal: document.getElementById("projectModal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalCloseButton: document.getElementById("modalCloseButton"),
  modalCancelButton: document.getElementById("modalCancelButton"),
  modalTitle: document.getElementById("modalTitle"),
  projectForm: document.getElementById("projectForm"),
  adminModal: document.getElementById("adminModal"),
  adminModalBackdrop: document.getElementById("adminModalBackdrop"),
  adminModalCloseButton: document.getElementById("adminModalCloseButton"),
  adminModalTitle: document.getElementById("adminModalTitle"),
  adminModalContent: document.getElementById("adminModalContent"),
  newProjectButton: document.getElementById("newProjectButton"),
  resetDemoButton: document.getElementById("resetDemoButton"),
  searchInput: document.getElementById("searchInput"),
  ownerFilter: document.getElementById("ownerFilter"),
  statusFilter: document.getElementById("statusFilter"),
  riskFilter: document.getElementById("riskFilter"),
  updateFilter: document.getElementById("updateFilter"),
  reminderFilter: document.getElementById("reminderFilter"),
  resetFiltersButton: document.getElementById("resetFiltersButton"),
  formInternalId: document.getElementById("formInternalId"),
  formTitle: document.getElementById("formTitle"),
  formAuthor: document.getElementById("formAuthor"),
  formCode: document.getElementById("formCode"),
  formOwner: document.getElementById("formOwner"),
  formPartner: document.getElementById("formPartner"),
  formStatus: document.getElementById("formStatus"),
  formCurrentNode: document.getElementById("formCurrentNode"),
  formPlanFinish: document.getElementById("formPlanFinish"),
  formSummary: document.getElementById("formSummary"),
  formNextAction: document.getElementById("formNextAction"),
  formRiskNote: document.getElementById("formRiskNote"),
  formReminderPerson: document.getElementById("formReminderPerson"),
  formReminderDate: document.getElementById("formReminderDate"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultPermissionRows() {
  return ROLE_PERMISSION_ROWS.map((row) => ({
    label: row[0],
    description: row[1],
    values: {
      admin: row[2],
      manager: row[3],
      editor: row[4],
      support: row[5],
    },
  }));
}

function normalizeTeamMembers(members) {
  return (Array.isArray(members) ? members : []).map((member) => {
    const fallback = TEAM_MEMBERS.find((item) => item.id === member.id || item.name === member.name) || {};
    return {
      ...fallback,
      ...member,
      wecomUserId: member.wecomUserId ?? fallback.wecomUserId ?? "",
    };
  });
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.teamMembers = Array.isArray(parsed.teamMembers) && parsed.teamMembers.length ? normalizeTeamMembers(parsed.teamMembers) : clone(TEAM_MEMBERS);
      state.permissionRows = Array.isArray(parsed.permissionRows) && parsed.permissionRows.length ? parsed.permissionRows : defaultPermissionRows();
      state.partners = Array.isArray(parsed.partners) && parsed.partners.length ? parsed.partners : clone(DEFAULT_PARTNERS);
      state.workflowConfig = Array.isArray(parsed.workflowConfig) && parsed.workflowConfig.length ? parsed.workflowConfig : clone(WORKFLOW_CONFIG);
      state.currentUserId = parsed.currentUserId || TEAM_MEMBERS[0].id;
      return;
    }
  } catch (error) {
  }
  state.teamMembers = clone(TEAM_MEMBERS);
  state.permissionRows = defaultPermissionRows();
  state.partners = clone(DEFAULT_PARTNERS);
  state.workflowConfig = clone(WORKFLOW_CONFIG);
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      teamMembers: state.teamMembers,
      permissionRows: state.permissionRows,
      partners: state.partners,
      workflowConfig: state.workflowConfig,
      currentUserId: state.currentUserId,
    }),
  );
  queueRemoteSync();
}

function exportStateSnapshot() {
  return {
    version: 1,
    projects: state.projects,
    teamMembers: state.teamMembers,
    permissionRows: state.permissionRows,
    partners: state.partners,
    workflowConfig: state.workflowConfig,
    currentUserId: state.currentUserId,
    wecomInbox: state.wecomInbox,
  };
}

function applyStateSnapshot(snapshot) {
  const seedSettings = clone(TEAM_MEMBERS);
  state.teamMembers = Array.isArray(snapshot.teamMembers) && snapshot.teamMembers.length ? normalizeTeamMembers(snapshot.teamMembers) : seedSettings;
  state.permissionRows = Array.isArray(snapshot.permissionRows) && snapshot.permissionRows.length ? snapshot.permissionRows : defaultPermissionRows();
  state.partners = Array.isArray(snapshot.partners) && snapshot.partners.length ? snapshot.partners : clone(DEFAULT_PARTNERS);
  state.workflowConfig = Array.isArray(snapshot.workflowConfig) && snapshot.workflowConfig.length ? snapshot.workflowConfig : clone(WORKFLOW_CONFIG);
  state.projects = Array.isArray(snapshot.projects) && snapshot.projects.length ? snapshot.projects.map(normalizeProject) : seedProjects();
  state.wecomInbox = Array.isArray(snapshot.wecomInbox) ? snapshot.wecomInbox : [];
  state.currentUserId = state.teamMembers.some((item) => item.id === snapshot.currentUserId) ? snapshot.currentUserId : state.teamMembers[0].id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      teamMembers: state.teamMembers,
      permissionRows: state.permissionRows,
      partners: state.partners,
      workflowConfig: state.workflowConfig,
      currentUserId: state.currentUserId,
    }),
  );
}

function storageStatusText() {
  if (runtime.syncInFlight) return "后台数据同步中";
  if (runtime.lastError) return `后台同步失败，当前先保存在浏览器本地：${runtime.lastError}`;
  if (runtime.storageMode === "vercel-blob") return "后端数据已接入 Vercel Blob，可多人共用并长期保存";
  if (runtime.storageMode === "local-file") return "后端数据已接入本地文件存储，适合本机联调和录入";
  if (runtime.storageMode === "vercel-tmp") return "后台接口已经接通，但当前线上是临时缓存，下一步需要配置持久存储";
  return "当前使用浏览器本地演示数据";
}

function updateRuntimeMeta(meta) {
  runtime.apiReady = true;
  runtime.storageMode = meta?.storageMode || "browser-local";
  runtime.persistence = meta?.persistence || "local";
  runtime.lastSyncedAt = meta?.updatedAt || "";
  runtime.lastError = "";
}

async function requestRemoteState(method = "GET", payload) {
  const response = await fetch("/api/state", {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "后台接口请求失败");
  }
  return result;
}

async function hydrateRemoteState() {
  if (typeof window === "undefined" || window.location.protocol === "file:") return;
  try {
    runtime.hydrating = true;
    const result = await requestRemoteState("GET");
    applyStateSnapshot(result.state || {});
    updateRuntimeMeta(result.meta);
    render();
  } catch (error) {
    runtime.apiReady = false;
    runtime.lastError = "";
    renderNoticeBar();
  } finally {
    runtime.hydrating = false;
  }
}

async function pushRemoteState() {
  if (!runtime.apiReady || runtime.hydrating) return;
  try {
    runtime.syncInFlight = true;
    renderNoticeBar();
    const result = await requestRemoteState("PUT", { state: exportStateSnapshot() });
    updateRuntimeMeta(result.meta);
  } catch (error) {
    runtime.lastError = error instanceof Error ? error.message : String(error);
  } finally {
    runtime.syncInFlight = false;
    renderNoticeBar();
  }
}

function queueRemoteSync() {
  if (!runtime.apiReady || runtime.hydrating) return;
  window.clearTimeout(runtime.syncTimer);
  runtime.syncTimer = window.setTimeout(() => {
    void pushRemoteState();
  }, 320);
}

async function flushRemoteSync() {
  if (!runtime.apiReady || runtime.hydrating) return;
  window.clearTimeout(runtime.syncTimer);
  runtime.syncTimer = 0;
  await pushRemoteState();
}

async function resetRemoteState() {
  const result = await requestRemoteState("POST", { action: "reset-demo" });
  applyStateSnapshot(result.state || {});
  updateRuntimeMeta(result.meta);
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function addHours(date, offset) {
  const next = new Date(date);
  next.setHours(next.getHours() + offset);
  return next;
}

function parseDate(value) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T09:00:00`);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) return new Date(value.replace(" ", "T"));
  return new Date(value);
}

function dateString(value) {
  const date = parseDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateTimeString(value) {
  const date = parseDate(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateString(date)} ${hours}:${minutes}`;
}

function dateTimeInputValue(value) {
  return dateTimeString(value).replace(" ", "T");
}

function reminderTimeText(value) {
  return dateTimeString(value);
}

function diffDays(later, earlier) {
  return Math.floor((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMessageText(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function tint(hex, opacity) {
  const safe = hex.replace("#", "");
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate, blockedNode) {
  const currentIndex = NODE_ORDER.indexOf(currentNode);
  return NODE_ORDER.map((name, index) => {
    const planned = addDays(startDate, index * 5 + 3);
    let nodeStatus = "未开始";
    let completed = "";
    if (status === "已完成") {
      nodeStatus = "已完成";
      completed = dateString(addDays(planned, 1));
    } else if (index < currentIndex) {
      nodeStatus = "已完成";
      completed = dateString(addDays(planned, 1));
    } else if (index === currentIndex) {
      nodeStatus = status === "已暂停" || blockedNode === name ? "已阻塞" : status === "待启动" ? "未开始" : "进行中";
    }
    return {
      name,
      status: nodeStatus,
      owner,
      planned: dateString(planned),
      completed,
      reminderPerson: index === currentIndex ? reminderPerson : owner,
      reminderDate: index === currentIndex ? dateTimeString(reminderDate) : dateTimeString(planned),
      note: nodeStatus === "已阻塞" ? "当前节点存在阻塞，需要人工跟进。" : nodeStatus === "进行中" ? "当前为主要推进节点。" : nodeStatus === "已完成" ? "节点已关闭。" : "尚未启动。",
    };
  });
}

function createSeedProject(row) {
  const [
    code,
    title,
    author,
    owner,
    partner,
    status,
    currentNode,
    startOffset,
    planOffset,
    updateHours,
    nextAction,
    riskNote,
    summary,
    reminderPerson,
    reminderOffset,
    blockedNode,
  ] = row;
  const now = new Date();
  const startDate = addDays(now, startOffset);
  const updatedAt = addHours(now, updateHours);
  const reminderDate = addDays(now, reminderOffset);
  return {
    id: uid(),
    source: "demo",
    code,
    title,
    author,
    owner,
    partner,
    status,
    currentNode,
    startDate: dateString(startDate),
    planFinish: dateString(addDays(now, planOffset)),
    updatedAt: dateTimeString(updatedAt),
    createdAt: dateTimeString(addDays(startDate, -2)),
    summary,
    nextAction,
    riskNote,
    reminderPerson,
    reminderDate: dateTimeString(reminderDate),
    nodes: buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate, blockedNode),
    followUps: [
      { time: dateTimeString(addDays(updatedAt, -3)), user: owner, progress: summary, nextAction },
      { time: dateTimeString(updatedAt), user: owner, progress: riskNote, nextAction },
    ],
    logs: [
      { time: dateTimeString(addDays(startDate, -2)), actor: owner, action: "创建项目", detail: `建立项目 ${code} 并录入基础信息。` },
      { time: dateTimeString(addDays(startDate, 0)), actor: owner, action: "更新状态", detail: `项目进入「${status}」阶段。` },
      { time: dateTimeString(updatedAt), actor: owner, action: "补充跟进", detail: nextAction },
    ],
  };
}

function getPartners() {
  const fromProjects = state.projects.map((item) => item.partner).filter(Boolean);
  return [...new Set([...(state.partners || []), ...fromProjects])].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function normalizeProject(project) {
  const status = STATUS_ORDER.includes(project.status) ? project.status : "待启动";
  const currentNode = NODE_ORDER.includes(project.currentNode) ? project.currentNode : STATUS_TO_NODE[status];
  const owner = project.owner || "未分配";
  const reminderPerson = project.reminderPerson || owner;
  const reminderDate = project.reminderDate || project.planFinish || dateString(new Date());
  const startDate = parseDate(project.startDate || new Date());
  const normalizedNodes = Array.isArray(project.nodes) && project.nodes.length
    ? project.nodes.map((node) => ({ ...node, reminderDate: dateTimeString(node.reminderDate || node.planned || reminderDate) }))
    : buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate);
  return {
    ...project,
    status,
    currentNode,
    owner,
    partner: project.partner || "",
    summary: project.summary || `${project.title || "项目"} 的流程记录`,
    nextAction: project.nextAction || "待补充下一步动作",
    riskNote: project.riskNote || "暂无特别风险说明。",
    reminderPerson,
    reminderDate: dateTimeString(reminderDate),
    startDate: dateString(startDate),
    planFinish: dateString(project.planFinish || addDays(new Date(), 14)),
    updatedAt: dateTimeString(project.updatedAt || new Date()),
    createdAt: dateTimeString(project.createdAt || new Date()),
    nodes: normalizedNodes,
    followUps: Array.isArray(project.followUps) && project.followUps.length ? project.followUps : [{ time: dateTimeString(new Date()), user: owner, progress: project.summary || "创建项目", nextAction: project.nextAction || "待补充下一步动作" }],
    logs: Array.isArray(project.logs) && project.logs.length ? project.logs : [{ time: dateTimeString(new Date()), actor: owner, action: "创建项目", detail: "补齐基础信息。" }],
  };
}

function seedProjects() {
  return PROJECT_BLUEPRINTS.map(createSeedProject);
}

function loadProjects() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return seedProjects();
  try {
    const parsed = JSON.parse(raw);
    const existing = Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
    const byCode = new Map(existing.map((item) => [item.code, item]));
    const demoProjects = PROJECT_BLUEPRINTS.map((row) => byCode.get(row[0]) || createSeedProject(row));
    const demoCodes = new Set(PROJECT_BLUEPRINTS.map((item) => item[0]));
    const custom = existing.filter((item) => !demoCodes.has(item.code));
    return [...demoProjects, ...custom];
  } catch (error) {
    return seedProjects();
  }
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
  queueRemoteSync();
}

function reminderStatus(project) {
  if (project.status === "已完成") return "已完成";
  return dateString(project.reminderDate) === dateString(new Date()) ? "今日提醒" : "待提醒";
}

function getProjectRisk(project) {
  if (project.status === "已完成") return { level: "低", staleDays: 0, reasons: ["项目已闭环完成"], urgencyScore: 0 };
  const now = new Date();
  const planFinish = parseDate(project.planFinish);
  const updatedAt = parseDate(project.updatedAt);
  const staleDays = Math.max(diffDays(now, updatedAt), 0);
  const overdue = diffDays(now, planFinish) > 0 && project.status !== "已暂停";
  const blockedNode = project.nodes.find((item) => item.status === "已阻塞");
  const dueIn = diffDays(planFinish, now);
  const dueSoon = dueIn >= 0 && dueIn <= 3;
  const reasons = [];
  if (blockedNode) reasons.push(`卡在${blockedNode.name}`);
  if (overdue) reasons.push(`已超计划 ${diffDays(now, planFinish)} 天`);
  if (staleDays >= 7) reasons.push(`${staleDays} 天未更新`);
  if (dueSoon && !overdue) reasons.push(`距离计划完成仅剩 ${dueIn} 天`);
  if (!reasons.length) reasons.push("推进正常");
  const level = blockedNode || overdue || staleDays >= 10 ? "高" : dueSoon || staleDays >= 4 ? "中" : "低";
  return { level, staleDays, reasons, urgencyScore: (blockedNode ? 50 : 0) + (overdue ? 30 : 0) + staleDays + (dueSoon ? 12 - dueIn : 0) };
}

function riskChip(level) {
  return level === "高" ? "chip chip-risk-high" : level === "中" ? "chip chip-risk-medium" : "chip chip-risk-low";
}

function roleKey(role) {
  return ROLE_KEY_MAP[role] || "editor";
}

function currentUser() {
  return state.teamMembers.find((item) => item.id === state.currentUserId) || state.teamMembers[0];
}

function hasPermission(label, user = currentUser()) {
  const row = state.permissionRows.find((item) => item.label === label);
  return row ? row.values[roleKey(user.role)] === "是" : false;
}

function visibleProjects(user = currentUser()) {
  if (hasPermission("查看全部项目", user)) return state.projects;
  return state.projects.filter((project) => project.owner === user.name || project.reminderPerson === user.name);
}

function canAccessAdmin(user = currentUser()) {
  return Object.values(ADMIN_TAB_RULES).flat().some((label) => hasPermission(label, user));
}

function allowedAdminTabs(user = currentUser()) {
  return Object.entries(ADMIN_TAB_RULES)
    .filter(([, labels]) => labels.some((label) => hasPermission(label, user)))
    .map(([key]) => key);
}

function filteredProjects() {
  const search = state.filters.search.trim().toLowerCase();
  return visibleProjects().filter((project) => {
    const risk = getProjectRisk(project);
    const matchesSearch = !search || [project.title, project.author, project.code].some((item) => String(item).toLowerCase().includes(search));
    const matchesOwner = state.filters.owner === "全部" || project.owner === state.filters.owner;
    const matchesStatus = state.filters.status === "全部" || project.status === state.filters.status;
    const matchesRisk = state.filters.risk === "全部" || risk.level === state.filters.risk;
    const matchesReminder = state.filters.reminder === "全部" || reminderStatus(project) === state.filters.reminder;
    const matchesUpdate = state.filters.update === "全部" ? true : state.filters.update === "7天未更新" ? risk.staleDays >= 7 : risk.staleDays <= 3;
    return matchesSearch && matchesOwner && matchesStatus && matchesRisk && matchesReminder && matchesUpdate;
  });
}

function renderClock() {
  elements.clockDisplay.textContent = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function renderIdentity() {
  elements.currentUserSelect.innerHTML = state.teamMembers.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  elements.currentUserSelect.value = state.currentUserId;
  elements.currentUserName.textContent = currentUser().name;
  elements.currentUserRole.textContent = `${currentUser().role} · ${currentUser().department}`;
}

function syncFiltersAndForm() {
  const owners = [...new Set(state.teamMembers.map((item) => item.name).concat(visibleProjects().map((item) => item.owner)))].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
  elements.ownerFilter.innerHTML = [`<option value="全部">全部负责人</option>`, ...owners.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.ownerFilter.value = state.filters.owner;
  elements.statusFilter.innerHTML = [`<option value="全部">全部状态</option>`, ...STATUS_ORDER.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.statusFilter.value = state.filters.status;
  elements.formStatus.innerHTML = STATUS_ORDER.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  elements.formCurrentNode.innerHTML = NODE_ORDER.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  elements.formPartner.innerHTML = [`<option value="">未选择合作方</option>`, ...getPartners().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.newProjectButton.disabled = !hasPermission("编辑项目状态");
  elements.newProjectButton.title = hasPermission("编辑项目状态") ? "" : "当前身份没有项目编辑权限";
}

function renderNoticeBar() {
  const user = currentUser();
  const myProjects = state.projects.filter((item) => item.owner === user.name && !["已完成", "已暂停"].includes(item.status)).length;
  const myReminders = state.projects.filter((item) => item.reminderPerson === user.name && reminderStatus(item) === "今日提醒").length;
  const highRisk = state.projects.filter((item) => getProjectRisk(item).level === "高").length;
  const adminHint = canAccessAdmin(user) ? "可进入后台管理配置" : "当前身份只开放业务看板操作";
  elements.noticeBar.innerHTML = `
    <div class="notice-item">
      <strong>${escapeHtml(user.name)} 当前在跟 ${myProjects} 个项目，今天有 ${myReminders} 个待提醒事项。</strong>
      <span class="mini-text">当前身份：${escapeHtml(user.role)} · ${escapeHtml(adminHint)}</span>
    </div>
    <div class="notice-item">
      <strong>系统当前识别出 ${highRisk} 个高风险项目，建议优先查看风险与提醒清单。</strong>
      <span class="mini-text">合作方已接入 ${getPartners().length} 个 · ${escapeHtml(storageStatusText())}</span>
    </div>
  `;
}

function renderSummary(projects) {
  const active = projects.filter((item) => !["已完成", "已暂停"].includes(item.status)).length;
  const highRisk = projects.filter((item) => getProjectRisk(item).level === "高").length;
  const dueThisWeek = projects.filter((item) => {
    const dueIn = diffDays(parseDate(item.planFinish), new Date());
    return dueIn >= 0 && dueIn <= 7 && item.status !== "已完成";
  }).length;
  const todayReminders = projects.filter((item) => reminderStatus(item) === "今日提醒").length;
  const cards = [
    ["当前项目总数", String(projects.length), "含在途、暂停和已完成项目", "#a4482f"],
    ["在途项目", String(active), "不含已完成和已暂停", "#23404d"],
    ["高风险项目", String(highRisk), "超期、阻塞或长期未更新", "#b67c1f"],
    ["今日提醒", String(todayReminders), `本周到期 ${dueThisWeek} 个`, "#2f7252"],
  ];
  elements.summaryGrid.innerHTML = cards.map(([label, value, note, tone]) => `
    <article class="summary-card" style="background: linear-gradient(135deg, rgba(255,250,241,0.96), ${tint(tone, 0.18)})">
      <div class="summary-card-label">${escapeHtml(label)}</div>
      <div class="summary-card-value">${escapeHtml(value)}</div>
      <div class="summary-card-note">${escapeHtml(note)}</div>
    </article>`).join("");
}

function renderUrgentList(projects) {
  const urgent = [...projects]
    .map((project) => ({ project, risk: getProjectRisk(project) }))
    .sort((left, right) => right.risk.urgencyScore - left.risk.urgencyScore)
    .slice(0, 5);
  elements.urgentList.innerHTML = urgent.map(({ project, risk }) => `
    <article class="urgent-item">
      <button type="button" data-open-project="${escapeHtml(project.id)}">
        <div class="urgent-item-title">
          <span>${escapeHtml(project.title)}</span>
          <span class="${riskChip(risk.level)}">${escapeHtml(risk.level)}风险</span>
        </div>
        <p class="project-author">${escapeHtml(project.owner)} · ${escapeHtml(project.status)} · ${escapeHtml(project.currentNode)}</p>
        <p class="mini-text">提醒：${escapeHtml(project.reminderPerson)} · ${escapeHtml(reminderTimeText(project.reminderDate))} · ${escapeHtml(reminderStatus(project))}</p>
        <p class="mini-text">${escapeHtml(risk.reasons.join(" / "))}</p>
      </button>
    </article>`).join("") || `<div class="empty-state">当前没有需要优先处理的项目。</div>`;
}

function renderBoard(projects) {
  const scopedProjects = visibleProjects();
  elements.boardMeta.textContent = `当前身份可见 ${scopedProjects.length} 个项目，筛选后显示 ${projects.length} 个`;
  elements.boardGrid.innerHTML = STATUS_ORDER.map((status) => {
    const list = projects.filter((item) => item.status === status);
    const meta = STATUS_META[status];
    return `
      <section class="stage-column" style="--column-tone: ${meta.tone}">
        <div class="stage-header">
          <div class="stage-title-row">
            <div>
              <h3 class="stage-title">${escapeHtml(status)}</h3>
              <p class="stage-meta">${escapeHtml(meta.description)}</p>
            </div>
            <span class="stage-count">${list.length} 本</span>
          </div>
        </div>
        <div class="stage-cards">
          ${list.length ? list.map((project) => {
            const risk = getProjectRisk(project);
            return `
              <article class="project-card" style="background: linear-gradient(180deg, rgba(255,255,255,0.9), ${tint(meta.tone, 0.08)})">
                <button type="button" data-open-project="${escapeHtml(project.id)}">
                  <div class="project-card-top">
                    <div>
                      <h3 class="project-title">${escapeHtml(project.title)}</h3>
                      <div class="project-author">${escapeHtml(project.author)} · ${escapeHtml(project.code)}</div>
                    </div>
                    <span class="${riskChip(risk.level)}">${escapeHtml(risk.level)}风险</span>
                  </div>
                  <div class="project-card-meta">
                    <div>负责人：${escapeHtml(project.owner)}</div>
                    <div>合作方：${escapeHtml(project.partner || "未设置")}</div>
                    <div>当前节点：${escapeHtml(project.currentNode)}</div>
                    <div>提醒：${escapeHtml(project.reminderPerson)} · ${escapeHtml(reminderTimeText(project.reminderDate))} · ${escapeHtml(reminderStatus(project))}</div>
                  </div>
                </button>
              </article>`;
          }).join("") : `<div class="empty-state">当前筛选条件下，这一列没有项目。</div>`}
        </div>
      </section>`;
  }).join("");
}

function renderPersonBoard(projects) {
  const members = state.teamMembers;
  const scopedProjects = visibleProjects();
  const busy = members.filter((member) => projects.some((item) => item.owner === member.name && !["已完成", "已暂停"].includes(item.status))).length;
  elements.personBoardMeta.textContent = `共 ${members.length} 位成员，当前有 ${busy} 位成员手上有在途项目`;
  elements.personBoardGrid.innerHTML = members.map((member) => {
    const myProjects = projects.filter((item) => item.owner === member.name && !["已完成"].includes(item.status));
    const highRisk = myProjects.filter((item) => getProjectRisk(item).level === "高").length;
    const reminders = scopedProjects.filter((item) => item.reminderPerson === member.name && reminderStatus(item) === "今日提醒").length;
    return `
      <article class="person-card">
        <div class="person-card-top">
          <div>
            <h3>${escapeHtml(member.name)}</h3>
            <div class="project-author">${escapeHtml(member.role)} · ${escapeHtml(member.department)}</div>
          </div>
          <div class="chip-row">
            <span class="chip chip-status">在途 ${myProjects.filter((item) => !["已暂停"].includes(item.status)).length}</span>
            <span class="${riskChip(highRisk > 0 ? "高" : reminders > 0 ? "中" : "低")}">提醒 ${reminders}</span>
          </div>
        </div>
        <div class="person-project-list">
          ${myProjects.length ? myProjects.map((project) => `
            <div class="person-project-item">
              <button type="button" data-open-project="${escapeHtml(project.id)}">
                <strong>${escapeHtml(project.title)}</strong>
                <div class="mini-text">${escapeHtml(project.status)} · ${escapeHtml(project.currentNode)} · 合作方 ${escapeHtml(project.partner || "未设置")}</div>
              </button>
            </div>`).join("") : `<div class="empty-state">当前没有分配到项目。</div>`}
        </div>
      </article>`;
  }).join("");
}

function adminCards() {
  const activeOwners = new Set(state.projects.filter((item) => !["已完成", "已暂停"].includes(item.status)).map((item) => item.owner)).size;
  return [
    ["人员总数", String(state.teamMembers.length), "含编辑、主管和协同支持", "#23404d"],
    ["合作方总数", String(getPartners().length), "项目录入时通过选择进入", "#a4482f"],
    ["角色模板", "4", "当前使用四类标准角色", "#697443"],
    ["在途负责人", String(activeOwners), "当前至少有一个在途项目的成员", "#b67c1f"],
  ];
}

function renderAdminSummary() {
  elements.adminSummaryGrid.innerHTML = adminCards().map(([label, value, note, tone]) => `
    <article class="summary-card" style="background: linear-gradient(135deg, rgba(255,250,241,0.96), ${tint(tone, 0.18)})">
      <div class="summary-card-label">${escapeHtml(label)}</div>
      <div class="summary-card-value">${escapeHtml(value)}</div>
      <div class="summary-card-note">${escapeHtml(note)}</div>
    </article>`).join("");
}

function renderAdminNav() {
  const tabs = [
    ["overview", "后台概览", "先看整体配置状态"],
    ["ai", "AI 管家", "自然语言理解和后台问答"],
    ["users", "人员录入", "人员名单、角色和部门"],
    ["permissions", "权限分配", "按角色查看权限矩阵"],
    ["partners", "合作方管理", "合作方主数据和项目引用"],
    ["workflow", "流程节点配置", "节点说明、提醒角色和标准节奏"],
  ];
  const visibleTabs = tabs.filter(([key]) => allowedAdminTabs().includes(key));
  elements.adminTabNav.innerHTML = visibleTabs.map(([key, title, desc]) => `
    <button type="button" class="admin-nav-button ${state.adminTab === key ? "is-active" : ""}" data-admin-tab="${key}">
      <strong>${escapeHtml(title)}</strong>
      <span class="mini-text">${escapeHtml(desc)}</span>
    </button>`).join("") || `<div class="empty-state">当前身份没有后台配置权限。</div>`;
}

function buildAiContext() {
  const highRisk = state.projects.filter((project) => getProjectRisk(project).level === "高");
  const reminders = state.projects.filter((project) => reminderStatus(project) === "今日提醒");
  const active = state.projects.filter((project) => !["已完成", "已暂停"].includes(project.status));
  return [
    `当前用户：${currentUser().name} / ${currentUser().role}`,
    `项目总数：${state.projects.length}，在途项目：${active.length}，高风险：${highRisk.length}，今日提醒：${reminders.length}`,
    `高风险项目：${highRisk.slice(0, 5).map((project) => `${project.code}《${project.title}》${project.status}/${project.currentNode}`).join("；") || "暂无"}`,
    `人员：${state.teamMembers.map((member) => `${member.name}(${member.role})`).join("、")}`,
  ].join("\n");
}

function renderAiPanel() {
  const suggestions = [
    "帮我看一下今天有哪些订单风险，需要先处理什么？",
    "把“明天下午三点提醒张莹催 BK-2026-005 合同回签”整理成可执行提醒。",
    "帮我设计一个成品尺寸质检规则，要求拍到卷尺和产品边缘。",
  ];
  elements.adminContent.innerHTML = `
    <section class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h3>后台 AI 管家</h3>
          <div class="mini-text">模型：云雾 / deepseek-v4-flash。当前先做后台问答和自然语言整理，不直接改数据库。</div>
        </div>
        <span class="chip chip-status">${state.aiPending ? "思考中" : "已接入"}</span>
      </div>
      <div class="ai-suggestions">
        ${suggestions.map((item) => `<button type="button" class="button button-muted" data-ai-prompt="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
      </div>
      <div class="ai-chat-log" id="aiChatLog">
        ${state.aiChat.map((message) => `
          <div class="ai-message ai-message-${message.role === "assistant" ? "assistant" : "user"}">
            <div class="ai-message-role">${message.role === "assistant" ? "AI 管家" : "我"}</div>
            <div class="ai-message-content">${formatMessageText(message.content)}</div>
          </div>`).join("")}
        ${state.aiPending ? `<div class="ai-message ai-message-assistant"><div class="ai-message-role">AI 管家</div><div class="ai-message-content">正在整理……</div></div>` : ""}
      </div>
      ${state.aiError ? `<div class="ai-error">${escapeHtml(state.aiError)}</div>` : ""}
      <form class="ai-chat-form" id="aiChatForm">
        <textarea name="message" rows="3" placeholder="例如：帮我把明天下午三点提醒张莹催 BK-2026-005 合同回签，整理成订单提醒"></textarea>
        <button type="submit" class="button button-primary" ${state.aiPending ? "disabled" : ""}>发送给 AI 管家</button>
      </form>
    </section>`;
  const log = document.getElementById("aiChatLog");
  if (log) log.scrollTop = log.scrollHeight;
}

async function sendAiChatMessage(message) {
  const content = String(message || "").trim();
  if (!content || state.aiPending) return;
  state.aiChat.push({ role: "user", content });
  state.aiPending = true;
  state.aiError = "";
  render();
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content,
        history: state.aiChat.slice(-8),
        context: buildAiContext(),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || result.message || "AI 管家请求失败");
    state.aiChat.push({ role: "assistant", content: result.reply || "我没有得到有效回复，请换一种说法再试。" });
  } catch (error) {
    state.aiError = error instanceof Error ? error.message : String(error);
    state.aiChat.push({ role: "assistant", content: "这次没有连上 AI 管家。请稍后再试，或检查后台大模型环境变量配置。" });
  } finally {
    state.aiPending = false;
    render();
  }
}

function renderAdminContent() {
  if (!canAccessAdmin()) {
    elements.adminTitle.textContent = "后台权限未开放";
    elements.adminMeta.textContent = "当前身份可以继续使用前台看板，但不能进入配置区。";
    elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="settings-panel">
          <h3>当前状态</h3>
          <div class="mini-text">人员、权限、合作方和流程节点配置只对有权限的角色开放。现在可以在右上角切换为管理员或项目主管继续演示。</div>
        </section>
      </div>`;
    return;
  }
  const titles = {
    overview: ["后台概览", "适合先确认人员、合作方、权限和流程节点是否齐。"],
    ai: ["AI 管家", "已接入云雾 DeepSeek V4 Flash，用来理解自然语言并辅助整理订单动作。"],
    users: ["人员录入", `当前共 ${state.teamMembers.length} 名成员。`],
    permissions: ["权限分配", "当前可以在这里调整角色权限矩阵。"],
    partners: ["合作方管理", `当前已整理 ${getPartners().length} 个合作方，项目录入时已改成通过选择进入。`],
    workflow: ["流程节点配置", "节点名称、提醒角色和标准节奏先在后台集中展示。"],
  };
  elements.adminTitle.textContent = titles[state.adminTab][0];
  elements.adminMeta.textContent = titles[state.adminTab][1];

  if (state.adminTab === "overview") {
    elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="data-panel">
          <h3>当前已接上的后台能力</h3>
          <div class="inline-chips">
            <span class="chip chip-status">前后台切换</span>
            <span class="chip chip-status">按项目 / 按人员双视图</span>
            <span class="chip chip-status">人员模块</span>
            <span class="chip chip-status">权限矩阵</span>
            <span class="chip chip-status">合作方管理</span>
            <span class="chip chip-status">流程节点配置</span>
          </div>
        </section>
        <section class="settings-panel">
          <h3>当前后台数据状态</h3>
          <div class="mini-text">人员、合作方、权限矩阵和流程节点都已经切换到可保存的数据源，下面几个模块会继续把新增和编辑动作接上。</div>
        </section>
      </div>`;
    return;
  }

  if (state.adminTab === "ai") {
    renderAiPanel();
    return;
  }

  if (state.adminTab === "users") {
    const canManageUsers = hasPermission("管理人员");
    elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="data-panel">
          <div class="table-toolbar">
            <div>
              <h3>成员列表</h3>
              <div class="mini-text">支持新增、编辑和切换身份。</div>
            </div>
            <button type="button" class="button button-primary" data-admin-action="add-user" ${canManageUsers ? "" : "disabled"}>新增人员</button>
          </div>
        </section>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>姓名</th><th>角色</th><th>部门</th><th>企微账号</th><th>在途项目</th><th>今日提醒</th><th>操作</th></tr></thead>
          <tbody>
            ${state.teamMembers.map((member) => `
              <tr>
                <td>${escapeHtml(member.name)}</td>
                <td><span class="permission-badge">${escapeHtml(member.role)}</span></td>
                <td>${escapeHtml(member.department)}</td>
                <td>${escapeHtml(member.wecomUserId || "未设置")}</td>
                <td>${state.projects.filter((item) => item.owner === member.name && !["已完成", "已暂停"].includes(item.status)).length}</td>
                <td>${state.projects.filter((item) => item.reminderPerson === member.name && reminderStatus(item) === "今日提醒").length}</td>
                <td><button type="button" class="table-action" data-admin-action="edit-user" data-member-id="${escapeHtml(member.id)}" ${canManageUsers ? "" : "disabled"}>编辑</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    return;
  }

  if (state.adminTab === "permissions") {
    const canManagePermissions = hasPermission("管理权限");
    elements.adminContent.innerHTML = `
      <div class="permission-panel">
        <table class="permission-table">
          <thead><tr><th>权限项</th><th>说明</th><th>超级管理员</th><th>项目主管</th><th>编辑</th><th>协同支持</th></tr></thead>
          <tbody>
            ${state.permissionRows.map((row, index) => `
              <tr>
                <td>${escapeHtml(row.label)}</td>
                <td>${escapeHtml(row.description)}</td>
                <td><input type="checkbox" ${row.values.admin === "是" ? "checked" : ""} data-permission-index="${index}" data-permission-role="admin" ${canManagePermissions ? "" : "disabled"} /></td>
                <td><input type="checkbox" ${row.values.manager === "是" ? "checked" : ""} data-permission-index="${index}" data-permission-role="manager" ${canManagePermissions ? "" : "disabled"} /></td>
                <td><input type="checkbox" ${row.values.editor === "是" ? "checked" : ""} data-permission-index="${index}" data-permission-role="editor" ${canManagePermissions ? "" : "disabled"} /></td>
                <td><input type="checkbox" ${row.values.support === "是" ? "checked" : ""} data-permission-index="${index}" data-permission-role="support" ${canManagePermissions ? "" : "disabled"} /></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
    return;
  }

  if (state.adminTab === "partners") {
    const canManagePartners = hasPermission("管理合作方");
    elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="data-panel">
          <div class="table-toolbar">
            <div>
              <h3>合作方主数据</h3>
              <div class="mini-text">项目录入时通过下拉选择进入。</div>
            </div>
            <button type="button" class="button button-primary" data-admin-action="add-partner" ${canManagePartners ? "" : "disabled"}>新增合作方</button>
          </div>
        </section>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>合作方</th><th>当前项目数</th><th>高风险项目</th><th>说明</th><th>操作</th></tr></thead>
          <tbody>
            ${getPartners().map((partner) => {
              const partnerProjects = state.projects.filter((item) => item.partner === partner);
              const highRisk = partnerProjects.filter((item) => getProjectRisk(item).level === "高").length;
              return `
                <tr>
                  <td>${escapeHtml(partner)}</td>
                  <td>${partnerProjects.length}</td>
                  <td>${highRisk}</td>
                  <td>${partner === "自有项目" ? "内部项目，不对应外部合作方" : "项目录入时通过选择进入"}</td>
                  <td><button type="button" class="table-action" data-admin-action="edit-partner" data-partner-name="${escapeHtml(partner)}" ${canManagePartners ? "" : "disabled"}>编辑</button></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
    return;
  }

  const canManageWorkflow = hasPermission("管理流程节点");
  elements.adminContent.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead><tr><th>节点</th><th>默认负责人角色</th><th>默认提醒角色</th><th>标准周期（天）</th></tr></thead>
        <tbody>
          ${state.workflowConfig.map((node) => `
            <tr>
              <td>${escapeHtml(node.name)}</td>
              <td><input type="text" value="${escapeHtml(node.ownerRole)}" data-workflow-index="${state.workflowConfig.indexOf(node)}" data-workflow-field="ownerRole" ${canManageWorkflow ? "" : "disabled"} /></td>
              <td><input type="text" value="${escapeHtml(node.reminderRole)}" data-workflow-index="${state.workflowConfig.indexOf(node)}" data-workflow-field="reminderRole" ${canManageWorkflow ? "" : "disabled"} /></td>
              <td><input type="number" value="${node.cycle}" data-workflow-index="${state.workflowConfig.indexOf(node)}" data-workflow-field="cycle" ${canManageWorkflow ? "" : "disabled"} /></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderDrawer() {
  const project = state.projects.find((item) => item.id === state.selectedProjectId);
  if (!project) {
    elements.drawer.classList.remove("is-open");
    elements.drawer.setAttribute("aria-hidden", "true");
    elements.drawerContent.innerHTML = "";
    return;
  }
  const risk = getProjectRisk(project);
  const canEditProject = hasPermission("编辑项目状态");
  elements.drawerContent.innerHTML = `
    <div class="drawer-content">
      <header class="drawer-header">
        <div>
          <p class="section-kicker">项目详情</p>
          <h2 class="drawer-title">${escapeHtml(project.title)}</h2>
          <p class="project-author">${escapeHtml(project.author)} · ${escapeHtml(project.summary)}</p>
        </div>
        <div class="chip-row">
          <span class="chip chip-status">${escapeHtml(project.status)}</span>
          <span class="${riskChip(risk.level)}">${escapeHtml(risk.level)}风险</span>
        </div>
      </header>
      <section class="detail-card">
        <h3>概览</h3>
        <div class="overview-grid">
          <div class="overview-item"><span>项目编号</span><strong>${escapeHtml(project.code)}</strong></div>
          <div class="overview-item"><span>负责人</span><strong>${escapeHtml(project.owner)}</strong></div>
          <div class="overview-item"><span>合作方</span><strong>${escapeHtml(project.partner || "未设置")}</strong></div>
          <div class="overview-item"><span>当前节点</span><strong>${escapeHtml(project.currentNode)}</strong></div>
          <div class="overview-item"><span>提醒人</span><strong>${escapeHtml(project.reminderPerson)}</strong></div>
          <div class="overview-item"><span>提醒时间</span><strong>${escapeHtml(reminderTimeText(project.reminderDate))}</strong></div>
        </div>
      </section>
      <section class="detail-card">
        <h3>风险与动作</h3>
        <div class="detail-actions">
          <button type="button" class="button button-secondary" data-drawer-action="edit" ${canEditProject ? "" : "disabled"}>编辑项目</button>
          <button type="button" class="button button-secondary" data-drawer-action="pause" ${canEditProject ? "" : "disabled"}>${project.status === "已暂停" ? "恢复项目" : "暂停项目"}</button>
          <button type="button" class="button button-primary" data-drawer-action="complete" ${canEditProject ? "" : "disabled"}>标记完成</button>
        </div>
        <p class="mini-text">${escapeHtml(risk.reasons.join(" / "))}</p>
      </section>
    </div>`;
  elements.drawer.classList.add("is-open");
  elements.drawer.setAttribute("aria-hidden", "false");
}

function openProject(projectId) {
  state.selectedProjectId = projectId;
  renderDrawer();
}

function closeDrawer() {
  state.selectedProjectId = null;
  renderDrawer();
}

function openModal(project) {
  if (!hasPermission("编辑项目状态")) return;
  const current = project || null;
  elements.modalTitle.textContent = current ? "编辑项目" : "新建项目";
  elements.formInternalId.value = current ? current.id : "";
  elements.formTitle.value = current ? current.title : "";
  elements.formAuthor.value = current ? current.author : "";
  elements.formCode.value = current ? current.code : "";
  elements.formOwner.value = current ? current.owner : currentUser().name;
  elements.formPartner.value = current ? current.partner : "";
  elements.formStatus.value = current ? current.status : "待启动";
  elements.formCurrentNode.value = current ? current.currentNode : "作者沟通";
  elements.formPlanFinish.value = current ? dateString(current.planFinish) : dateString(addDays(new Date(), 14));
  elements.formSummary.value = current ? current.summary : "";
  elements.formNextAction.value = current ? current.nextAction : "";
  elements.formRiskNote.value = current ? current.riskNote : "";
  elements.formReminderPerson.value = current ? current.reminderPerson : currentUser().name;
  elements.formReminderDate.value = current ? dateTimeInputValue(current.reminderDate) : dateTimeInputValue(new Date());
  elements.projectModal.classList.add("is-open");
  elements.projectModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  elements.projectModal.classList.remove("is-open");
  elements.projectModal.setAttribute("aria-hidden", "true");
  elements.projectForm.reset();
}

function openAdminModal(mode, payload) {
  if (mode === "user" && !hasPermission("管理人员")) return;
  if (mode === "partner" && !hasPermission("管理合作方")) return;
  state.adminEditingMode = mode;
  state.adminEditingId = payload?.id || payload || "";
  if (mode === "user") {
    const member = state.teamMembers.find((item) => item.id === state.adminEditingId);
    elements.adminModalTitle.textContent = member ? "编辑人员" : "新增人员";
    elements.adminModalContent.innerHTML = `
      <form id="adminUserForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field"><span>姓名</span><input name="name" type="text" value="${escapeHtml(member?.name || "")}" required /></label>
          <label class="field"><span>角色</span>
            <select name="role">
              ${["超级管理员", "项目主管", "编辑", "协同支持"].map((role) => `<option value="${escapeHtml(role)}" ${member?.role === role ? "selected" : ""}>${escapeHtml(role)}</option>`).join("")}
            </select>
          </label>
          <label class="field"><span>部门</span><input name="department" type="text" value="${escapeHtml(member?.department || "")}" required /></label>
          <label class="field field-full"><span>企微账号 UserId</span><input name="wecomUserId" type="text" value="${escapeHtml(member?.wecomUserId || "")}" placeholder="例如 zhouwen" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存人员</button>
        </div>
      </form>`;
  }
  if (mode === "partner") {
    const partnerName = String(state.adminEditingId || "");
    elements.adminModalTitle.textContent = partnerName ? "编辑合作方" : "新增合作方";
    elements.adminModalContent.innerHTML = `
      <form id="adminPartnerForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field field-full"><span>合作方名称</span><input name="name" type="text" value="${escapeHtml(partnerName)}" required /></label>
          <label class="field field-full"><span>说明</span><input name="note" type="text" value="${partnerName === "自有项目" ? "内部项目，不对应外部合作方" : "项目录入时通过选择进入"}" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存合作方</button>
        </div>
      </form>`;
  }
  elements.adminModal.classList.add("is-open");
  elements.adminModal.setAttribute("aria-hidden", "false");
}

function closeAdminModal() {
  state.adminEditingMode = "";
  state.adminEditingId = "";
  elements.adminModal.classList.remove("is-open");
  elements.adminModal.setAttribute("aria-hidden", "true");
  elements.adminModalContent.innerHTML = "";
}

async function saveProjectFromForm() {
  if (!hasPermission("编辑项目状态")) return;
  const now = new Date();
  const existing = state.projects.find((item) => item.id === elements.formInternalId.value);
  const status = elements.formStatus.value;
  const currentNode = elements.formCurrentNode.value;
  const owner = elements.formOwner.value.trim();
  const reminderDate = dateTimeString(elements.formReminderDate.value || new Date());
  const project = normalizeProject({
    id: existing ? existing.id : uid(),
    source: existing ? existing.source : "custom",
    code: elements.formCode.value.trim(),
    title: elements.formTitle.value.trim(),
    author: elements.formAuthor.value.trim(),
    owner,
    partner: elements.formPartner.value,
    status,
    currentNode,
    startDate: existing ? existing.startDate : dateString(now),
    planFinish: elements.formPlanFinish.value,
    updatedAt: dateTimeString(now),
    createdAt: existing ? existing.createdAt : dateTimeString(now),
    summary: elements.formSummary.value.trim(),
    nextAction: elements.formNextAction.value.trim(),
    riskNote: elements.formRiskNote.value.trim(),
    reminderPerson: elements.formReminderPerson.value.trim() || owner,
    reminderDate,
    nodes: buildNodes(parseDate(existing ? existing.startDate : now), owner, status, currentNode, elements.formReminderPerson.value.trim() || owner, reminderDate, status === "已暂停" ? currentNode : ""),
    followUps: [{ time: dateTimeString(now), user: owner, progress: existing ? "更新了项目信息" : "创建了项目", nextAction: elements.formNextAction.value.trim() || "待补充下一步动作" }, ...(existing?.followUps || [])],
    logs: [{ time: dateTimeString(now), actor: owner, action: existing ? "编辑项目" : "创建项目", detail: `状态为「${status}」，当前节点为「${currentNode}」。` }, ...(existing?.logs || [])],
  });
  state.projects = existing ? state.projects.map((item) => (item.id === project.id ? project : item)) : [project, ...state.projects];
  saveProjects();
  await flushRemoteSync();
  closeModal();
  render();
}

function resetFilters() {
  state.filters = { search: "", owner: "全部", status: "全部", risk: "全部", update: "全部", reminder: "全部" };
  elements.searchInput.value = "";
  render();
}

function handleDrawerAction(action) {
  if (!hasPermission("编辑项目状态")) return;
  const current = state.projects.find((item) => item.id === state.selectedProjectId);
  if (!current) return;
  if (action === "edit") {
    openModal(current);
    return;
  }
  if (action === "pause") {
    current.status = current.status === "已暂停" ? "作者沟通中" : "已暂停";
    current.updatedAt = dateTimeString(new Date());
    current.nodes = buildNodes(parseDate(current.startDate), current.owner, current.status, current.currentNode, current.reminderPerson, current.reminderDate, current.status === "已暂停" ? current.currentNode : "");
  }
  if (action === "complete") {
    current.status = "已完成";
    current.currentNode = "尾印单";
    current.updatedAt = dateTimeString(new Date());
    current.nodes = buildNodes(parseDate(current.startDate), current.owner, current.status, current.currentNode, current.reminderPerson, current.reminderDate, "");
  }
  saveProjects();
  render();
}

function renameMemberAcrossProjects(previousName, nextName) {
  state.projects = state.projects.map((project) => ({
    ...project,
    owner: project.owner === previousName ? nextName : project.owner,
    reminderPerson: project.reminderPerson === previousName ? nextName : project.reminderPerson,
    nodes: project.nodes.map((node) => ({
      ...node,
      owner: node.owner === previousName ? nextName : node.owner,
      reminderPerson: node.reminderPerson === previousName ? nextName : node.reminderPerson,
    })),
  }));
  saveProjects();
}

function renamePartnerAcrossProjects(previousName, nextName) {
  state.projects = state.projects.map((project) => ({
    ...project,
    partner: project.partner === previousName ? nextName : project.partner,
  }));
  saveProjects();
}

function renderViewState() {
  const adminAvailable = canAccessAdmin();
  if (!adminAvailable && state.currentView === "admin") {
    state.currentView = "board";
  }
  elements.boardView.classList.toggle("is-hidden", state.currentView !== "board");
  elements.adminView.classList.toggle("is-hidden", state.currentView !== "admin");
  [...elements.viewToggle.querySelectorAll("[data-view]")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.currentView);
    if (button.dataset.view === "admin") {
      button.disabled = !adminAvailable;
      button.title = adminAvailable ? "" : "当前身份没有后台配置权限";
    }
  });
  [...elements.frontDisplayToggle.querySelectorAll("[data-display-mode]")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.displayMode === state.displayMode);
  });
  document.getElementById("boardSection").style.display = state.displayMode === "project" ? "" : "none";
  elements.personBoardSection.style.display = state.displayMode === "person" ? "" : "none";
}

function render() {
  const tabs = allowedAdminTabs();
  if (canAccessAdmin() && !tabs.includes(state.adminTab)) state.adminTab = tabs[0];
  renderClock();
  renderIdentity();
  syncFiltersAndForm();
  renderNoticeBar();
  renderViewState();
  const projects = filteredProjects();
  renderSummary(projects);
  renderUrgentList(projects);
  renderBoard(projects);
  renderPersonBoard(projects);
  renderAdminSummary();
  renderAdminNav();
  renderAdminContent();
  renderDrawer();
}

function attachEvents() {
  elements.viewToggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (!button) return;
    if (button.dataset.view === "admin" && !canAccessAdmin()) return;
    state.currentView = button.dataset.view;
    render();
  });

  elements.frontDisplayToggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-display-mode]");
    if (!button) return;
    state.displayMode = button.dataset.displayMode;
    render();
  });

  elements.currentUserSelect.addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    saveSettings();
    render();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    render();
  });

  elements.ownerFilter.addEventListener("change", (event) => {
    state.filters.owner = event.target.value;
    render();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    render();
  });

  elements.riskFilter.addEventListener("change", (event) => {
    state.filters.risk = event.target.value;
    render();
  });

  elements.updateFilter.addEventListener("change", (event) => {
    state.filters.update = event.target.value;
    render();
  });

  elements.reminderFilter.addEventListener("change", (event) => {
    state.filters.reminder = event.target.value;
    render();
  });

  elements.resetFiltersButton.addEventListener("click", resetFilters);
  elements.newProjectButton.addEventListener("click", () => openModal(null));
  elements.resetDemoButton.addEventListener("click", async () => {
    try {
      if (runtime.apiReady) {
        await resetRemoteState();
      } else {
        state.projects = seedProjects();
        saveProjects();
      }
    } catch (error) {
      runtime.lastError = error instanceof Error ? error.message : String(error);
      state.projects = seedProjects();
      saveProjects();
    }
    render();
  });

  elements.urgentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-project]");
    if (button) openProject(button.dataset.openProject);
  });

  elements.boardGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-project]");
    if (button) openProject(button.dataset.openProject);
  });

  elements.personBoardGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-project]");
    if (button) openProject(button.dataset.openProject);
  });

  elements.adminTabNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-tab]");
    if (!button) return;
    if (!allowedAdminTabs().includes(button.dataset.adminTab)) return;
    state.adminTab = button.dataset.adminTab;
    render();
  });

  elements.adminContent.addEventListener("click", (event) => {
    const aiPromptButton = event.target.closest("[data-ai-prompt]");
    if (aiPromptButton) {
      void sendAiChatMessage(aiPromptButton.dataset.aiPrompt);
      return;
    }
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    if (button.dataset.adminAction === "add-user") openAdminModal("user", null);
    if (button.dataset.adminAction === "edit-user") openAdminModal("user", { id: button.dataset.memberId });
    if (button.dataset.adminAction === "add-partner") openAdminModal("partner", "");
    if (button.dataset.adminAction === "edit-partner") openAdminModal("partner", button.dataset.partnerName);
  });

  elements.adminContent.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.permissionIndex) {
      if (!hasPermission("管理权限")) return;
      const row = state.permissionRows[Number(target.dataset.permissionIndex)];
      row.values[target.dataset.permissionRole] = target.checked ? "是" : "否";
      saveSettings();
      return;
    }
    if (target.dataset.workflowIndex) {
      if (!hasPermission("管理流程节点")) return;
      const item = state.workflowConfig[Number(target.dataset.workflowIndex)];
      item[target.dataset.workflowField] = target.dataset.workflowField === "cycle" ? Number(target.value) || 0 : target.value;
      saveSettings();
    }
  });

  elements.adminContent.addEventListener("submit", (event) => {
    if (event.target.id !== "aiChatForm") return;
    event.preventDefault();
    const formData = new FormData(event.target);
    const message = String(formData.get("message") || "").trim();
    event.target.reset();
    void sendAiChatMessage(message);
  });

  elements.drawerContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drawer-action]");
    if (button) handleDrawerAction(button.dataset.drawerAction);
  });

  elements.drawerBackdrop.addEventListener("click", closeDrawer);
  elements.drawerCloseButton.addEventListener("click", closeDrawer);
  elements.modalBackdrop.addEventListener("click", closeModal);
  elements.modalCloseButton.addEventListener("click", closeModal);
  elements.modalCancelButton.addEventListener("click", closeModal);
  elements.adminModalBackdrop.addEventListener("click", closeAdminModal);
  elements.adminModalCloseButton.addEventListener("click", closeAdminModal);
  elements.projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveProjectFromForm();
  });
  elements.adminModalContent.addEventListener("click", (event) => {
    if (event.target.closest("[data-admin-close]")) closeAdminModal();
  });
  elements.adminModalContent.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target.id === "adminUserForm") {
      if (!hasPermission("管理人员")) return;
      const formData = new FormData(event.target);
      const existing = state.teamMembers.find((item) => item.id === state.adminEditingId);
      const nextName = String(formData.get("name") || "").trim();
      const nextRole = String(formData.get("role") || "").trim();
      const nextDepartment = String(formData.get("department") || "").trim();
      const nextWecomUserId = String(formData.get("wecomUserId") || "").trim();
      if (existing) {
        if (existing.name !== nextName) renameMemberAcrossProjects(existing.name, nextName);
        existing.name = nextName;
        existing.role = nextRole;
        existing.department = nextDepartment;
        existing.wecomUserId = nextWecomUserId;
      } else {
        state.teamMembers.push({ id: uid(), name: nextName, role: nextRole, department: nextDepartment, wecomUserId: nextWecomUserId });
      }
      saveSettings();
      await flushRemoteSync();
      closeAdminModal();
      render();
    }
    if (event.target.id === "adminPartnerForm") {
      if (!hasPermission("管理合作方")) return;
      const formData = new FormData(event.target);
      const nextName = String(formData.get("name") || "").trim();
      const previousName = String(state.adminEditingId || "");
      if (previousName && previousName !== nextName) renamePartnerAcrossProjects(previousName, nextName);
      if (previousName) {
        state.partners = state.partners.map((item) => (item === previousName ? nextName : item));
      } else if (!state.partners.includes(nextName)) {
        state.partners.push(nextName);
      }
      state.partners = [...new Set(state.partners.filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
      saveSettings();
      await flushRemoteSync();
      closeAdminModal();
      render();
    }
  });
  elements.formStatus.addEventListener("change", (event) => {
    elements.formCurrentNode.value = STATUS_TO_NODE[event.target.value] || "作者沟通";
  });
}

loadSettings();
state.projects = loadProjects();
saveProjects();
saveSettings();
attachEvents();
render();
void hydrateRemoteState();
