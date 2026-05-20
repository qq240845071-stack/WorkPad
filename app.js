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
const DEFAULT_BUSINESS_LINE_ID = "line-publishing";

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

const NODE_TO_STATUS = {
  作者沟通: "作者沟通中",
  排版: "排版校稿中",
  一校: "排版校稿中",
  二校: "排版校稿中",
  三校: "排版校稿中",
  样书: "样书处理中",
  成品: "成品制作中",
  合同: "合同处理中",
  送货: "送货处理中",
  尾印单: "尾印单处理中",
};

const TEAM_MEMBERS = [
  { id: "user-zhou", name: "周雯", role: "超级管理员", department: "出版一组", wecomUserId: "" },
  { id: "user-xu", name: "许畅", role: "项目主管", department: "出版二组", wecomUserId: "" },
  { id: "user-wang", name: "王黎", role: "编辑", department: "出版二组", wecomUserId: "" },
  { id: "user-liu", name: "刘珂", role: "编辑", department: "少儿编辑部", wecomUserId: "" },
  { id: "user-chen", name: "陈敏", role: "协同支持", department: "法务支持", wecomUserId: "" },
  { id: "user-sun", name: "孙妍", role: "协同支持", department: "发行支持", wecomUserId: "" },
];

const DEFAULT_DEPARTMENTS = ["出版一组", "出版二组", "少儿编辑部", "法务支持", "发行支持", "未分配部门"];

const DEFAULT_ROLES = [
  { key: "admin", name: "超级管理员", description: "拥有全部后台配置权限", locked: true },
  { key: "manager", name: "项目主管", description: "管理项目、合作方和流程配置", locked: true },
  { key: "editor", name: "编辑", description: "推进项目状态、节点和提醒", locked: true },
  { key: "support", name: "协同支持", description: "接收协同提醒和处理支持事项", locked: true },
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
  { id: "node-author", name: "作者沟通", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { id: "node-layout", name: "排版", ownerRole: "编辑", reminderRole: "项目主管", cycle: 4 },
  { id: "node-proof-1", name: "一校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { id: "node-proof-2", name: "二校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { id: "node-proof-3", name: "三校", ownerRole: "编辑", reminderRole: "项目主管", cycle: 5 },
  { id: "node-sample", name: "样书", ownerRole: "编辑", reminderRole: "协同支持", cycle: 4 },
  { id: "node-product", name: "成品", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 6 },
  { id: "node-contract", name: "合同", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 4 },
  { id: "node-delivery", name: "送货", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 3 },
  { id: "node-tail-print", name: "尾印单", ownerRole: "协同支持", reminderRole: "编辑", cycle: 3 },
];

const DEFAULT_BUSINESS_LINES = [
  {
    id: DEFAULT_BUSINESS_LINE_ID,
    name: "出版类业务线",
    workflowName: "出版标准流程",
    description: "出稿、排版校稿、样书、成品、合同、送货和尾印单。",
    nodes: WORKFLOW_CONFIG,
  },
  {
    id: "line-design",
    name: "设计类业务线",
    workflowName: "设计交付流程",
    description: "适合封面、版式、物料和视觉设计项目。",
    nodes: [
      { id: "design-brief", name: "需求沟通", ownerRole: "编辑", reminderRole: "项目主管", cycle: 2 },
      { id: "design-style", name: "风格确认", ownerRole: "编辑", reminderRole: "项目主管", cycle: 2 },
      { id: "design-draft", name: "初稿设计", ownerRole: "编辑", reminderRole: "项目主管", cycle: 4 },
      { id: "design-revision", name: "修改确认", ownerRole: "编辑", reminderRole: "项目主管", cycle: 3 },
      { id: "design-final", name: "定稿输出", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 2 },
      { id: "design-archive", name: "交付归档", ownerRole: "协同支持", reminderRole: "编辑", cycle: 1 },
    ],
  },
  {
    id: "line-production",
    name: "生产类业务线",
    workflowName: "生产执行流程",
    description: "适合印制、装订、质检、包装和发货。",
    nodes: [
      { id: "production-order", name: "工单确认", ownerRole: "项目主管", reminderRole: "协同支持", cycle: 1 },
      { id: "production-material", name: "材料准备", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 2 },
      { id: "production-prepress", name: "印前检查", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 2 },
      { id: "production-print", name: "生产制作", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 5 },
      { id: "production-qc", name: "质检", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 2 },
      { id: "production-pack", name: "包装入库", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 1 },
      { id: "production-ship", name: "发货交付", ownerRole: "协同支持", reminderRole: "编辑", cycle: 2 },
    ],
  },
];

const DEFAULT_PARTNERS = [
  { id: "partner-huamo", name: "华墨文化", contact: "李岚", phone: "13800000001", address: "北京", note: "重点人文书合作方" },
  { id: "partner-xingtu", name: "星图少儿", contact: "赵青", phone: "13800000002", address: "上海", note: "少儿彩图项目合作方" },
  { id: "partner-sishi", name: "四时阅读", contact: "周南", phone: "13800000003", address: "杭州", note: "生活方式图文书合作方" },
  { id: "partner-owned", name: "自有项目", contact: "", phone: "", address: "", note: "内部项目，不对应外部合作方" },
  { id: "partner-shutian", name: "书田学院", contact: "何川", phone: "13800000004", address: "南京", note: "培训与实务类项目合作方" },
  { id: "partner-jiuwen", name: "旧闻书局", contact: "林乔", phone: "13800000005", address: "苏州", note: "历史档案类项目合作方" },
  { id: "partner-qingchuang", name: "晴窗文化", contact: "陈晓", phone: "13800000006", address: "广州", note: "访谈与设计类项目合作方" },
  { id: "partner-city", name: "城市读本", contact: "宋悦", phone: "13800000007", address: "成都", note: "城市文化类项目合作方" },
  { id: "partner-spectrum", name: "光谱教育", contact: "王楠", phone: "13800000008", address: "深圳", note: "教育类项目合作方" },
];

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

const ROLE_KEY_MAP = Object.fromEntries(DEFAULT_ROLES.map((role) => [role.name, role.key]));

const ADMIN_TAB_RULES = {
  overview: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
  ai: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
  users: ["管理人员"],
  departments: ["管理人员"],
  roles: ["管理权限"],
  permissions: ["管理权限"],
  partners: ["管理合作方"],
  businessLines: ["管理流程节点"],
  workflow: ["管理流程节点"],
  reminders: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
  pushLogs: ["管理人员", "管理权限", "管理合作方", "管理流程节点"],
};

const state = {
  projects: [],
  teamMembers: [],
  departments: [],
  roles: [],
  permissionRows: [],
  partners: [],
  workflowConfig: [],
  businessLines: [],
  wecomInbox: [],
  pushLogs: [],
  publicReminders: [],
  confirmablePushEnabled: true,
  filters: { search: "", owner: "全部", status: "全部", risk: "全部", update: "全部", reminder: "全部" },
  reminderFilters: { tab: "all", person: "全部", keyword: "", sort: "timeAsc" },
  selectedProjectId: null,
  editingProjectId: null,
  currentView: "board",
  displayMode: "project",
  currentUserId: TEAM_MEMBERS[0].id,
  adminTab: "overview",
  selectedWorkflowLineId: DEFAULT_BUSINESS_LINE_ID,
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
  aiSettings: null,
  aiConfigPending: false,
  aiConfigError: "",
  aiRiskPending: false,
  aiRiskResult: "",
  aiRiskError: "",
  aiVisionPending: false,
  aiVisionResult: "",
  aiVisionError: "",
  authUser: null,
  authReady: false,
  authPending: false,
  wecomScanLoginAvailable: false,
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
  loginView: document.getElementById("loginView"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginSubmitButton: document.getElementById("loginSubmitButton"),
  loginMessage: document.getElementById("loginMessage"),
  wecomLoginButton: document.getElementById("wecomLoginButton"),
  appShell: document.getElementById("appShell"),
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
  logoutButton: document.getElementById("logoutButton"),
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
  formBusinessLine: document.getElementById("formBusinessLine"),
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

function normalizePermissionRows(rows, roles = DEFAULT_ROLES) {
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
  return normalized.length ? normalized : WORKFLOW_CONFIG.map(normalizeWorkflowNode);
}

function defaultBusinessLines() {
  return DEFAULT_BUSINESS_LINES.map((line, index) => ({
    id: textValue(line.id || recordId("line", `${line.name}-${index}`)),
    name: textValue(line.name),
    workflowName: textValue(line.workflowName || `${line.name}流程`),
    description: textValue(line.description || "可在后台维护该业务线对应的流程节点。"),
    nodes: normalizeWorkflowNodes(line.nodes),
  }));
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
    nodes: normalizeWorkflowNodes(source.nodes || fallback.nodes),
  };
}

function normalizeBusinessLines(lines, legacyWorkflowConfig = []) {
  if (Array.isArray(lines) && lines.length) {
    const byId = new Map();
    lines.forEach((line, index) => {
      const normalized = normalizeBusinessLine(line, index);
      byId.set(normalized.id, normalized);
    });
    return Array.from(byId.values());
  }
  const defaults = defaultBusinessLines();
  if (Array.isArray(legacyWorkflowConfig) && legacyWorkflowConfig.length) {
    defaults[0].nodes = normalizeWorkflowNodes(legacyWorkflowConfig);
  }
  return defaults;
}

function businessLineOptions() {
  state.businessLines = normalizeBusinessLines(state.businessLines, state.workflowConfig);
  if (!state.businessLines.some((line) => line.id === state.selectedWorkflowLineId)) {
    state.selectedWorkflowLineId = state.businessLines[0]?.id || DEFAULT_BUSINESS_LINE_ID;
  }
  state.workflowConfig = workflowNodesForBusinessLine(DEFAULT_BUSINESS_LINE_ID);
  return state.businessLines;
}

function businessLineById(id) {
  return businessLineOptions().find((line) => line.id === id) || businessLineOptions()[0];
}

function businessLineIdForProject(project = {}) {
  const lines = businessLineOptions();
  const byId = lines.find((line) => line.id === project.businessLineId);
  if (byId) return byId.id;
  const byName = lines.find((line) => line.name === project.businessLine || line.name === project.businessLineName);
  return byName?.id || DEFAULT_BUSINESS_LINE_ID;
}

function businessLineName(id) {
  return businessLineById(id)?.name || "出版类业务线";
}

function workflowNodesForBusinessLine(id) {
  const lines = Array.isArray(state.businessLines) && state.businessLines.length ? state.businessLines : defaultBusinessLines();
  const line = lines.find((item) => item.id === id) || lines.find((item) => item.id === DEFAULT_BUSINESS_LINE_ID) || lines[0];
  return normalizeWorkflowNodes(line?.nodes);
}

function workflowNodeNamesForBusinessLine(id) {
  return workflowNodesForBusinessLine(id).map((node) => node.name);
}

function defaultNodeForStatus(status, businessLineId = DEFAULT_BUSINESS_LINE_ID) {
  const names = workflowNodeNamesForBusinessLine(businessLineId);
  const mapped = STATUS_TO_NODE[status];
  if (mapped && names.includes(mapped)) return mapped;
  return names[0] || "未设置节点";
}

function statusForNodeName(nodeName, fallbackStatus = "作者沟通中") {
  if (NODE_TO_STATUS[nodeName]) return NODE_TO_STATUS[nodeName];
  if (["待启动", "已暂停", "已完成"].includes(fallbackStatus)) return "作者沟通中";
  return fallbackStatus || "作者沟通中";
}

function workflowIndexForProject(project = {}) {
  const names = workflowNodeNamesForBusinessLine(project.businessLineId);
  const index = names.findIndex((name) => name === project.currentNode);
  return { names, index: index >= 0 ? index : 0 };
}

function nextNodeForProject(project = {}) {
  const { names, index } = workflowIndexForProject(project);
  return names[index + 1] || "";
}

function allWorkflowNodes() {
  return businessLineOptions().flatMap((line) => line.nodes.map((node) => ({ ...node, businessLineId: line.id, businessLineName: line.name })));
}

function normalizeTeamMembers(members) {
  return (Array.isArray(members) ? members : []).map((member) => {
    const fallback = TEAM_MEMBERS.find((item) => item.id === member.id || item.name === member.name) || {};
    const index = (Array.isArray(members) ? members : []).indexOf(member);
    const fallbackUsername = index === 0 || member.role === "超级管理员" ? "admin" : String(member.id || fallback.id || `user${index + 1}`).replace(/^user-/, "");
    return {
      ...fallback,
      ...member,
      username: String(member.username || fallback.username || fallbackUsername).trim(),
      wecomUserId: member.wecomUserId ?? fallback.wecomUserId ?? "",
      passwordReady: Boolean(member.passwordReady),
      passwordResetRequired: Boolean(member.passwordResetRequired),
    };
  });
}

function wecomBindingBadge(member) {
  const isBound = Boolean(String(member.wecomUserId || "").trim());
  return `<span class="binding-badge ${isBound ? "is-bound" : "is-unbound"}">${isBound ? "✓ 已绑定" : "待绑定"}</span>`;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.teamMembers = Array.isArray(parsed.teamMembers) && parsed.teamMembers.length ? normalizeTeamMembers(parsed.teamMembers) : clone(TEAM_MEMBERS);
      state.departments = normalizeDepartments(parsed.departments, state.teamMembers);
      state.roles = normalizeRoles(parsed.roles);
      state.permissionRows = normalizePermissionRows(parsed.permissionRows, state.roles);
      state.partners = Array.isArray(parsed.partners) ? normalizePartners(parsed.partners) : clone(DEFAULT_PARTNERS);
      state.workflowConfig = Array.isArray(parsed.workflowConfig) && parsed.workflowConfig.length ? normalizeWorkflowNodes(parsed.workflowConfig) : normalizeWorkflowNodes(WORKFLOW_CONFIG);
      state.businessLines = normalizeBusinessLines(parsed.businessLines, state.workflowConfig);
      state.publicReminders = normalizePublicReminders(parsed.publicReminders);
      state.confirmablePushEnabled = parsed.confirmablePushEnabled !== false;
      state.selectedWorkflowLineId = state.businessLines.some((line) => line.id === parsed.selectedWorkflowLineId) ? parsed.selectedWorkflowLineId : state.businessLines[0].id;
      state.currentUserId = parsed.currentUserId || TEAM_MEMBERS[0].id;
      return;
    }
  } catch (error) {
  }
  state.teamMembers = clone(TEAM_MEMBERS);
  state.departments = normalizeDepartments(DEFAULT_DEPARTMENTS, state.teamMembers);
  state.roles = normalizeRoles(DEFAULT_ROLES);
  state.permissionRows = defaultPermissionRows(state.roles);
  state.partners = clone(DEFAULT_PARTNERS);
  state.workflowConfig = normalizeWorkflowNodes(WORKFLOW_CONFIG);
  state.businessLines = defaultBusinessLines();
  state.publicReminders = [];
  state.confirmablePushEnabled = true;
  state.selectedWorkflowLineId = DEFAULT_BUSINESS_LINE_ID;
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      teamMembers: state.teamMembers,
      departments: state.departments,
      roles: state.roles,
      permissionRows: state.permissionRows,
      partners: state.partners,
      workflowConfig: state.workflowConfig,
      businessLines: state.businessLines,
      publicReminders: state.publicReminders,
      confirmablePushEnabled: state.confirmablePushEnabled,
      selectedWorkflowLineId: state.selectedWorkflowLineId,
      currentUserId: state.currentUserId,
    }),
  );
  queueRemoteSync();
}

function exportStateSnapshot() {
  return {
    version: 2,
    projects: state.projects,
    teamMembers: state.teamMembers,
    departments: state.departments,
    roles: state.roles,
    permissionRows: state.permissionRows,
    partners: state.partners,
    workflowConfig: state.workflowConfig,
    businessLines: state.businessLines,
    selectedWorkflowLineId: state.selectedWorkflowLineId,
    currentUserId: state.currentUserId,
    wecomInbox: state.wecomInbox,
    pushLogs: state.pushLogs,
    publicReminders: state.publicReminders,
    confirmablePushEnabled: state.confirmablePushEnabled,
  };
}

function applyStateSnapshot(snapshot) {
  const seedSettings = clone(TEAM_MEMBERS);
  state.teamMembers = Array.isArray(snapshot.teamMembers) && snapshot.teamMembers.length ? normalizeTeamMembers(snapshot.teamMembers) : seedSettings;
  state.departments = normalizeDepartments(snapshot.departments, state.teamMembers);
  state.roles = normalizeRoles(snapshot.roles);
  state.permissionRows = normalizePermissionRows(snapshot.permissionRows, state.roles);
  state.workflowConfig = Array.isArray(snapshot.workflowConfig) && snapshot.workflowConfig.length ? normalizeWorkflowNodes(snapshot.workflowConfig) : normalizeWorkflowNodes(WORKFLOW_CONFIG);
  state.businessLines = normalizeBusinessLines(snapshot.businessLines, state.workflowConfig);
  state.selectedWorkflowLineId = state.businessLines.some((line) => line.id === snapshot.selectedWorkflowLineId) ? snapshot.selectedWorkflowLineId : state.businessLines[0].id;
  state.projects = Array.isArray(snapshot.projects) && snapshot.projects.length ? snapshot.projects.map(normalizeProject) : seedProjects();
  state.partners = Array.isArray(snapshot.partners) ? normalizePartners(snapshot.partners, state.projects) : clone(DEFAULT_PARTNERS);
  state.wecomInbox = Array.isArray(snapshot.wecomInbox) ? snapshot.wecomInbox : [];
  state.pushLogs = Array.isArray(snapshot.pushLogs) ? snapshot.pushLogs : [];
  state.publicReminders = normalizePublicReminders(snapshot.publicReminders);
  state.confirmablePushEnabled = snapshot.confirmablePushEnabled !== false;
  state.currentUserId = state.teamMembers.some((item) => item.id === snapshot.currentUserId) ? snapshot.currentUserId : state.teamMembers[0].id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      teamMembers: state.teamMembers,
      departments: state.departments,
      roles: state.roles,
      permissionRows: state.permissionRows,
      partners: state.partners,
      workflowConfig: state.workflowConfig,
      businessLines: state.businessLines,
      publicReminders: state.publicReminders,
      confirmablePushEnabled: state.confirmablePushEnabled,
      selectedWorkflowLineId: state.selectedWorkflowLineId,
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

function setLoginMessage(message, isError = false) {
  if (!elements.loginMessage) return;
  elements.loginMessage.textContent = message;
  elements.loginMessage.classList.toggle("is-error", Boolean(isError));
}

function setAuthenticatedView(isAuthenticated) {
  elements.loginView.classList.toggle("is-auth-hidden", isAuthenticated);
  elements.appShell.classList.toggle("is-auth-hidden", !isAuthenticated);
  if (!isAuthenticated) {
    state.authUser = null;
    state.authReady = false;
    runtime.apiReady = false;
  }
}

function syncAuthenticatedUser() {
  if (!state.authUser) return;
  const member = state.teamMembers.find((item) => item.id === state.authUser.id);
  if (!member) return;
  state.currentUserId = member.id;
  state.authUser = { ...state.authUser, ...member };
}

async function requestAuthSession() {
  try {
    const response = await fetch("/api/auth/me");
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) return false;
    state.authUser = result.user;
    state.currentUserId = result.user.id;
    state.wecomScanLoginAvailable = Boolean(result.wecomScanLoginAvailable);
    state.authReady = true;
    setAuthenticatedView(true);
    return true;
  } catch (error) {
    return false;
  }
}

async function loginWithPassword(form) {
  if (state.authPending) return;
  const formData = new FormData(form);
  state.authPending = true;
  elements.loginSubmitButton.disabled = true;
  setLoginMessage("正在登录……");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(formData.get("username") || "").trim(),
        password: String(formData.get("password") || ""),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "登录失败。");
    state.authUser = result.user;
    state.currentUserId = result.user.id;
    state.wecomScanLoginAvailable = Boolean(result.wecomScanLoginAvailable);
    state.authReady = true;
    form.reset();
    setAuthenticatedView(true);
    render();
    await hydrateRemoteState();
    await loadAiSettings();
  } catch (error) {
    setLoginMessage(error instanceof Error ? error.message : String(error), true);
  } finally {
    state.authPending = false;
    elements.loginSubmitButton.disabled = false;
  }
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
  }
  setAuthenticatedView(false);
  setLoginMessage("已退出登录。请输入账号密码重新进入。");
  elements.loginUsername.focus();
}

async function requestRemoteState(method = "GET", payload) {
  const response = await fetch("/api/state", {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (response.status === 401) {
    await logout();
    throw new Error("登录已失效，请重新登录。");
  }
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
    syncAuthenticatedUser();
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

function textValue(value) {
  return String(value ?? "").trim();
}

function normalizeReminderDateValue(value, fallback = "") {
  const raw = textValue(value || fallback);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 09:00`;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if (match) return `${match[1]} ${match[2].padStart(2, "0")}:${match[3]}`;
  const parsed = parseDate(raw);
  return Number.isNaN(parsed.getTime()) ? raw : dateTimeString(parsed);
}

function normalizeNodeDateValue(value, fallback = "") {
  const raw = textValue(value || fallback);
  if (!raw) return "";
  const parsed = parseDate(raw);
  return Number.isNaN(parsed.getTime()) ? "" : dateString(parsed);
}

function normalizeNodeDateTimeValue(value, fallback = "") {
  const raw = textValue(value || fallback);
  if (!raw) return "";
  const parsed = parseDate(raw);
  return Number.isNaN(parsed.getTime()) ? "" : dateTimeString(parsed);
}

function nodeDurationDays(node = {}) {
  const startedAt = normalizeNodeDateValue(node.startedAt || node.enteredAt || node.started || node.planned);
  if (!startedAt) return "";
  const completedAt = normalizeNodeDateValue(node.completedAt || node.completed || "");
  const status = textValue(node.status);
  const endValue = completedAt || (["进行中", "已阻塞"].includes(status) ? dateString(new Date()) : "");
  if (!endValue) return "";
  const startDate = parseDate(startedAt);
  const endDate = parseDate(endValue);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";
  return Math.max(0, diffDays(endDate, startDate));
}

function nodeDurationText(node = {}) {
  const days = nodeDurationDays(node);
  if (days === "") return "未开始";
  const completedAt = normalizeNodeDateValue(node.completedAt || node.completed || "");
  if (!completedAt && ["进行中", "已阻塞"].includes(node.status)) return days === 0 ? "今天进入" : `已 ${days} 天`;
  return days === 0 ? "当天" : `${days} 天`;
}

function nodeGapDays(nodes = [], index = 0) {
  if (index <= 0) return "";
  const currentDate = normalizeNodeDateValue(nodes[index]?.startedAt);
  if (!currentDate) return "";
  const previous = nodes.slice(0, index).reverse().find((node) => normalizeNodeDateValue(node.startedAt));
  const previousDate = normalizeNodeDateValue(previous?.startedAt);
  if (!previousDate) return "";
  return Math.max(0, diffDays(parseDate(currentDate), parseDate(previousDate)));
}

function nodeGapText(nodes = [], index = 0) {
  if (index <= 0) return "起点";
  const days = nodeGapDays(nodes, index);
  if (days === "") return "未记录";
  return days === 0 ? "当天" : `${days} 天`;
}

function nodeTimeText(value, fallback = "") {
  const normalized = normalizeNodeDateTimeValue(value);
  if (normalized) return normalized;
  return fallback;
}

function nodeOperatorText(node = {}) {
  return textValue(node.completedBy || node.startedBy || "");
}

function nodeTimelineStatusClass(node = {}) {
  const status = textValue(node.status);
  if (status === "已完成" || node.completedAt) return "is-completed";
  if (["进行中", "已阻塞"].includes(status)) return "is-current";
  return "is-upcoming";
}

function normalizeProjectNode(node, context = {}, index = 0) {
  const source = node || {};
  const planned = normalizeNodeDateValue(source.planned || source.plannedAt || context.planned);
  const status = textValue(source.status || "未开始") || "未开始";
  const startedAtTime = normalizeNodeDateTimeValue(
    source.startedAtTime || source.enteredAtTime || source.startedTime || source.actualStartTime || source.startedAt || source.enteredAt || source.started || source.actualStart || (status === "未开始" ? "" : planned)
  );
  const completedAtTime = normalizeNodeDateTimeValue(source.completedAtTime || source.completedTime || source.completedAt || source.completed || "");
  const startedAt = normalizeNodeDateValue(
    source.startedAt || source.enteredAt || source.started || source.actualStart || startedAtTime || (status === "未开始" ? "" : planned)
  );
  const completedAt = normalizeNodeDateValue(source.completedAt || source.completed || completedAtTime || "");
  const normalized = {
    ...source,
    name: textValue(source.name || context.name || `节点 ${index + 1}`),
    status,
    owner: textValue(source.owner || context.owner || "未分配"),
    planned,
    startedAt,
    startedAtTime,
    startedBy: textValue(source.startedBy || source.enteredBy || source.operator || ""),
    completedAt,
    completedAtTime,
    completedBy: textValue(source.completedBy || ""),
    completed: completedAt,
    reminderPerson: textValue(source.reminderPerson || context.reminderPerson || context.owner || "未分配"),
    reminderDate: normalizeReminderDateValue(source.reminderDate || context.reminderDate || planned),
    note: textValue(source.note || context.note || ""),
  };
  return {
    ...normalized,
    durationDays: nodeDurationDays(normalized),
  };
}

function mergeProjectNodes(existingNodes = [], context = {}) {
  const startDate = parseDate(context.startDate || new Date());
  const businessLineId = context.businessLineId || DEFAULT_BUSINESS_LINE_ID;
  const baseNodes = buildNodes(
    startDate,
    context.owner || "未分配",
    context.status || "待启动",
    context.currentNode,
    context.reminderPerson || context.owner || "未分配",
    context.reminderDate || new Date(),
    context.blockedNode || "",
    businessLineId
  );
  const existingByName = new Map(
    (Array.isArray(existingNodes) ? existingNodes : [])
      .map((node, index) => normalizeProjectNode(node, context, index))
      .filter((node) => node.name)
      .map((node) => [node.name, node])
  );
  const currentIndex = Math.max(0, baseNodes.findIndex((node) => node.name === context.currentNode));
  const today = dateString(new Date());
  const operationTime = normalizeNodeDateTimeValue(context.operationTime || context.operatedAt || "");
  const operationDate = normalizeNodeDateValue(operationTime || "");
  const operator = textValue(context.operator || "");
  let previousCompletedAt = dateString(startDate);
  return baseNodes.map((baseNode, index) => {
    const existing = existingByName.get(baseNode.name);
    const hasExistingHistory = Array.isArray(existingNodes) && existingNodes.length > 0;
    const justCompleted = existing && ["进行中", "已阻塞"].includes(existing.status) && baseNode.status === "已完成" && !existing.completedAt;
    const justStarted = existing && existing.status === "未开始" && baseNode.status !== "未开始" && !existing.startedAt;
    const merged = normalizeProjectNode({
      ...baseNode,
      ...(existing || {}),
      name: baseNode.name,
      status: baseNode.status,
      owner: baseNode.owner,
      planned: baseNode.planned,
      reminderPerson: baseNode.reminderPerson,
      reminderDate: baseNode.reminderDate,
      note: existing?.note && existing.status === baseNode.status ? existing.note : baseNode.note,
    }, context, index);

    if (index === 0 && !merged.startedAt && context.status !== "待启动") merged.startedAt = dateString(startDate);
    if (index <= currentIndex && baseNode.status !== "未开始" && !merged.startedAt) {
      merged.startedAt = previousCompletedAt || baseNode.startedAt || operationDate || today;
      if (operationTime && !merged.startedAtTime) merged.startedAtTime = operationTime;
      if (operator && !merged.startedBy) merged.startedBy = operator;
    }
    if (hasExistingHistory && !existing && baseNode.status !== "未开始") {
      merged.startedAt = index === 0 ? dateString(startDate) : operationDate || today;
      if (operationTime) merged.startedAtTime = operationTime;
      if (operator) merged.startedBy = operator;
    }
    if (justStarted) {
      merged.startedAt = operationDate || today;
      if (operationTime) merged.startedAtTime = operationTime;
      if (operator) merged.startedBy = operator;
    }
    if (index < currentIndex && !merged.completedAt) {
      merged.completedAt = baseNode.completedAt || operationDate || today;
      if (operationTime && operator) {
        merged.completedAtTime = operationTime;
        merged.completedBy = operator;
      }
    }
    if (justCompleted) {
      merged.completedAt = operationDate || today;
      if (operationTime) merged.completedAtTime = operationTime;
      if (operator) merged.completedBy = operator;
    }
    if (index === currentIndex && context.status !== "已完成") {
      merged.completedAt = "";
    }
    if (context.status === "已完成" && !merged.completedAt) {
      merged.completedAt = baseNode.completedAt || operationDate || today;
      if (operationTime && operator) {
        merged.completedAtTime = operationTime;
        merged.completedBy = operator;
      }
    }
    if (index > currentIndex && baseNode.status === "未开始" && !existing?.startedAt) {
      merged.startedAt = "";
      merged.completedAt = "";
    }
    merged.completed = merged.completedAt;
    merged.durationDays = nodeDurationDays(merged);
    previousCompletedAt = merged.completedAt || merged.startedAt || previousCompletedAt;
    return merged;
  });
}

function reminderUid(projectId = "project") {
  return `reminder-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReminderItem(item, project = {}, index = 0) {
  const source = item || {};
  const status = textValue(source.status || source.reminderNotificationStatus || "pending") || "pending";
  const pending = source.pending === false || ["sent", "completed", "cancelled"].includes(status) ? false : true;
  return {
    id: textValue(source.id || reminderUid(project.id || `project-${index}`)),
    person: textValue(source.person || source.reminderPerson || source.memberName || project.reminderPerson || project.owner || "未分配"),
    date: normalizeReminderDateValue(source.date || source.reminderDate || project.reminderDate || project.planFinish),
    note: textValue(source.note || source.nextAction || project.nextAction || "待补充提醒内容"),
    status,
    pending,
    source: textValue(source.source || project.reminderRecordSource || "手动提醒"),
    actor: textValue(source.actor || project.reminderRecordActor || project.owner || "WorkPad 管家"),
    recordAt: textValue(source.recordAt || project.reminderRecordAt || ""),
    createdAt: textValue(source.createdAt || project.reminderNotificationCreatedAt || new Date().toISOString()),
    sentAt: textValue(source.sentAt || project.reminderNotificationSentAt || ""),
    lastAttemptAt: textValue(source.lastAttemptAt || project.reminderNotificationLastAttemptAt || ""),
    lastError: textValue(source.lastError || project.reminderNotificationLastError || ""),
    attempts: Number(source.attempts ?? source.reminderNotificationAttempts ?? 0) || 0,
    confirmable: source.confirmable === false || source.confirmable === "false" ? false : true,
    confirmationToken: textValue(source.confirmationToken || ""),
    confirmationUrl: textValue(source.confirmationUrl || ""),
    completedAt: textValue(source.completedAt || ""),
    completedBy: textValue(source.completedBy || ""),
    completionNote: textValue(source.completionNote || ""),
  };
}

function normalizeProjectReminders(project = {}) {
  if (Array.isArray(project.reminders)) {
    return project.reminders
      .map((item, index) => normalizeReminderItem(item, project, index))
      .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  }
  if (!project.reminderPerson && !project.reminderDate && !project.nextAction) return [];
  return [normalizeReminderItem({
    id: project.reminderNotificationKey || reminderUid(project.id || "legacy"),
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
  }, project)];
}

function activeProjectReminders(project) {
  return normalizeProjectReminders(project).filter((item) => item.pending && !["sent", "completed", "cancelled"].includes(item.status));
}

function primaryProjectReminder(project) {
  const active = activeProjectReminders(project);
  const reminders = active.length ? active : normalizeProjectReminders(project);
  return reminders[0] || null;
}

function syncProjectReminderFields(project) {
  project.reminders = normalizeProjectReminders(project);
  const primary = primaryProjectReminder(project);
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
  const reminder = normalizeReminderItem({
    ...(input || {}),
    id: input?.id || reminderUid(project.id || "project"),
    status: input?.status || "pending",
    pending: input?.pending ?? true,
    createdAt: input?.createdAt || new Date().toISOString(),
  }, project);
  project.reminders = [...normalizeProjectReminders(project), reminder];
  syncProjectReminderFields(project);
  return reminder;
}

function normalizePublicReminder(item = {}, index = 0) {
  return normalizeReminderItem({
    ...item,
    id: item.id || reminderUid(`public-${index}`),
    source: item.source || "公共提醒",
    actor: item.actor || "WorkPad 管家",
  }, {}, index);
}

function normalizePublicReminders(reminders = []) {
  return (Array.isArray(reminders) ? reminders : [])
    .map((item, index) => normalizePublicReminder(item, index))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
}

function activePublicReminders() {
  return normalizePublicReminders(state.publicReminders).filter((item) => !["completed", "cancelled"].includes(item.status));
}

function appendPublicReminder(input) {
  const reminder = normalizePublicReminder({
    ...(input || {}),
    id: input?.id || reminderUid("public"),
    status: input?.status || "pending",
    pending: input?.pending ?? true,
    createdAt: input?.createdAt || new Date().toISOString(),
  });
  state.publicReminders = [...normalizePublicReminders(state.publicReminders), reminder];
  return reminder;
}

function reminderItemStatus(reminder) {
  if (reminder.status === "completed" || reminder.completedAt) return "已完成";
  if (reminder.status === "sent") return reminder.confirmable === false ? "已推送" : "已推送待确认";
  if (reminder.status === "failed") return "推送失败";
  if (reminder.status === "cancelled") return "已取消";
  return dateString(reminder.date) === dateString(new Date()) ? "今日提醒" : "待提醒";
}

function reminderMatchesMember(project, memberName) {
  return normalizeProjectReminders(project).some((reminder) => reminder.person === memberName);
}

function todayReminderItems(projects, memberName = "") {
  return projects.flatMap((project) => activeProjectReminders(project)
    .filter((reminder) => project.status !== "已完成" && dateString(reminder.date) === dateString(new Date()))
    .filter((reminder) => !memberName || reminder.person === memberName)
    .map((reminder) => ({ project, reminder })));
}

function todayPublicReminderItems(memberName = "") {
  return activePublicReminders()
    .filter((reminder) => dateString(reminder.date) === dateString(new Date()))
    .filter((reminder) => !memberName || reminder.person === memberName)
    .map((reminder) => ({ reminder, scope: "public" }));
}

function todayAllReminderItems(projects = state.projects, memberName = "") {
  return [
    ...todayReminderItems(projects, memberName),
    ...todayPublicReminderItems(memberName),
  ];
}

function projectMatchesReminderFilter(project, filter) {
  if (filter === "全部") return true;
  if (filter === "今日提醒") {
    return activeProjectReminders(project).some((reminder) => dateString(reminder.date) === dateString(new Date()));
  }
  if (filter === "待提醒") return activeProjectReminders(project).length > 0;
  return reminderStatus(project) === filter;
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

function formatPushLogTime(value) {
  if (!value) return "未记录";
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return dateTimeString(date);
}

function tint(hex, opacity) {
  const safe = hex.replace("#", "");
  const red = Number.parseInt(safe.slice(0, 2), 16);
  const green = Number.parseInt(safe.slice(2, 4), 16);
  const blue = Number.parseInt(safe.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate, blockedNode, businessLineId = DEFAULT_BUSINESS_LINE_ID) {
  const workflowNodes = workflowNodesForBusinessLine(businessLineId);
  const currentIndex = Math.max(0, workflowNodes.findIndex((node) => node.name === currentNode));
  let dayCursor = 3;
  return workflowNodes.map((workflowNode, index) => {
    const name = workflowNode.name;
    const planned = addDays(startDate, dayCursor);
    dayCursor += Math.max(1, Number(workflowNode.cycle) || 3);
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
    const startedAt = nodeStatus === "未开始" ? "" : index === 0 ? dateString(startDate) : dateString(planned);
    const completedAt = completed;
    return normalizeProjectNode({
      name,
      status: nodeStatus,
      owner,
      planned: dateString(planned),
      startedAt,
      completedAt,
      completed: completedAt,
      reminderPerson: index === currentIndex ? reminderPerson : owner,
      reminderDate: index === currentIndex ? dateTimeString(reminderDate) : dateTimeString(planned),
      note: nodeStatus === "已阻塞" ? "当前节点存在阻塞，需要人工跟进。" : nodeStatus === "进行中" ? "当前为主要推进节点。" : nodeStatus === "已完成" ? "节点已关闭。" : "尚未启动。",
    }, { owner, reminderPerson, reminderDate }, index);
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
    businessLineId: DEFAULT_BUSINESS_LINE_ID,
    businessLineName: businessLineName(DEFAULT_BUSINESS_LINE_ID),
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
    reminders: [
      {
        id: `reminder-demo-${code}-1`,
        person: reminderPerson,
        date: dateTimeString(reminderDate),
        note: nextAction,
        status: "pending",
        pending: true,
        source: "演示数据",
        actor: owner,
        createdAt: new Date().toISOString(),
        sentAt: "",
        lastAttemptAt: "",
        lastError: "",
        attempts: 0,
      },
    ],
    nodes: buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate, blockedNode, DEFAULT_BUSINESS_LINE_ID),
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
  state.partners = normalizePartners(state.partners, state.projects);
  return state.partners.map((partner) => partner.name);
}

function getPartnerProfiles() {
  state.partners = normalizePartners(state.partners, state.projects);
  return state.partners;
}

function findPartnerProfile(name) {
  return getPartnerProfiles().find((partner) => partner.name === name) || normalizePartnerProfile(name);
}

function normalizeProject(project) {
  const status = STATUS_ORDER.includes(project.status) ? project.status : "待启动";
  const businessLineId = businessLineIdForProject(project);
  const workflowNodeNames = workflowNodeNamesForBusinessLine(businessLineId);
  const currentNode = workflowNodeNames.includes(project.currentNode) ? project.currentNode : defaultNodeForStatus(status, businessLineId);
  const owner = project.owner || "未分配";
  const nextAction = project.nextAction || "待补充下一步动作";
  const reminderBase = {
    ...project,
    owner,
    nextAction,
    reminderPerson: project.reminderPerson || owner,
    reminderDate: project.reminderDate || project.planFinish || dateString(new Date()),
  };
  const reminders = normalizeProjectReminders(reminderBase);
  const primaryReminder = primaryProjectReminder({ ...reminderBase, reminders });
  const reminderPerson = primaryReminder?.person || reminderBase.reminderPerson;
  const reminderDate = primaryReminder?.date || reminderBase.reminderDate;
  const startDate = parseDate(project.startDate || new Date());
  const normalizedNodes = mergeProjectNodes(project.nodes, {
    startDate,
    owner,
    status,
    currentNode,
    reminderPerson,
    reminderDate,
    blockedNode: status === "已暂停" ? currentNode : "",
    businessLineId,
  });
  return syncProjectReminderFields({
    ...project,
    businessLineId,
    businessLineName: businessLineName(businessLineId),
    status,
    currentNode,
    owner,
    partner: project.partner || "",
    summary: project.summary || `${project.title || "项目"} 的流程记录`,
    nextAction,
    riskNote: project.riskNote || "暂无特别风险说明。",
    reminders,
    reminderPerson,
    reminderDate: dateTimeString(reminderDate),
    startDate: dateString(startDate),
    planFinish: dateString(project.planFinish || addDays(new Date(), 14)),
    updatedAt: dateTimeString(project.updatedAt || new Date()),
    createdAt: dateTimeString(project.createdAt || new Date()),
    nodes: normalizedNodes,
    followUps: Array.isArray(project.followUps) && project.followUps.length ? project.followUps : [{ time: dateTimeString(new Date()), user: owner, progress: project.summary || "创建项目", nextAction: project.nextAction || "待补充下一步动作" }],
    logs: Array.isArray(project.logs) && project.logs.length ? project.logs : [{ time: dateTimeString(new Date()), actor: owner, action: "创建项目", detail: "补齐基础信息。" }],
  });
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
  return activeProjectReminders(project).some((reminder) => dateString(reminder.date) === dateString(new Date())) ? "今日提醒" : "待提醒";
}

function reminderListHtml(project, options = {}) {
  const { compact = false, emptyText = "" } = options;
  const reminders = normalizeProjectReminders(project);
  const shown = compact ? reminders.slice(0, 3) : reminders;
  if (!shown.length) {
    return emptyText ? `<div class="reminder-stack"><div class="reminder-empty">${escapeHtml(emptyText)}</div></div>` : "";
  }
  const moreCount = Math.max(reminders.length - shown.length, 0);
  return `
    <div class="reminder-stack ${compact ? "is-compact" : ""}">
      ${shown.map((reminder) => `
        <div class="reminder-item">
          <div>
            <strong>${escapeHtml(reminder.person)}</strong>
            <span>${escapeHtml(reminderTimeText(reminder.date))}</span>
          </div>
          <p>${escapeHtml(reminder.note || "待补充提醒内容")}</p>
          <em>${escapeHtml(reminderItemStatus(reminder))}</em>
        </div>`).join("")}
      ${moreCount ? `<div class="reminder-more">还有 ${moreCount} 条提醒</div>` : ""}
    </div>`;
}

function reminderRecordNotice(project) {
  if (project.reminderRecordNotice) return project.reminderRecordNotice;
  const log = (project.logs || []).find((item) => item.action === "企业微信提醒");
  if (!log) return "";
  return `${log.actor || "企业微信"} 已通过企业微信记录提醒：${project.reminderPerson} · ${reminderTimeText(project.reminderDate)} · ${project.nextAction || log.detail}`;
}

function reminderDispatchNotice(project) {
  const reminders = normalizeProjectReminders(project);
  const failed = reminders.find((item) => item.status === "failed");
  const queued = activeProjectReminders(project).filter((item) => item.status !== "failed");
  if (failed) {
    const reason = String(failed.lastError || "等待下次重试").split("\n")[0];
    return `到点推送失败：${reason}`;
  }
  if (queued.length) return `${queued.length} 条提醒已进入到点推送队列`;
  if (reminders.some((item) => item.status === "sent")) return "到点提醒已通过企业微信推送";
  return "";
}

function reminderRecordHtml(project) {
  const recordText = reminderRecordNotice(project);
  const dispatchText = reminderDispatchNotice(project);
  if (!recordText && !dispatchText) return "";
  return `
    <div class="reminder-record-note">
      ${recordText ? `<strong>${escapeHtml(recordText)}</strong>` : ""}
      ${dispatchText ? `<span>${escapeHtml(dispatchText)}</span>` : ""}
    </div>`;
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
  const normalizedRoles = state.roles.length ? state.roles : normalizeRoles(DEFAULT_ROLES);
  return normalizedRoles.find((item) => item.name === role)?.key || ROLE_KEY_MAP[role] || "editor";
}

function roleNameByKey(key) {
  const normalizedRoles = state.roles.length ? state.roles : normalizeRoles(DEFAULT_ROLES);
  return normalizedRoles.find((item) => item.key === key)?.name || DEFAULT_ROLES.find((item) => item.key === key)?.name || "编辑";
}

function roleOptions() {
  state.roles = normalizeRoles(state.roles);
  return state.roles;
}

function departmentOptions() {
  state.departments = normalizeDepartments(state.departments, state.teamMembers);
  return state.departments;
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
  return state.projects.filter((project) => project.owner === user.name || reminderMatchesMember(project, user.name));
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
    const matchesSearch = !search || [project.title, project.author, project.code, businessLineName(project.businessLineId)].some((item) => String(item).toLowerCase().includes(search));
    const matchesOwner = state.filters.owner === "全部" || project.owner === state.filters.owner;
    const matchesStatus = state.filters.status === "全部" || project.status === state.filters.status;
    const matchesRisk = state.filters.risk === "全部" || risk.level === state.filters.risk;
    const matchesReminder = projectMatchesReminderFilter(project, state.filters.reminder);
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
  elements.currentUserSelect.disabled = true;
  elements.currentUserSelect.title = "当前身份由登录账号决定，如需切换请退出后重新登录。";
  elements.currentUserName.textContent = currentUser().name;
  elements.currentUserRole.textContent = `${currentUser().role} · ${currentUser().department} · ${currentUser().username || "未设用户名"}`;
}

function renderCurrentNodeOptions(businessLineId = DEFAULT_BUSINESS_LINE_ID, selectedNode = "") {
  const nodes = workflowNodeNamesForBusinessLine(businessLineId);
  elements.formCurrentNode.innerHTML = nodes.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  elements.formCurrentNode.value = nodes.includes(selectedNode) ? selectedNode : nodes[0] || "";
}

function syncFiltersAndForm() {
  const owners = [...new Set(state.teamMembers.map((item) => item.name).concat(visibleProjects().map((item) => item.owner)))].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
  elements.ownerFilter.innerHTML = [`<option value="全部">全部负责人</option>`, ...owners.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.ownerFilter.value = state.filters.owner;
  elements.statusFilter.innerHTML = [`<option value="全部">全部状态</option>`, ...STATUS_ORDER.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.statusFilter.value = state.filters.status;
  elements.formStatus.innerHTML = STATUS_ORDER.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  elements.formBusinessLine.innerHTML = businessLineOptions().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  renderCurrentNodeOptions(elements.formBusinessLine.value || DEFAULT_BUSINESS_LINE_ID, elements.formCurrentNode.value);
  elements.formPartner.innerHTML = [`<option value="">未选择合作方</option>`, ...getPartners().map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)].join("");
  elements.newProjectButton.disabled = !hasPermission("编辑项目状态");
  elements.newProjectButton.title = hasPermission("编辑项目状态") ? "" : "当前身份没有项目编辑权限";
}

function renderNoticeBar() {
  const user = currentUser();
  const myProjects = state.projects.filter((item) => item.owner === user.name && !["已完成", "已暂停"].includes(item.status)).length;
  const myReminders = todayAllReminderItems(state.projects, user.name).length;
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
  const todayReminders = todayReminderItems(projects).length + todayPublicReminderItems().length;
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
        ${reminderListHtml(project, { compact: true })}
        ${reminderRecordHtml(project)}
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
                    <div>业务线：${escapeHtml(businessLineName(project.businessLineId))}</div>
                    <div>合作方：${escapeHtml(project.partner || "未设置")}</div>
                    <div>当前节点：${escapeHtml(project.currentNode)}</div>
                  </div>
                  ${reminderListHtml(project, { compact: true })}
                  ${reminderRecordHtml(project)}
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
    const reminders = todayReminderItems(scopedProjects, member.name).length + todayPublicReminderItems(member.name).length;
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
                <div class="mini-text">${escapeHtml(businessLineName(project.businessLineId))} · ${escapeHtml(project.status)} · ${escapeHtml(project.currentNode)} · 合作方 ${escapeHtml(project.partner || "未设置")}</div>
              </button>
            </div>`).join("") : `<div class="empty-state">当前没有分配到项目。</div>`}
        </div>
      </article>`;
  }).join("");
}

function adminCards() {
  return [
    ["人员总数", String(state.teamMembers.length), "含编辑、主管和协同支持", "#23404d"],
    ["合作方总数", String(getPartners().length), "项目录入时通过选择进入", "#a4482f"],
    ["业务线", String(businessLineOptions().length), "不同业务线可配置不同流程", "#697443"],
    ["推送记录", String(state.pushLogs.length), "企微提醒和主动消息留痕", "#b67c1f"],
    ["公共提醒", String(activePublicReminders().length), "不绑定具体订单的提醒事项", "#2f7252"],
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
    ["departments", "组织部门", "人员安排时从部门里选择"],
    ["roles", "角色管理", "建立角色并接入权限矩阵"],
    ["permissions", "权限分配", "按角色查看权限矩阵"],
    ["partners", "合作方管理", "合作方主数据和项目引用"],
    ["businessLines", "业务线管理", "出版、设计、生产等业务分类"],
    ["workflow", "流程节点配置", "按业务线维护节点增删改"],
    ["reminders", "提醒中心", "订单提醒、公共提醒和确认状态"],
    ["pushLogs", "推送记录", "内容、时间、发起人和发送结果"],
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
  const reminders = todayAllReminderItems(state.projects);
  const active = state.projects.filter((project) => !["已完成", "已暂停"].includes(project.status));
  return [
    `当前用户：${currentUser().name} / ${currentUser().role}`,
    `项目总数：${state.projects.length}，在途项目：${active.length}，高风险：${highRisk.length}，今日提醒：${reminders.length}`,
    `高风险项目：${highRisk.slice(0, 5).map((project) => `${project.code}《${project.title}》${project.status}/${project.currentNode}`).join("；") || "暂无"}`,
    `人员：${state.teamMembers.map((member) => `${member.name}(${member.role})`).join("、")}`,
  ].join("\n");
}

function defaultAiSettings() {
  return {
    chat: { label: "对话", providerName: "云雾 DeepSeek V4 Flash", baseUrl: "https://yunwu.ai/v1", model: "deepseek-v4-flash", configured: false },
    risk: { label: "风险评估", providerName: "云雾 DeepSeek V4 Flash", baseUrl: "https://yunwu.ai/v1", model: "deepseek-v4-flash", configured: false },
    vision: { label: "图片识别", providerName: "云雾 Qwen3 VL Flash", baseUrl: "https://yunwu.ai/v1", model: "qwen3-vl-flash", configured: false },
    command: { label: "自然语言指令", providerName: "云雾 DeepSeek V4 Flash", baseUrl: "https://yunwu.ai/v1", model: "deepseek-v4-flash", configured: false },
    transcription: { label: "语音转文字", providerName: "云雾 Whisper", baseUrl: "https://yunwu.ai/v1", model: "whisper-1", configured: false },
  };
}

function aiSettings() {
  return state.aiSettings || defaultAiSettings();
}

async function loadAiSettings() {
  try {
    const response = await fetch("/api/ai/config");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "AI 配置读取失败");
    state.aiSettings = result.tasks;
    state.aiConfigError = "";
    render();
  } catch (error) {
    state.aiConfigError = error instanceof Error ? error.message : String(error);
  }
}

async function saveAiSettingsFromForm(form) {
  const formData = new FormData(form);
  const tasks = {};
  ["chat", "risk", "vision", "command", "transcription"].forEach((task) => {
    tasks[task] = {
      providerName: String(formData.get(`${task}.providerName`) || "").trim(),
      baseUrl: String(formData.get(`${task}.baseUrl`) || "").trim(),
      model: String(formData.get(`${task}.model`) || "").trim(),
    };
  });
  state.aiConfigPending = true;
  state.aiConfigError = "";
  render();
  try {
    const response = await fetch("/api/ai/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || result.message || "AI 配置保存失败");
    state.aiSettings = result.tasks;
  } catch (error) {
    state.aiConfigError = error instanceof Error ? error.message : String(error);
  } finally {
    state.aiConfigPending = false;
    render();
  }
}

async function generateAiRiskAssessment() {
  if (state.aiRiskPending) return;
  state.aiRiskPending = true;
  state.aiRiskError = "";
  state.aiRiskResult = "";
  render();
  try {
    const response = await fetch("/api/ai/risk", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || result.message || "AI 风险评估失败");
    state.aiRiskResult = result.reply || "AI 没有返回风险评估内容。";
  } catch (error) {
    state.aiRiskError = error instanceof Error ? error.message : String(error);
  } finally {
    state.aiRiskPending = false;
    render();
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

async function recognizeQualityImage(form) {
  if (state.aiVisionPending) return;
  const formData = new FormData(form);
  const file = formData.get("image");
  if (!(file instanceof File) || !file.size) {
    state.aiVisionError = "请先选择一张质检照片。";
    render();
    return;
  }
  state.aiVisionPending = true;
  state.aiVisionError = "";
  state.aiVisionResult = "";
  render();
  try {
    const imageDataUrl = await fileToDataUrl(file);
    const response = await fetch("/api/ai/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        orderRequirement: String(formData.get("orderRequirement") || "").trim(),
        prompt: String(formData.get("prompt") || "").trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || result.message || "AI 图片识别失败");
    state.aiVisionResult = result.reply || "AI 没有返回图片识别内容。";
  } catch (error) {
    state.aiVisionError = error instanceof Error ? error.message : String(error);
  } finally {
    state.aiVisionPending = false;
    render();
  }
}

function renderAiPanel() {
  const suggestions = [
    "帮我看一下今天有哪些订单风险，需要先处理什么？",
    "把“明天下午三点提醒张莹催 BK-2026-005 合同回签”整理成可执行提醒。",
    "帮我设计一个成品尺寸质检规则，要求拍到卷尺和产品边缘。",
  ];
  const settings = aiSettings();
  const taskCards = ["chat", "risk", "vision", "command", "transcription"].map((task) => {
    const item = settings[task] || defaultAiSettings()[task];
    return `
      <article class="ai-task-card">
        <div class="ai-task-card-head">
          <strong>${escapeHtml(item.label)}</strong>
          <span class="chip ${item.configured ? "chip-status" : "chip-risk-medium"}">${item.configured ? "Key 已配置" : "Key 未配置"}</span>
        </div>
        <label class="field">
          <span>供应商名称</span>
          <input name="${task}.providerName" value="${escapeHtml(item.providerName)}" />
        </label>
        <label class="field">
          <span>Base URL</span>
          <input name="${task}.baseUrl" value="${escapeHtml(item.baseUrl)}" />
        </label>
        <label class="field">
          <span>模型名</span>
          <input name="${task}.model" value="${escapeHtml(item.model)}" />
        </label>
      </article>`;
  }).join("");

  elements.adminContent.innerHTML = `
    <section class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h3>AI 配置中心</h3>
          <div class="mini-text">按任务配置模型。API Key 只在服务端环境变量保存，后台不显示密钥内容。企微语音会用“语音转文字”和“自然语言指令”两项。</div>
        </div>
        <span class="chip chip-status">${state.aiConfigPending ? "保存中" : "服务端配置"}</span>
      </div>
      <form class="ai-config-form" id="aiConfigForm">
        <div class="ai-config-grid">${taskCards}</div>
        ${state.aiConfigError ? `<div class="ai-error">${escapeHtml(state.aiConfigError)}</div>` : ""}
        <div class="modal-actions">
          <button type="submit" class="button button-primary" ${state.aiConfigPending ? "disabled" : ""}>保存 AI 配置</button>
        </div>
      </form>
    </section>

    <section class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h3>1. 对话</h3>
          <div class="mini-text">用于后台日常交流、自然语言整理和提醒指令草稿。</div>
        </div>
        <span class="chip chip-status">${state.aiPending ? "思考中" : escapeHtml(settings.chat?.model || "deepseek-v4-flash")}</span>
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
    </section>

    <section class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h3>2. 风险评估</h3>
          <div class="mini-text">读取当前订单数据，自动整理高风险订单、原因和建议动作。</div>
        </div>
        <button type="button" class="button button-primary" data-ai-risk-action="generate" ${state.aiRiskPending ? "disabled" : ""}>${state.aiRiskPending ? "评估中" : "生成风险评估"}</button>
      </div>
      ${state.aiRiskError ? `<div class="ai-error">${escapeHtml(state.aiRiskError)}</div>` : ""}
      <div class="ai-result">${state.aiRiskResult ? formatMessageText(state.aiRiskResult) : "点击按钮后，AI 会基于当前项目、提醒时间、风险说明和下一步动作生成风险排序。"}</div>
    </section>

    <section class="ai-panel">
      <div class="ai-panel-head">
        <div>
          <h3>3. 图片识别</h3>
          <div class="mini-text">用于上传质检照片，例如卷尺量尺寸、白边、比例、胶装缺胶等。</div>
        </div>
        <span class="chip chip-status">${escapeHtml(settings.vision?.model || "qwen3-vl-flash")}</span>
      </div>
      <form class="ai-vision-form" id="aiVisionForm">
        <label class="field field-full">
          <span>质检照片</span>
          <input name="image" type="file" accept="image/*" />
        </label>
        <label class="field field-full">
          <span>订单质检要求</span>
          <textarea name="orderRequirement" rows="3" placeholder="例如：成品尺寸 210mm x 285mm，允许误差 ±1mm；不得露白边；胶装不得断胶、缺胶。"></textarea>
        </label>
        <label class="field field-full">
          <span>补充说明</span>
          <textarea name="prompt" rows="2" placeholder="例如：重点读卷尺宽边尺寸，判断是否合格。"></textarea>
        </label>
        <div class="modal-actions">
          <button type="submit" class="button button-primary" ${state.aiVisionPending ? "disabled" : ""}>${state.aiVisionPending ? "识别中" : "识别图片"}</button>
        </div>
      </form>
      ${state.aiVisionError ? `<div class="ai-error">${escapeHtml(state.aiVisionError)}</div>` : ""}
      <div class="ai-result">${state.aiVisionResult ? formatMessageText(state.aiVisionResult) : "上传照片后，AI 会输出识别结果、是否合格、异常点和是否需要人工复核。"}</div>
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

function allReminderRows() {
  const projectRows = state.projects.flatMap((project) => normalizeProjectReminders(project).map((reminder) => ({
    scope: "project",
    project,
    reminder,
  })));
  const publicRows = normalizePublicReminders(state.publicReminders).map((reminder) => ({
    scope: "public",
    project: null,
    reminder,
  }));
  return [...projectRows, ...publicRows];
}

function reminderRowText(row) {
  return [
    row.scope === "project" ? "订单提醒" : "公共提醒",
    row.project?.code,
    row.project?.title,
    row.project?.author,
    row.project?.owner,
    row.project?.partner,
    row.project?.status,
    row.project?.currentNode,
    row.reminder.person,
    row.reminder.note,
    row.reminder.source,
    row.reminder.actor,
    row.reminder.completedBy,
    row.reminder.completionNote,
    reminderItemStatus(row.reminder),
    confirmationStatusText(row.reminder),
  ].filter(Boolean).join(" ").toLowerCase();
}

function reminderTabMatches(row, tab) {
  const reminder = row.reminder;
  if (tab === "project") return row.scope === "project";
  if (tab === "public") return row.scope === "public";
  if (tab === "pending") return !["sent", "completed", "cancelled", "failed"].includes(reminder.status);
  if (tab === "sent") return reminder.status === "sent";
  if (tab === "completed") return reminder.status === "completed" || Boolean(reminder.completedAt);
  if (tab === "failed") return reminder.status === "failed";
  if (tab === "today") return dateString(reminder.date) === dateString(new Date());
  return true;
}

function filteredReminderRows() {
  const filters = state.reminderFilters || { tab: "all", person: "全部", keyword: "", sort: "timeAsc" };
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const person = filters.person || "全部";
  const rows = allReminderRows()
    .filter((row) => reminderTabMatches(row, filters.tab || "all"))
    .filter((row) => person === "全部" || row.reminder.person === person || row.reminder.actor === person)
    .filter((row) => !keyword || reminderRowText(row).includes(keyword));
  return rows.sort((left, right) => {
    if (filters.sort === "timeDesc") return parseDate(right.reminder.date).getTime() - parseDate(left.reminder.date).getTime();
    if (filters.sort === "personAsc") return String(left.reminder.person).localeCompare(String(right.reminder.person), "zh-Hans-CN") || parseDate(left.reminder.date).getTime() - parseDate(right.reminder.date).getTime();
    if (filters.sort === "statusAsc") return reminderItemStatus(left.reminder).localeCompare(reminderItemStatus(right.reminder), "zh-Hans-CN") || parseDate(left.reminder.date).getTime() - parseDate(right.reminder.date).getTime();
    return parseDate(left.reminder.date).getTime() - parseDate(right.reminder.date).getTime();
  });
}

function reminderTabItems() {
  const rows = allReminderRows();
  const tabs = [
    ["all", "全部"],
    ["today", "今日"],
    ["pending", "待提醒"],
    ["sent", "待确认"],
    ["completed", "已完成"],
    ["failed", "失败"],
    ["project", "订单提醒"],
    ["public", "公共提醒"],
  ];
  return tabs.map(([key, label]) => [key, label, rows.filter((row) => reminderTabMatches(row, key)).length]);
}

function confirmationStatusText(reminder) {
  if (reminder.status === "completed" || reminder.completedAt) {
    const by = reminder.completedBy ? ` · ${reminder.completedBy}` : "";
    return `已完成${by}`;
  }
  if (reminder.confirmable === false) return "无需确认";
  if (reminder.status === "sent") return "待对方确认";
  if (reminder.status === "failed") return "推送失败，待重试";
  return "未推送";
}

function renderRemindersPanel() {
  const rows = filteredReminderRows();
  const filters = state.reminderFilters || { tab: "all", person: "全部", keyword: "", sort: "timeAsc" };
  const upcomingPublic = activePublicReminders().length;
  const personOptions = ["全部", ...state.teamMembers.map((member) => member.name)];
  elements.adminContent.innerHTML = `
    <div class="data-panel-stack">
      <section class="data-panel">
        <div class="table-toolbar">
          <div>
            <h3>公共提醒</h3>
            <div class="mini-text">公共提醒不绑定具体订单，适合会议、送货、跨项目协同等事项；到点后同样通过企业微信推送。</div>
          </div>
          <div class="toolbar-actions">
            <label class="switch-line">
              <input type="checkbox" data-confirmable-push-enabled ${state.confirmablePushEnabled ? "checked" : ""} />
              <span>可确认推送</span>
            </label>
            <span class="chip chip-status">未完成公共提醒 ${upcomingPublic} 条</span>
          </div>
        </div>
        <form id="publicReminderForm" class="workflow-config-toolbar public-reminder-form">
          <label class="mini-field">
            <span>提醒人</span>
            <select name="person" required>
              ${state.teamMembers.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.department)}</option>`).join("")}
            </select>
          </label>
          <label class="mini-field">
            <span>提醒时间</span>
            <input type="datetime-local" name="date" value="${escapeHtml(dateTimeInputValue(new Date()))}" required />
          </label>
          <label class="mini-field workflow-description-field">
            <span>提醒内容</span>
            <input name="note" placeholder="例如：下午选题会准备样书" required />
          </label>
          <label class="mini-field compact-checkbox">
            <span>确认</span>
            <label><input type="checkbox" name="confirmable" checked /> 推送后需要对方确认完成</label>
          </label>
          <button type="submit" class="button button-primary">新增公共提醒</button>
        </form>
      </section>
      <section class="data-panel">
        <div class="table-toolbar">
          <div>
            <h3>提醒内容筛选</h3>
            <div class="mini-text">可按页签、人员、关键字和时间顺序筛选提醒内容。</div>
          </div>
          <span class="chip chip-status">当前显示 ${rows.length} 条</span>
        </div>
        <div class="reminder-tabs">
          ${reminderTabItems().map(([key, label, count]) => `
            <button type="button" class="admin-nav-button ${filters.tab === key ? "is-active" : ""}" data-reminder-tab="${escapeHtml(key)}">
              <strong>${escapeHtml(label)}</strong>
              <span class="mini-text">${count} 条</span>
            </button>`).join("")}
        </div>
        <div class="reminder-filter-toolbar">
          <label class="mini-field">
            <span>人员</span>
            <select data-reminder-filter="person">
              ${personOptions.map((person) => `<option value="${escapeHtml(person)}" ${filters.person === person ? "selected" : ""}>${escapeHtml(person === "全部" ? "全部人员" : person)}</option>`).join("")}
            </select>
          </label>
          <label class="mini-field">
            <span>筛选内容</span>
            <input data-reminder-filter="keyword" value="${escapeHtml(filters.keyword || "")}" placeholder="搜索项目、事项、发起人、合作方、状态" />
          </label>
          <label class="mini-field">
            <span>排序</span>
            <select data-reminder-filter="sort">
              <option value="timeAsc" ${filters.sort === "timeAsc" ? "selected" : ""}>按提醒时间从早到晚</option>
              <option value="timeDesc" ${filters.sort === "timeDesc" ? "selected" : ""}>按提醒时间从晚到早</option>
              <option value="personAsc" ${filters.sort === "personAsc" ? "selected" : ""}>按提醒人排序</option>
              <option value="statusAsc" ${filters.sort === "statusAsc" ? "selected" : ""}>按状态排序</option>
            </select>
          </label>
        </div>
      </section>
    </div>
    ${rows.length ? `
      <div class="table-wrapper push-log-wrapper">
        <table>
          <thead><tr><th>类型</th><th>项目 / 范围</th><th>提醒人</th><th>提醒时间</th><th>内容</th><th>状态</th><th>确认状态</th><th>来源 / 发起人</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map(({ scope, project, reminder }) => {
              const isCompleted = reminder.status === "completed" || reminder.completedAt;
              const scopeText = scope === "project" ? "订单提醒" : "公共提醒";
              const projectText = project ? `${project.code} · ${project.title}` : "公共事项";
              return `
                <tr>
                  <td><span class="permission-badge">${escapeHtml(scopeText)}</span></td>
                  <td>${escapeHtml(projectText)}</td>
                  <td>${escapeHtml(reminder.person)}</td>
                  <td>${escapeHtml(reminderTimeText(reminder.date))}</td>
                  <td class="push-content-cell">${escapeHtml(reminder.note)}</td>
                  <td><span class="${riskChip(isCompleted ? "低" : reminder.status === "failed" ? "高" : "中")}">${escapeHtml(reminderItemStatus(reminder))}</span></td>
                  <td>
                    ${escapeHtml(confirmationStatusText(reminder))}
                    ${reminder.completedAt ? `<div class="mini-text">${escapeHtml(formatPushLogTime(reminder.completedAt))}</div>` : ""}
                    ${reminder.completionNote ? `<div class="mini-text">说明：${escapeHtml(reminder.completionNote)}</div>` : ""}
                  </td>
                  <td>${escapeHtml([reminder.source, reminder.actor].filter(Boolean).join(" / ") || "手动提醒")}</td>
                  <td>
                    <button type="button" class="table-action" data-admin-action="complete-reminder" data-reminder-scope="${escapeHtml(scope)}" data-reminder-id="${escapeHtml(reminder.id)}" data-project-id="${escapeHtml(project?.id || "")}" ${isCompleted ? "disabled" : ""}>标记完成</button>
                  </td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : `
      <section class="settings-panel">
        <h3>还没有提醒任务</h3>
        <div class="mini-text">可以先新增一条公共提醒，或者在项目里设置订单提醒。</div>
      </section>`}`;
}

function renderPushLogsPanel() {
  const pushLogs = (Array.isArray(state.pushLogs) ? state.pushLogs : []).slice().sort((left, right) => {
    return parseDate(right.pushedAt).getTime() - parseDate(left.pushedAt).getTime();
  });
  const estimatedSizeKb = Math.max(1, Math.round(JSON.stringify(pushLogs).length / 1024));
  elements.adminContent.innerHTML = `
    <div class="data-panel-stack">
      <section class="data-panel">
        <div class="table-toolbar">
          <div>
            <h3>企业微信信息推送记录</h3>
            <div class="mini-text">记录每一次主动推送和到点提醒；系统会全部保留，不再自动删除旧记录。</div>
          </div>
          <div class="toolbar-actions">
            <span class="chip chip-status">全部保留 ${pushLogs.length} 条 · 约 ${estimatedSizeKb} KB</span>
            <button type="button" class="table-action table-action-danger" data-admin-action="clear-push-logs" ${pushLogs.length ? "" : "disabled"}>清空记录</button>
          </div>
        </div>
        <div class="mini-text">提示：记录量特别大时会占用存储空间，也会让后台表格变慢；后续由后台管理员按需删除。</div>
      </section>
    </div>
    ${pushLogs.length ? `
      <div class="table-wrapper push-log-wrapper">
        <table>
          <thead><tr><th>推送时间</th><th>发起人</th><th>接收人</th><th>推送内容</th><th>结果</th><th>确认状态</th><th>来源/项目</th><th>失败原因</th><th>操作</th></tr></thead>
          <tbody>
            ${pushLogs.map((log) => {
              const projectText = [log.projectCode, log.projectTitle].filter(Boolean).join(" · ");
              const sourceText = [log.source || "企业微信推送", projectText].filter(Boolean).join(" / ");
              return `
                <tr>
                  <td>${escapeHtml(formatPushLogTime(log.pushedAt))}</td>
                  <td>${escapeHtml(log.actor || "WorkPad 管家")}</td>
                  <td>
                    <strong>${escapeHtml(log.receiver || "未设置接收人")}</strong>
                    ${log.receiverUserId ? `<div class="mini-text">${escapeHtml(log.receiverUserId)}</div>` : ""}
                  </td>
                  <td class="push-content-cell">${formatMessageText(log.content || "")}</td>
                  <td><span class="chip ${log.success ? "chip-risk-low" : "chip-risk-high"}">${escapeHtml(log.status || (log.success ? "成功" : "失败"))}</span></td>
                  <td>
                    ${escapeHtml(log.completionStatus || (log.confirmable ? "待确认" : "-"))}
                    ${log.completedAt ? `<div class="mini-text">${escapeHtml(formatPushLogTime(log.completedAt))}</div>` : ""}
                    ${log.completedBy ? `<div class="mini-text">${escapeHtml(log.completedBy)}</div>` : ""}
                    ${log.completionNote ? `<div class="mini-text">说明：${escapeHtml(log.completionNote)}</div>` : ""}
                  </td>
                  <td>${escapeHtml(sourceText)}</td>
                  <td class="push-error-cell">${escapeHtml(log.error || "-")}</td>
                  <td><button type="button" class="table-action table-action-danger" data-admin-action="delete-push-log" data-push-log-id="${escapeHtml(log.id)}">删除</button></td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>` : `
      <section class="settings-panel">
        <h3>还没有推送记录</h3>
        <div class="mini-text">后续企业微信到点提醒、后台主动发消息会自动写入这里。</div>
      </section>`}`;
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
    departments: ["组织部门", `当前共 ${departmentOptions().length} 个部门，人员安排时从这里选择。`],
    roles: ["角色管理", `当前共 ${roleOptions().length} 个角色，权限矩阵会按角色同步展示。`],
    permissions: ["权限分配", "当前可以在这里调整角色权限矩阵。"],
    partners: ["合作方管理", `当前已整理 ${getPartners().length} 个合作方，项目录入时已改成通过选择进入。`],
    businessLines: ["业务线管理", `当前共 ${businessLineOptions().length} 条业务线，可分别维护流程名称和说明。`],
    workflow: ["流程节点配置", "可以按业务线增删流程节点、定义节点名称、负责人角色、提醒角色和标准周期。"],
    reminders: ["提醒中心", `当前共有 ${activePublicReminders().length} 条未完成公共提醒，订单提醒和公共提醒都可在这里看确认状态。`],
    pushLogs: ["信息推送记录", `当前共 ${state.pushLogs.length} 条推送记录，包含成功、失败和失败原因。`],
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
              <span class="chip chip-status">组织部门</span>
              <span class="chip chip-status">角色管理</span>
              <span class="chip chip-status">权限矩阵</span>
              <span class="chip chip-status">合作方管理</span>
          <span class="chip chip-status">业务线管理</span>
          <span class="chip chip-status">流程节点配置</span>
          <span class="chip chip-status">提醒中心</span>
          <span class="chip chip-status">信息推送记录</span>
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

  if (state.adminTab === "reminders") {
    renderRemindersPanel();
    return;
  }

  if (state.adminTab === "pushLogs") {
    renderPushLogsPanel();
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
              <div class="mini-text">支持新增、编辑和切换身份。企微绑定使用企业微信 UserId，不是微信昵称。</div>
            </div>
            <button type="button" class="button button-primary" data-admin-action="add-user" ${canManageUsers ? "" : "disabled"}>新增人员</button>
          </div>
        </section>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>姓名</th><th>用户名</th><th>角色</th><th>部门</th><th>企微账号 UserId</th><th>企微绑定</th><th>密码状态</th><th>在途项目</th><th>今日提醒</th><th>操作</th></tr></thead>
          <tbody>
            ${state.teamMembers.map((member) => `
              <tr>
                <td>${escapeHtml(member.name)}</td>
                <td>${escapeHtml(member.username || "未设置")}</td>
                <td><span class="permission-badge">${escapeHtml(member.role)}</span></td>
                <td>${escapeHtml(member.department)}</td>
                  <td>${escapeHtml(member.wecomUserId || "未设置")}</td>
                  <td>${wecomBindingBadge(member)}</td>
                  <td><span class="binding-badge ${member.passwordReady ? "is-bound" : "is-unbound"}">${member.passwordReady ? "已设置" : "待重置"}</span></td>
                  <td>${state.projects.filter((item) => item.owner === member.name && !["已完成", "已暂停"].includes(item.status)).length}</td>
                  <td>${todayAllReminderItems(state.projects, member.name).length}</td>
                  <td>
                    <div class="table-action-group">
                      <button type="button" class="table-action" data-admin-action="edit-user" data-member-id="${escapeHtml(member.id)}" ${canManageUsers ? "" : "disabled"}>编辑</button>
                      <button type="button" class="table-action" data-admin-action="reset-password" data-member-id="${escapeHtml(member.id)}" ${canManageUsers ? "" : "disabled"}>重置密码</button>
                      <button type="button" class="table-action table-action-danger" data-admin-action="delete-user" data-member-id="${escapeHtml(member.id)}" ${canManageUsers ? "" : "disabled"}>删除</button>
                    </div>
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
      return;
    }

    if (state.adminTab === "departments") {
      const canManageUsers = hasPermission("管理人员");
      elements.adminContent.innerHTML = `
        <div class="data-panel-stack">
          <section class="data-panel">
            <div class="table-toolbar">
              <div>
                <h3>部门列表</h3>
                <div class="mini-text">人员新增或编辑时会从这里选择部门；删除部门后，人员会归到“未分配部门”。</div>
              </div>
              <button type="button" class="button button-primary" data-admin-action="add-department" ${canManageUsers ? "" : "disabled"}>新增部门</button>
            </div>
          </section>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>部门</th><th>成员数</th><th>在途项目</th><th>操作</th></tr></thead>
            <tbody>
              ${departmentOptions().map((department) => {
                const members = state.teamMembers.filter((member) => member.department === department);
                const memberNames = new Set(members.map((member) => member.name));
                const activeProjects = state.projects.filter((project) => memberNames.has(project.owner) && !["已完成", "已暂停"].includes(project.status)).length;
                return `
                  <tr>
                    <td>${escapeHtml(department)}</td>
                    <td>${members.length}</td>
                    <td>${activeProjects}</td>
                    <td>
                      <div class="table-action-group">
                        <button type="button" class="table-action" data-admin-action="edit-department" data-department-name="${escapeHtml(department)}" ${canManageUsers ? "" : "disabled"}>编辑</button>
                        <button type="button" class="table-action table-action-danger" data-admin-action="delete-department" data-department-name="${escapeHtml(department)}" ${canManageUsers ? "" : "disabled"}>删除</button>
                      </div>
                    </td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>`;
      return;
    }

    if (state.adminTab === "roles") {
      const canManagePermissions = hasPermission("管理权限");
      elements.adminContent.innerHTML = `
        <div class="data-panel-stack">
          <section class="data-panel">
            <div class="table-toolbar">
              <div>
                <h3>角色列表</h3>
                <div class="mini-text">角色在这里建立；具体能做什么，在“权限分配”里勾选。</div>
              </div>
              <button type="button" class="button button-primary" data-admin-action="add-role" ${canManagePermissions ? "" : "disabled"}>新增角色</button>
            </div>
          </section>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>角色</th><th>说明</th><th>成员数</th><th>流程引用</th><th>类型</th><th>操作</th></tr></thead>
            <tbody>
              ${roleOptions().map((role) => {
                const memberCount = state.teamMembers.filter((member) => member.role === role.name).length;
                const workflowCount = allWorkflowNodes().filter((node) => node.ownerRole === role.name || node.reminderRole === role.name).length;
                return `
                  <tr>
                    <td><span class="permission-badge">${escapeHtml(role.name)}</span></td>
                    <td>${escapeHtml(role.description || "自定义角色")}</td>
                    <td>${memberCount}</td>
                    <td>${workflowCount}</td>
                    <td>${role.locked ? "系统角色" : "自定义角色"}</td>
                    <td>
                      <div class="table-action-group">
                        <button type="button" class="table-action" data-admin-action="edit-role" data-role-key="${escapeHtml(role.key)}" ${canManagePermissions ? "" : "disabled"}>编辑</button>
                        <button type="button" class="table-action table-action-danger" data-admin-action="delete-role" data-role-key="${escapeHtml(role.key)}" ${canManagePermissions && !role.locked ? "" : "disabled"}>删除</button>
                      </div>
                    </td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>`;
      return;
    }

    if (state.adminTab === "permissions") {
      const canManagePermissions = hasPermission("管理权限");
      const roles = roleOptions();
      elements.adminContent.innerHTML = `
        <div class="permission-panel">
          <table class="permission-table">
            <thead><tr><th>权限项</th><th>说明</th>${roles.map((role) => `<th>${escapeHtml(role.name)}</th>`).join("")}</tr></thead>
            <tbody>
              ${state.permissionRows.map((row, index) => `
                <tr>
                  <td>${escapeHtml(row.label)}</td>
                  <td>${escapeHtml(row.description)}</td>
                  ${roles.map((role) => `<td><input type="checkbox" ${row.values[role.key] === "是" ? "checked" : ""} data-permission-index="${index}" data-permission-role="${escapeHtml(role.key)}" ${canManagePermissions ? "" : "disabled"} /></td>`).join("")}
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
            <thead><tr><th>合作方</th><th>联系人</th><th>联系电话</th><th>地址/区域</th><th>当前项目数</th><th>高风险项目</th><th>说明</th><th>操作</th></tr></thead>
            <tbody>
              ${getPartnerProfiles().map((partner) => {
                const partnerProjects = state.projects.filter((item) => item.partner === partner.name);
                const highRisk = partnerProjects.filter((item) => getProjectRisk(item).level === "高").length;
                return `
                  <tr>
                    <td>${escapeHtml(partner.name)}</td>
                    <td>${escapeHtml(partner.contact || "未设置")}</td>
                    <td>${escapeHtml(partner.phone || "未设置")}</td>
                    <td>${escapeHtml(partner.address || "未设置")}</td>
                    <td>${partnerProjects.length}</td>
                    <td>${highRisk}</td>
                    <td>${escapeHtml(partner.note || "项目录入时通过选择进入")}</td>
                    <td>
                      <div class="table-action-group">
                        <button type="button" class="table-action" data-admin-action="edit-partner" data-partner-name="${escapeHtml(partner.name)}" ${canManagePartners ? "" : "disabled"}>编辑</button>
                        <button type="button" class="table-action table-action-danger" data-admin-action="delete-partner" data-partner-name="${escapeHtml(partner.name)}" ${canManagePartners ? "" : "disabled"}>删除</button>
                      </div>
                    </td>
                  </tr>`;
              }).join("")}
            </tbody>
        </table>
    </div>`;
    return;
  }

    if (state.adminTab === "businessLines") {
      const canManageWorkflow = hasPermission("管理流程节点");
      elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="data-panel">
          <div class="table-toolbar">
            <div>
              <h3>业务线列表</h3>
              <div class="mini-text">业务线决定一个项目可选择哪套流程节点。出版、设计、生产可以各走各的节点。</div>
            </div>
            <button type="button" class="button button-primary" data-admin-action="add-business-line" ${canManageWorkflow ? "" : "disabled"}>新增业务线</button>
          </div>
        </section>
      </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>业务线</th><th>流程名称</th><th>节点数</th><th>引用项目</th><th>说明</th><th>操作</th></tr></thead>
            <tbody>
              ${businessLineOptions().map((line) => {
                const projectCount = state.projects.filter((project) => businessLineIdForProject(project) === line.id).length;
                return `
                  <tr>
                    <td><span class="permission-badge">${escapeHtml(line.name)}</span></td>
                    <td>${escapeHtml(line.workflowName)}</td>
                    <td>${line.nodes.length}</td>
                    <td>${projectCount}</td>
                    <td>${escapeHtml(line.description || "可在后台维护该业务线对应的流程节点。")}</td>
                    <td>
                      <div class="table-action-group">
                        <button type="button" class="table-action" data-admin-action="edit-business-line" data-business-line-id="${escapeHtml(line.id)}" ${canManageWorkflow ? "" : "disabled"}>编辑</button>
                        <button type="button" class="table-action table-action-danger" data-admin-action="delete-business-line" data-business-line-id="${escapeHtml(line.id)}" ${canManageWorkflow ? "" : "disabled"}>删除</button>
                      </div>
                    </td>
                  </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>`;
      return;
    }

    const canManageWorkflow = hasPermission("管理流程节点");
    const workflowRoles = roleOptions();
    const workflowLine = businessLineById(state.selectedWorkflowLineId);
    elements.adminContent.innerHTML = `
      <div class="data-panel-stack">
        <section class="data-panel">
          <div class="table-toolbar">
            <div>
              <h3>按业务线配置节点</h3>
              <div class="mini-text">先选择业务线，再维护该业务线自己的流程名称、节点名称、角色和周期。</div>
            </div>
            <button type="button" class="button button-primary" data-admin-action="add-workflow-node" ${canManageWorkflow ? "" : "disabled"}>新增节点</button>
          </div>
          <div class="workflow-config-toolbar">
            <label class="mini-field">
              <span>当前业务线</span>
              <select data-workflow-line-select ${canManageWorkflow ? "" : "disabled"}>
                ${businessLineOptions().map((line) => `<option value="${escapeHtml(line.id)}" ${workflowLine.id === line.id ? "selected" : ""}>${escapeHtml(line.name)}</option>`).join("")}
              </select>
            </label>
            <label class="mini-field">
              <span>流程名称</span>
              <input value="${escapeHtml(workflowLine.workflowName)}" data-workflow-line-field="workflowName" ${canManageWorkflow ? "" : "disabled"} />
            </label>
            <label class="mini-field workflow-description-field">
              <span>业务线说明</span>
              <input value="${escapeHtml(workflowLine.description || "")}" data-workflow-line-field="description" ${canManageWorkflow ? "" : "disabled"} />
            </label>
          </div>
        </section>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>顺序</th><th>节点名称</th><th>默认负责人角色</th><th>默认提醒角色</th><th>标准周期（天）</th><th>操作</th></tr></thead>
          <tbody>
            ${workflowLine.nodes.map((node, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><input type="text" value="${escapeHtml(node.name)}" data-workflow-node-id="${escapeHtml(node.id)}" data-workflow-field="name" ${canManageWorkflow ? "" : "disabled"} /></td>
                <td><select data-workflow-node-id="${escapeHtml(node.id)}" data-workflow-field="ownerRole" ${canManageWorkflow ? "" : "disabled"}>${workflowRoles.map((role) => `<option value="${escapeHtml(role.name)}" ${node.ownerRole === role.name ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select></td>
                <td><select data-workflow-node-id="${escapeHtml(node.id)}" data-workflow-field="reminderRole" ${canManageWorkflow ? "" : "disabled"}>${workflowRoles.map((role) => `<option value="${escapeHtml(role.name)}" ${node.reminderRole === role.name ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select></td>
                <td><input type="number" min="0" value="${node.cycle}" data-workflow-node-id="${escapeHtml(node.id)}" data-workflow-field="cycle" ${canManageWorkflow ? "" : "disabled"} /></td>
                <td>
                  <div class="table-action-group">
                    <button type="button" class="table-action" data-admin-action="move-workflow-node-up" data-workflow-node-id="${escapeHtml(node.id)}" ${canManageWorkflow && index > 0 ? "" : "disabled"}>上移</button>
                    <button type="button" class="table-action" data-admin-action="move-workflow-node-down" data-workflow-node-id="${escapeHtml(node.id)}" ${canManageWorkflow && index < workflowLine.nodes.length - 1 ? "" : "disabled"}>下移</button>
                    <button type="button" class="table-action table-action-danger" data-admin-action="delete-workflow-node" data-workflow-node-id="${escapeHtml(node.id)}" ${canManageWorkflow ? "" : "disabled"}>删除</button>
                  </div>
                </td>
              </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderNodeTimelineHtml(project) {
  const nodes = mergeProjectNodes(project.nodes, {
    startDate: project.startDate,
    owner: project.owner,
    status: project.status,
    currentNode: project.currentNode,
    reminderPerson: project.reminderPerson,
    reminderDate: project.reminderDate,
    blockedNode: project.status === "已暂停" ? project.currentNode : "",
    businessLineId: project.businessLineId,
  });
  const recordedCount = nodes.filter((node) => node.startedAt).length;
  const completedCount = nodes.filter((node) => node.completedAt).length;
  return `
    <section class="detail-card">
      <div class="table-toolbar">
        <div>
          <h3>节点时间表</h3>
          <p class="mini-text">接稿日期：${escapeHtml(dateString(project.startDate))} · 已进入 ${recordedCount} 个节点 · 已完成 ${completedCount} 个节点</p>
        </div>
      </div>
      <div class="node-timeline-wrapper" aria-label="节点横向时间轴">
        <div class="node-timeline-track">
          ${nodes.map((node, index) => {
            const status = textValue(node.status || "未开始") || "未开始";
            const startedText = nodeTimeText(node.startedAtTime || node.startedAt, node.startedAt || "未开始");
            const completedText = nodeTimeText(node.completedAtTime || node.completedAt, node.completedAt || (status === "未开始" ? "-" : "进行中"));
            const operator = nodeOperatorText(node) || "-";
            return `
              <article class="node-timeline-card ${nodeTimelineStatusClass(node)}">
                <div class="node-timeline-marker">
                  <span class="node-timeline-index">${index + 1}</span>
                  <span class="node-timeline-status">${escapeHtml(status)}</span>
                </div>
                <div class="node-timeline-card-body">
                  <div class="node-timeline-top">
                    <strong>${escapeHtml(node.name)}</strong>
                    <span>${escapeHtml(nodeGapText(nodes, index))}</span>
                  </div>
                  <div class="node-timeline-dates">
                    <span>进入：${escapeHtml(startedText)}</span>
                    <span>完成：${escapeHtml(completedText)}</span>
                  </div>
                  <div class="node-timeline-stay">
                    <span>本节点停留</span>
                    <strong>${escapeHtml(nodeDurationText(node))}</strong>
                  </div>
                  <div class="node-timeline-people">
                    <span>负责人：${escapeHtml(node.owner || "未分配")}</span>
                    <span>操作人：${escapeHtml(operator)}</span>
                  </div>
                  <p class="node-timeline-note">备注：${escapeHtml(node.note || "-")}</p>
                </div>
              </article>`;
          }).join("")}
        </div>
      </div>
    </section>`;
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
  const reminders = normalizeProjectReminders(project);
  const nextNode = nextNodeForProject(project);
  const startActionHtml = project.status === "待启动"
    ? `<button type="button" class="button button-primary" data-drawer-action="start" ${canEditProject ? "" : "disabled"}>开始当前节点：${escapeHtml(project.currentNode)}</button>`
    : "";
  const advanceActionHtml = project.status !== "待启动" && project.status !== "已完成" && nextNode
    ? `<button type="button" class="button button-primary" data-drawer-action="advance" ${canEditProject ? "" : "disabled"}>进入下一节点：${escapeHtml(nextNode)}</button>`
    : "";
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
          <div class="overview-item"><span>业务线</span><strong>${escapeHtml(businessLineName(project.businessLineId))}</strong></div>
          <div class="overview-item"><span>合作方</span><strong>${escapeHtml(project.partner || "未设置")}</strong></div>
          <div class="overview-item"><span>当前节点</span><strong>${escapeHtml(project.currentNode)}</strong></div>
          <div class="overview-item"><span>提醒任务</span><strong>${reminders.length} 条</strong></div>
          <div class="overview-item"><span>今日提醒</span><strong>${todayReminderItems([project]).length} 条</strong></div>
        </div>
        ${reminderListHtml(project, { emptyText: "暂无提醒任务" })}
        ${reminderRecordHtml(project)}
      </section>
      ${renderNodeTimelineHtml(project)}
      <section class="detail-card">
        <h3>风险与动作</h3>
        <div class="detail-actions">
          ${startActionHtml}
          ${advanceActionHtml}
          <button type="button" class="button button-secondary" data-drawer-action="edit" ${canEditProject ? "" : "disabled"}>编辑基础信息</button>
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
  const businessLineId = current ? businessLineIdForProject(current) : DEFAULT_BUSINESS_LINE_ID;
  elements.formBusinessLine.value = businessLineId;
  elements.formPartner.value = current ? current.partner : "";
  elements.formStatus.value = current ? current.status : "待启动";
  renderCurrentNodeOptions(businessLineId, current ? current.currentNode : defaultNodeForStatus("待启动", businessLineId));
  elements.formPlanFinish.value = current ? dateString(current.planFinish) : dateString(addDays(new Date(), 14));
  elements.formSummary.value = current ? current.summary : "";
  elements.formNextAction.value = current ? current.nextAction : "";
  elements.formRiskNote.value = current ? current.riskNote : "";
  const currentReminder = current ? primaryProjectReminder(current) : null;
  elements.formReminderPerson.value = currentReminder?.person || (current ? current.reminderPerson : currentUser().name);
  elements.formReminderDate.value = currentReminder?.date ? dateTimeInputValue(currentReminder.date) : dateTimeInputValue(new Date());
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
  if (mode === "department" && !hasPermission("管理人员")) return;
  if (mode === "role" && !hasPermission("管理权限")) return;
  if (mode === "partner" && !hasPermission("管理合作方")) return;
  if (mode === "businessLine" && !hasPermission("管理流程节点")) return;
  state.adminEditingMode = mode;
  state.adminEditingId = payload?.id || payload || "";
  if (mode === "user") {
    const member = state.teamMembers.find((item) => item.id === state.adminEditingId);
    const roles = roleOptions();
    const departments = departmentOptions();
    elements.adminModalTitle.textContent = member ? "编辑人员" : "新增人员";
    elements.adminModalContent.innerHTML = `
      <form id="adminUserForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field"><span>姓名</span><input name="name" type="text" value="${escapeHtml(member?.name || "")}" required /></label>
          <label class="field"><span>登录用户名</span><input name="username" type="text" value="${escapeHtml(member?.username || "")}" placeholder="例如 zhangying" required /></label>
          <label class="field"><span>角色</span>
            <select name="role">
              ${roles.map((role) => `<option value="${escapeHtml(role.name)}" ${member?.role === role.name ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}
            </select>
          </label>
          <label class="field"><span>部门</span>
            <select name="department">
              ${departments.map((department) => `<option value="${escapeHtml(department)}" ${member?.department === department ? "selected" : ""}>${escapeHtml(department)}</option>`).join("")}
            </select>
          </label>
          <label class="field field-full">
            <span>企微账号 UserId</span>
            <input name="wecomUserId" type="text" value="${escapeHtml(member?.wecomUserId || "")}" placeholder="例如 JiaTao / z.y" />
            <small>绑定成功后用于企业微信消息识别和提醒推送；这里不是微信昵称。</small>
          </label>
          <div class="field field-full">
            <span>密码状态</span>
            <small>${member?.passwordReady ? "已设置登录密码；如人员忘记密码，可以点击下方“重置密码”。" : "尚未设置密码；保存人员后点击“重置密码”生成临时密码。"}</small>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          ${member?.wecomUserId ? `<button type="button" class="button button-secondary" data-admin-unbind-wecom="${escapeHtml(member.id)}">企业微信账号解绑</button>` : ""}
          ${member ? `<button type="button" class="button button-secondary" data-admin-reset-password="${escapeHtml(member.id)}">重置密码</button>` : ""}
          <button type="submit" class="button button-primary">保存人员</button>
        </div>
      </form>`;
  }
  if (mode === "department") {
    const departmentName = String(state.adminEditingId || "");
    elements.adminModalTitle.textContent = departmentName ? "编辑部门" : "新增部门";
    elements.adminModalContent.innerHTML = `
      <form id="adminDepartmentForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field field-full"><span>部门名称</span><input name="name" type="text" value="${escapeHtml(departmentName)}" required /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存部门</button>
        </div>
      </form>`;
  }
  if (mode === "role") {
    const role = roleOptions().find((item) => item.key === state.adminEditingId);
    elements.adminModalTitle.textContent = role ? "编辑角色" : "新增角色";
    elements.adminModalContent.innerHTML = `
      <form id="adminRoleForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field"><span>角色名称</span><input name="name" type="text" value="${escapeHtml(role?.name || "")}" required /></label>
          <label class="field"><span>角色类型</span><input type="text" value="${role?.locked ? "系统角色" : "自定义角色"}" disabled /></label>
          <label class="field field-full"><span>角色说明</span><input name="description" type="text" value="${escapeHtml(role?.description || "")}" placeholder="说明这个角色一般负责什么" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存角色</button>
        </div>
      </form>`;
  }
  if (mode === "partner") {
    const partnerName = String(state.adminEditingId || "");
    const partner = partnerName ? findPartnerProfile(partnerName) : { name: "", contact: "", phone: "", address: "", note: "" };
    elements.adminModalTitle.textContent = partnerName ? "编辑合作方" : "新增合作方";
    elements.adminModalContent.innerHTML = `
      <form id="adminPartnerForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field"><span>合作方名称</span><input name="name" type="text" value="${escapeHtml(partner.name)}" required /></label>
          <label class="field"><span>联系人</span><input name="contact" type="text" value="${escapeHtml(partner.contact || "")}" placeholder="例如 李岚" /></label>
          <label class="field"><span>联系电话</span><input name="phone" type="text" value="${escapeHtml(partner.phone || "")}" placeholder="手机或座机" /></label>
          <label class="field"><span>地址/区域</span><input name="address" type="text" value="${escapeHtml(partner.address || "")}" placeholder="例如 北京 / 上海" /></label>
          <label class="field field-full"><span>说明</span><input name="note" type="text" value="${escapeHtml(partner.note || "")}" placeholder="合作范围、账期、特殊要求等" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存合作方</button>
        </div>
      </form>`;
  }
  if (mode === "businessLine") {
    const line = businessLineOptions().find((item) => item.id === state.adminEditingId);
    elements.adminModalTitle.textContent = line ? "编辑业务线" : "新增业务线";
    elements.adminModalContent.innerHTML = `
      <form id="adminBusinessLineForm" class="project-form">
        <div class="modal-form-grid">
          <label class="field"><span>业务线名称</span><input name="name" type="text" value="${escapeHtml(line?.name || "")}" placeholder="例如 出版类业务线" required /></label>
          <label class="field"><span>流程名称</span><input name="workflowName" type="text" value="${escapeHtml(line?.workflowName || "")}" placeholder="例如 出版标准流程" required /></label>
          <label class="field field-full"><span>业务线说明</span><input name="description" type="text" value="${escapeHtml(line?.description || "")}" placeholder="说明这条业务线适用于哪些订单" /></label>
        </div>
        <div class="modal-actions">
          <button type="button" class="button button-ghost" data-admin-close="true">取消</button>
          <button type="submit" class="button button-primary">保存业务线</button>
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
  const businessLineId = elements.formBusinessLine.value || DEFAULT_BUSINESS_LINE_ID;
  const currentNode = elements.formCurrentNode.value;
  const owner = elements.formOwner.value.trim();
  const reminderDate = dateTimeString(elements.formReminderDate.value || new Date());
  const reminderPerson = elements.formReminderPerson.value.trim() || owner;
  const projectId = existing ? existing.id : uid();
  const reminderNote = elements.formNextAction.value.trim() || "待补充下一步动作";
  const baseReminders = existing ? normalizeProjectReminders(existing) : [];
  const hasSameReminder = baseReminders.some((item) => {
    return item.person === reminderPerson && item.date === reminderDate && item.note === reminderNote && item.status !== "cancelled";
  });
  const project = normalizeProject({
    ...(existing || {}),
    id: projectId,
    source: existing ? existing.source : "custom",
    businessLineId,
    businessLineName: businessLineName(businessLineId),
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
    nextAction: reminderNote,
    riskNote: elements.formRiskNote.value.trim(),
    reminders: baseReminders,
    reminderPerson,
    reminderDate,
    nodes: mergeProjectNodes(existing?.nodes, {
      startDate: existing ? existing.startDate : now,
      owner,
      status,
      currentNode,
      reminderPerson,
      reminderDate,
      blockedNode: status === "已暂停" ? currentNode : "",
      businessLineId,
    }),
    followUps: [{ time: dateTimeString(now), user: owner, progress: existing ? "更新了项目信息" : "创建了项目", nextAction: reminderNote }, ...(existing?.followUps || [])],
    logs: [{ time: dateTimeString(now), actor: owner, action: existing ? "编辑项目" : "创建项目", detail: `状态为「${status}」，当前节点为「${currentNode}」。` }, ...(existing?.logs || [])],
  });
  if (!hasSameReminder) {
    appendProjectReminder(project, {
      person: reminderPerson,
      date: reminderDate,
      note: reminderNote,
      actor: owner,
      source: existing ? "后台编辑" : "后台创建",
      recordAt: dateTimeString(now),
      createdAt: now.toISOString(),
    });
  } else {
    syncProjectReminderFields(project);
  }
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

function nodeTransitionContext(project, operator, operationTime) {
  return {
    startDate: project.startDate,
    owner: project.owner,
    status: project.status,
    currentNode: project.currentNode,
    reminderPerson: project.reminderPerson,
    reminderDate: project.reminderDate,
    blockedNode: project.status === "已暂停" ? project.currentNode : "",
    businessLineId: project.businessLineId,
    operator,
    operationTime,
  };
}

function recordProjectOperation(project, operator, action, detail, operationTime = new Date()) {
  const time = dateTimeString(operationTime);
  project.updatedAt = time;
  project.logs = [
    { time, actor: operator, action, detail },
    ...(Array.isArray(project.logs) ? project.logs : []),
  ].slice(0, 100);
  project.followUps = [
    { time, user: operator, progress: detail, nextAction: project.nextAction || "待补充下一步动作" },
    ...(Array.isArray(project.followUps) ? project.followUps : []),
  ].slice(0, 50);
}

function startCurrentProjectNode(project, operator, operationTime = new Date()) {
  const nodeName = project.currentNode || defaultNodeForStatus(project.status, project.businessLineId);
  project.currentNode = nodeName;
  project.status = statusForNodeName(nodeName, project.status);
  project.nodes = mergeProjectNodes(project.nodes, nodeTransitionContext(project, operator, operationTime));
  project.nodes = project.nodes.map((node) => {
    if (node.name !== nodeName) return node;
    return {
      ...node,
      status: node.status === "未开始" ? "进行中" : node.status,
      startedAt: dateString(operationTime),
      startedAtTime: dateTimeString(operationTime),
      startedBy: operator,
      note: `由 ${operator} 于 ${dateTimeString(operationTime)} 进入该节点。`,
    };
  });
  recordProjectOperation(project, operator, "进入节点", `进入「${nodeName}」节点。`, operationTime);
}

function advanceProjectNode(project, operator, operationTime = new Date()) {
  const nextNode = nextNodeForProject(project);
  if (!nextNode) return false;
  const previousNode = project.currentNode;
  project.currentNode = nextNode;
  project.status = statusForNodeName(nextNode, project.status);
  project.nodes = mergeProjectNodes(project.nodes, nodeTransitionContext(project, operator, operationTime));
  project.nodes = project.nodes.map((node) => {
    if (node.name === previousNode) {
      return {
        ...node,
        status: "已完成",
        completedAt: dateString(operationTime),
        completedAtTime: dateTimeString(operationTime),
        completed: dateString(operationTime),
        completedBy: operator,
        note: `由 ${operator} 于 ${dateTimeString(operationTime)} 完成并推进到下一节点。`,
      };
    }
    if (node.name === nextNode) {
      return {
        ...node,
        status: "进行中",
        startedAt: dateString(operationTime),
        startedAtTime: dateTimeString(operationTime),
        startedBy: operator,
        completedAt: "",
        completedAtTime: "",
        completed: "",
        completedBy: "",
        note: `由 ${operator} 于 ${dateTimeString(operationTime)} 进入该节点。`,
      };
    }
    return node;
  });
  recordProjectOperation(project, operator, "推进节点", `从「${previousNode}」进入「${nextNode}」节点。`, operationTime);
  return true;
}

function completeProjectFromDrawer(project, operator, operationTime = new Date()) {
  const previousNode = project.currentNode;
  project.status = "已完成";
  const nodeNames = workflowNodeNamesForBusinessLine(project.businessLineId);
  project.currentNode = nodeNames[nodeNames.length - 1] || project.currentNode;
  project.nodes = mergeProjectNodes(project.nodes, nodeTransitionContext(project, operator, operationTime));
  project.nodes = project.nodes.map((node) => {
    if (node.name !== previousNode && node.name !== project.currentNode) return node;
    return {
      ...node,
      status: "已完成",
      completedAt: dateString(operationTime),
      completedAtTime: dateTimeString(operationTime),
      completed: dateString(operationTime),
      completedBy: operator,
      note: `由 ${operator} 于 ${dateTimeString(operationTime)} 标记完成。`,
    };
  });
  recordProjectOperation(project, operator, "标记完成", `项目在「${previousNode}」节点标记完成。`, operationTime);
}

async function handleDrawerAction(action) {
  if (!hasPermission("编辑项目状态")) return;
  const current = state.projects.find((item) => item.id === state.selectedProjectId);
  if (!current) return;
  if (action === "edit") {
    openModal(current);
    return;
  }
  const operator = currentUser().name || "后台用户";
  const operationTime = new Date();
  if (action === "start") {
    startCurrentProjectNode(current, operator, operationTime);
  }
  if (action === "advance") {
    advanceProjectNode(current, operator, operationTime);
  }
  if (action === "pause") {
    current.status = current.status === "已暂停" ? "作者沟通中" : "已暂停";
    current.nodes = mergeProjectNodes(current.nodes, nodeTransitionContext(current, operator, operationTime));
    recordProjectOperation(current, operator, current.status === "已暂停" ? "暂停项目" : "恢复项目", current.status === "已暂停" ? `暂停在「${current.currentNode}」节点。` : `恢复「${current.currentNode}」节点。`, operationTime);
  }
  if (action === "complete") {
    completeProjectFromDrawer(current, operator, operationTime);
  }
  saveProjects();
  await flushRemoteSync();
  render();
}

function renameMemberAcrossProjects(previousName, nextName) {
  state.projects = state.projects.map((project) => syncProjectReminderFields({
    ...project,
    owner: project.owner === previousName ? nextName : project.owner,
    reminderPerson: project.reminderPerson === previousName ? nextName : project.reminderPerson,
    reminders: normalizeProjectReminders(project).map((reminder) => ({
      ...reminder,
      person: reminder.person === previousName ? nextName : reminder.person,
    })),
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

function renameDepartmentAcrossMembers(previousName, nextName) {
  state.teamMembers = state.teamMembers.map((member) => ({
    ...member,
    department: member.department === previousName ? nextName : member.department,
  }));
}

function renameRoleAcrossSettings(previousName, nextName) {
  state.teamMembers = state.teamMembers.map((member) => ({
    ...member,
    role: member.role === previousName ? nextName : member.role,
  }));
  state.workflowConfig = state.workflowConfig.map((node) => ({
    ...node,
    ownerRole: node.ownerRole === previousName ? nextName : node.ownerRole,
    reminderRole: node.reminderRole === previousName ? nextName : node.reminderRole,
  }));
  state.businessLines = businessLineOptions().map((line) => ({
    ...line,
    nodes: line.nodes.map((node) => ({
      ...node,
      ownerRole: node.ownerRole === previousName ? nextName : node.ownerRole,
      reminderRole: node.reminderRole === previousName ? nextName : node.reminderRole,
    })),
  }));
}

async function deleteMember(memberId) {
  if (!hasPermission("管理人员")) return;
  const member = state.teamMembers.find((item) => item.id === memberId);
  if (!member) return;
  if (state.teamMembers.length <= 1) {
    window.alert("至少需要保留 1 名人员。");
    return;
  }
  const activeProjects = state.projects.filter((project) => project.owner === member.name || reminderMatchesMember(project, member.name)).length;
  const confirmed = window.confirm(`确定删除人员「${member.name}」吗？${activeProjects ? "相关订单会改为“未分配”，不会删除订单。" : ""}`);
  if (!confirmed) return;
  state.teamMembers = state.teamMembers.filter((item) => item.id !== memberId);
  renameMemberAcrossProjects(member.name, "未分配");
  if (state.currentUserId === memberId) state.currentUserId = state.teamMembers[0].id;
  state.departments = normalizeDepartments(state.departments, state.teamMembers);
  saveSettings();
  await flushRemoteSync();
  render();
}

async function unbindMemberWecom(memberId) {
  if (!hasPermission("管理人员")) return;
  const member = state.teamMembers.find((item) => item.id === memberId);
  if (!member) return;
  if (!String(member.wecomUserId || "").trim()) {
    window.alert(`「${member.name}」当前没有绑定企业微信账号。`);
    return;
  }
  const confirmed = window.confirm(`确定解绑「${member.name}」的企业微信账号吗？解绑后这个人将不能收到 WorkPad 企业微信提醒。`);
  if (!confirmed) return;
  member.wecomUserId = "";
  saveSettings();
  await flushRemoteSync();
  closeAdminModal();
  render();
}

async function resetMemberPassword(memberId) {
  if (!hasPermission("管理人员")) return;
  const member = state.teamMembers.find((item) => item.id === memberId);
  if (!member) return;
  const confirmed = window.confirm(`确定重置「${member.name}」的登录密码吗？重置后会得到一个临时密码。`);
  if (!confirmed) return;
  const temporaryPassword = window.prompt("请输入临时密码，至少 6 位。留空则使用系统默认临时密码。", "WorkPad@2026");
  if (temporaryPassword === null) return;
  if (temporaryPassword.trim() && temporaryPassword.trim().length < 6) {
    window.alert("临时密码至少需要 6 位。");
    return;
  }
  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, password: temporaryPassword.trim() }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "重置密码失败。");
    member.passwordReady = true;
    member.passwordResetRequired = true;
    window.alert(`已重置「${member.name}」的密码。\n用户名：${result.username || member.username}\n临时密码：${result.temporaryPassword}\n请只通过可信渠道发给本人。`);
    closeAdminModal();
    await hydrateRemoteState();
    render();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
}

async function savePublicReminderFromForm(form) {
  const formData = new FormData(form);
  const person = String(formData.get("person") || "").trim();
  const date = normalizeReminderDateValue(String(formData.get("date") || "").trim());
  const note = String(formData.get("note") || "").trim();
  if (!person || !date || !note) {
    window.alert("公共提醒需要填写提醒人、提醒时间和提醒内容。");
    return;
  }
  appendPublicReminder({
    person,
    date,
    note,
    actor: currentUser().name,
    source: "后台公共提醒",
    recordAt: dateTimeString(new Date()),
    confirmable: formData.get("confirmable") === "on",
  });
  saveSettings();
  await flushRemoteSync();
  form.reset();
  render();
}

async function completeReminderFromAdmin(scope, reminderId, projectId) {
  const completedAt = new Date().toISOString();
  const completedBy = currentUser().name || "后台管理员";
  const completionNote = window.prompt("请填写完成说明或进展备注，例如合同是否已签、电话沟通进展、下一步还要做什么：", "");
  if (completionNote === null) return;
  const cleanCompletionNote = completionNote.trim();
  if (!cleanCompletionNote) {
    window.alert("确认完成前必须填写说明。");
    return;
  }
  let reminder = null;
  let project = null;

  if (scope === "project") {
    project = state.projects.find((item) => item.id === projectId);
    if (!project) return;
    project.reminders = normalizeProjectReminders(project);
    reminder = project.reminders.find((item) => item.id === reminderId);
    if (!reminder) return;
    reminder.status = "completed";
    reminder.pending = false;
    reminder.completedAt = completedAt;
    reminder.completedBy = completedBy;
    reminder.completionNote = cleanCompletionNote;
    project.logs = [
      { time: dateTimeString(new Date()), actor: completedBy, action: "提醒完成确认", detail: `${reminder.person}：${reminder.note}；说明：${cleanCompletionNote}` },
      ...(Array.isArray(project.logs) ? project.logs : []),
    ].slice(0, 100);
    syncProjectReminderFields(project);
    saveProjects();
  } else {
    state.publicReminders = normalizePublicReminders(state.publicReminders);
    reminder = state.publicReminders.find((item) => item.id === reminderId);
    if (!reminder) return;
    reminder.status = "completed";
    reminder.pending = false;
    reminder.completedAt = completedAt;
    reminder.completedBy = completedBy;
    reminder.completionNote = cleanCompletionNote;
  }

  state.pushLogs = (Array.isArray(state.pushLogs) ? state.pushLogs : []).map((log) => {
    const sameToken = reminder.confirmationToken && log.confirmationToken === reminder.confirmationToken;
    const sameReminder = log.reminderId === reminder.id && log.reminderScope === scope;
    if (!sameToken && !sameReminder) return log;
    return {
      ...log,
      completionStatus: "已完成",
      completedAt,
      completedBy,
      completionNote: cleanCompletionNote,
    };
  });

  saveSettings();
  await flushRemoteSync();
  render();
}

async function deletePushLog(logId) {
  const log = (Array.isArray(state.pushLogs) ? state.pushLogs : []).find((item) => item.id === logId);
  if (!log) return;
  const confirmed = window.confirm(`确定删除这条推送记录吗？\n接收人：${log.receiver || "未设置"}\n推送时间：${formatPushLogTime(log.pushedAt)}`);
  if (!confirmed) return;
  state.pushLogs = state.pushLogs.filter((item) => item.id !== logId);
  saveSettings();
  await flushRemoteSync();
  render();
}

async function clearPushLogs() {
  const count = Array.isArray(state.pushLogs) ? state.pushLogs.length : 0;
  if (!count) return;
  const confirmed = window.confirm(`确定清空全部 ${count} 条推送记录吗？这个操作不会删除订单和提醒任务，但推送留痕会被清掉。`);
  if (!confirmed) return;
  state.pushLogs = [];
  saveSettings();
  await flushRemoteSync();
  render();
}

async function deleteDepartment(name) {
  if (!hasPermission("管理人员")) return;
  if (name === "未分配部门") {
    window.alert("“未分配部门”是兜底部门，不能删除。");
    return;
  }
  const memberCount = state.teamMembers.filter((member) => member.department === name).length;
  const confirmed = window.confirm(`确定删除部门「${name}」吗？${memberCount ? "该部门下人员会归到“未分配部门”。" : ""}`);
  if (!confirmed) return;
  state.departments = state.departments.filter((department) => department !== name);
  renameDepartmentAcrossMembers(name, "未分配部门");
  state.departments = normalizeDepartments(state.departments, state.teamMembers);
  saveSettings();
  await flushRemoteSync();
  render();
}

async function deleteRole(key) {
  if (!hasPermission("管理权限")) return;
  const role = roleOptions().find((item) => item.key === key);
  if (!role) return;
  if (role.locked) {
    window.alert("系统角色不能删除，可以编辑名称和说明。");
    return;
  }
  const fallbackRole = roleOptions().find((item) => item.key === "editor") || roleOptions().find((item) => item.key !== key);
  if (!fallbackRole) {
    window.alert("至少需要保留 1 个角色。");
    return;
  }
  const confirmed = window.confirm(`确定删除角色「${role.name}」吗？使用该角色的人员和流程节点会改为「${fallbackRole.name}」。`);
  if (!confirmed) return;
  renameRoleAcrossSettings(role.name, fallbackRole.name);
  state.roles = state.roles.filter((item) => item.key !== key);
  state.permissionRows = state.permissionRows.map((row) => {
    const values = { ...row.values };
    delete values[key];
    return { ...row, values };
  });
  state.permissionRows = normalizePermissionRows(state.permissionRows, state.roles);
  saveSettings();
  await flushRemoteSync();
  render();
}

async function deletePartner(name) {
  if (!hasPermission("管理合作方")) return;
  const projectCount = state.projects.filter((project) => project.partner === name).length;
  const confirmed = window.confirm(`确定删除合作方「${name}」吗？${projectCount ? "相关订单会清空合作方字段，不会删除订单。" : ""}`);
  if (!confirmed) return;
  state.partners = getPartnerProfiles().filter((partner) => partner.name !== name);
  if (projectCount) {
    state.projects = state.projects.map((project) => (project.partner === name ? { ...project, partner: "" } : project));
    saveProjects();
  }
  saveSettings();
  await flushRemoteSync();
  render();
}

function syncWorkflowConfigCache() {
  state.workflowConfig = workflowNodesForBusinessLine(DEFAULT_BUSINESS_LINE_ID);
}

function renameWorkflowNodeAcrossProjects(businessLineId, previousName, nextName) {
  state.projects = state.projects.map((project) => {
    if (businessLineIdForProject(project) !== businessLineId) return project;
    return {
      ...project,
      currentNode: project.currentNode === previousName ? nextName : project.currentNode,
      nodes: Array.isArray(project.nodes)
        ? project.nodes.map((node) => ({ ...node, name: node.name === previousName ? nextName : node.name }))
        : project.nodes,
    };
  });
}

function rebuildProjectsForBusinessLine(businessLineId) {
  state.projects = state.projects.map((project) => {
    if (businessLineIdForProject(project) !== businessLineId) return project;
    const nodeNames = workflowNodeNamesForBusinessLine(businessLineId);
    const currentNode = nodeNames.includes(project.currentNode) ? project.currentNode : nodeNames[0];
    return normalizeProject({
      ...project,
      businessLineId,
      businessLineName: businessLineName(businessLineId),
      currentNode,
      nodes: mergeProjectNodes(project.nodes, {
        startDate: project.startDate,
        owner: project.owner,
        status: project.status,
        currentNode,
        reminderPerson: project.reminderPerson,
        reminderDate: project.reminderDate,
        blockedNode: project.status === "已暂停" ? currentNode : "",
        businessLineId,
      }),
    });
  });
}

async function deleteBusinessLine(lineId) {
  if (!hasPermission("管理流程节点")) return;
  const lines = businessLineOptions();
  const line = lines.find((item) => item.id === lineId);
  if (!line) return;
  if (lines.length <= 1) {
    window.alert("至少需要保留 1 条业务线。");
    return;
  }
  const fallback = lines.find((item) => item.id !== lineId);
  const projectCount = state.projects.filter((project) => businessLineIdForProject(project) === lineId).length;
  const confirmed = window.confirm(`确定删除业务线「${line.name}」吗？${projectCount ? `相关项目会改到「${fallback.name}」。` : ""}`);
  if (!confirmed) return;
  state.businessLines = lines.filter((item) => item.id !== lineId);
  state.projects = state.projects.map((project) => {
    if (businessLineIdForProject(project) !== lineId) return project;
    const currentNode = defaultNodeForStatus(project.status, fallback.id);
    return normalizeProject({
      ...project,
      businessLineId: fallback.id,
      businessLineName: fallback.name,
      currentNode,
      nodes: mergeProjectNodes(project.nodes, {
        startDate: project.startDate,
        owner: project.owner,
        status: project.status,
        currentNode,
        reminderPerson: project.reminderPerson,
        reminderDate: project.reminderDate,
        blockedNode: project.status === "已暂停" ? currentNode : "",
        businessLineId: fallback.id,
      }),
    });
  });
  if (state.selectedWorkflowLineId === lineId) state.selectedWorkflowLineId = fallback.id;
  syncWorkflowConfigCache();
  saveProjects();
  saveSettings();
  await flushRemoteSync();
  render();
}

async function addWorkflowNode() {
  if (!hasPermission("管理流程节点")) return;
  const line = businessLineById(state.selectedWorkflowLineId);
  const names = new Set(line.nodes.map((node) => node.name));
  let nextIndex = line.nodes.length + 1;
  let nextName = `新节点 ${nextIndex}`;
  while (names.has(nextName)) {
    nextIndex += 1;
    nextName = `新节点 ${nextIndex}`;
  }
  line.nodes.push({
    id: recordId("node", `${line.id}-${nextName}-${Date.now()}`),
    name: nextName,
    ownerRole: roleOptions().find((role) => role.key === "editor")?.name || "编辑",
    reminderRole: roleOptions().find((role) => role.key === "manager")?.name || "项目主管",
    cycle: 3,
  });
  syncWorkflowConfigCache();
  saveSettings();
  await flushRemoteSync();
  render();
}

async function deleteWorkflowNode(nodeId) {
  if (!hasPermission("管理流程节点")) return;
  const line = businessLineById(state.selectedWorkflowLineId);
  const node = line.nodes.find((item) => item.id === nodeId);
  if (!node) return;
  if (line.nodes.length <= 1) {
    window.alert("每条业务线至少需要保留 1 个流程节点。");
    return;
  }
  const projectCount = state.projects.filter((project) => businessLineIdForProject(project) === line.id && project.currentNode === node.name).length;
  const confirmed = window.confirm(`确定删除节点「${node.name}」吗？${projectCount ? "相关项目会改到该业务线的第一个节点。" : ""}`);
  if (!confirmed) return;
  line.nodes = line.nodes.filter((item) => item.id !== nodeId);
  syncWorkflowConfigCache();
  rebuildProjectsForBusinessLine(line.id);
  saveProjects();
  saveSettings();
  await flushRemoteSync();
  render();
}

async function moveWorkflowNode(nodeId, direction) {
  if (!hasPermission("管理流程节点")) return;
  const line = businessLineById(state.selectedWorkflowLineId);
  const index = line.nodes.findIndex((node) => node.id === nodeId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= line.nodes.length) return;
  const [node] = line.nodes.splice(index, 1);
  line.nodes.splice(targetIndex, 0, node);
  syncWorkflowConfigCache();
  saveSettings();
  await flushRemoteSync();
  render();
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
  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void loginWithPassword(event.target);
  });

  elements.wecomLoginButton.addEventListener("click", () => {
    if (state.wecomScanLoginAvailable) {
      setLoginMessage("企业微信扫码登录服务端开关已打开，但当前版本还需要补企业微信回调换取身份；先使用用户名密码登录。", true);
      return;
    }
    setLoginMessage("企业微信扫码登录需要先在企业微信后台配置网页登录授权/扫码登录回调域名；未配置前先使用用户名密码登录。");
  });

  elements.logoutButton.addEventListener("click", () => {
    void logout();
  });

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
    const aiRiskButton = event.target.closest("[data-ai-risk-action]");
    if (aiRiskButton) {
      void generateAiRiskAssessment();
      return;
    }
    const button = event.target.closest("[data-admin-action]");
      const reminderTab = event.target.closest("[data-reminder-tab]");
      if (reminderTab) {
        state.reminderFilters.tab = reminderTab.dataset.reminderTab || "all";
        render();
        return;
      }
      if (!button) return;
      if (button.dataset.adminAction === "add-user") openAdminModal("user", null);
      if (button.dataset.adminAction === "edit-user") openAdminModal("user", { id: button.dataset.memberId });
      if (button.dataset.adminAction === "delete-user") void deleteMember(button.dataset.memberId);
      if (button.dataset.adminAction === "reset-password") void resetMemberPassword(button.dataset.memberId);
      if (button.dataset.adminAction === "add-department") openAdminModal("department", "");
      if (button.dataset.adminAction === "edit-department") openAdminModal("department", button.dataset.departmentName);
      if (button.dataset.adminAction === "delete-department") void deleteDepartment(button.dataset.departmentName);
      if (button.dataset.adminAction === "add-role") openAdminModal("role", "");
      if (button.dataset.adminAction === "edit-role") openAdminModal("role", button.dataset.roleKey);
      if (button.dataset.adminAction === "delete-role") void deleteRole(button.dataset.roleKey);
      if (button.dataset.adminAction === "add-partner") openAdminModal("partner", "");
      if (button.dataset.adminAction === "edit-partner") openAdminModal("partner", button.dataset.partnerName);
      if (button.dataset.adminAction === "delete-partner") void deletePartner(button.dataset.partnerName);
      if (button.dataset.adminAction === "add-business-line") openAdminModal("businessLine", "");
      if (button.dataset.adminAction === "edit-business-line") openAdminModal("businessLine", button.dataset.businessLineId);
      if (button.dataset.adminAction === "delete-business-line") void deleteBusinessLine(button.dataset.businessLineId);
      if (button.dataset.adminAction === "add-workflow-node") void addWorkflowNode();
      if (button.dataset.adminAction === "delete-workflow-node") void deleteWorkflowNode(button.dataset.workflowNodeId);
      if (button.dataset.adminAction === "move-workflow-node-up") void moveWorkflowNode(button.dataset.workflowNodeId, "up");
      if (button.dataset.adminAction === "move-workflow-node-down") void moveWorkflowNode(button.dataset.workflowNodeId, "down");
      if (button.dataset.adminAction === "complete-reminder") void completeReminderFromAdmin(button.dataset.reminderScope, button.dataset.reminderId, button.dataset.projectId);
      if (button.dataset.adminAction === "delete-push-log") void deletePushLog(button.dataset.pushLogId);
      if (button.dataset.adminAction === "clear-push-logs") void clearPushLogs();
    });

  elements.adminContent.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.reminderFilter) {
      state.reminderFilters[target.dataset.reminderFilter] = target.value;
      render();
      return;
    }
    if (target.dataset.confirmablePushEnabled !== undefined) {
      state.confirmablePushEnabled = target.checked;
      saveSettings();
      void flushRemoteSync();
      render();
      return;
    }
    if (target.dataset.permissionIndex) {
      if (!hasPermission("管理权限")) return;
      const row = state.permissionRows[Number(target.dataset.permissionIndex)];
      row.values[target.dataset.permissionRole] = target.checked ? "是" : "否";
      saveSettings();
      return;
    }
    if (target.dataset.workflowLineSelect !== undefined) {
      if (!hasPermission("管理流程节点")) return;
      state.selectedWorkflowLineId = target.value;
      saveSettings();
      render();
      return;
    }
    if (target.dataset.workflowLineField) {
      if (!hasPermission("管理流程节点")) return;
      const line = businessLineById(state.selectedWorkflowLineId);
      line[target.dataset.workflowLineField] = String(target.value || "").trim();
      saveSettings();
      return;
    }
    if (target.dataset.workflowNodeId) {
      if (!hasPermission("管理流程节点")) return;
      const line = businessLineById(state.selectedWorkflowLineId);
      const item = line.nodes.find((node) => node.id === target.dataset.workflowNodeId);
      if (!item) return;
      if (target.dataset.workflowField === "name") {
        const nextName = String(target.value || "").trim();
        if (!nextName) {
          target.value = item.name;
          return;
        }
        const duplicate = line.nodes.some((node) => node.id !== item.id && node.name === nextName);
        if (duplicate) {
          window.alert("这条业务线里已经有同名节点。");
          target.value = item.name;
          return;
        }
        if (item.name !== nextName) renameWorkflowNodeAcrossProjects(line.id, item.name, nextName);
        item.name = nextName;
        saveProjects();
      } else {
        item[target.dataset.workflowField] = target.dataset.workflowField === "cycle" ? Math.max(0, Number(target.value) || 0) : target.value;
      }
      syncWorkflowConfigCache();
      saveSettings();
      void flushRemoteSync();
    }
  });

  elements.adminContent.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.dataset.reminderFilter) return;
    state.reminderFilters[target.dataset.reminderFilter] = target.value;
    clearTimeout(state.reminderFilterTimer);
    state.reminderFilterTimer = setTimeout(render, 250);
  });

  elements.adminContent.addEventListener("submit", (event) => {
    if (event.target.id === "aiConfigForm") {
      event.preventDefault();
      void saveAiSettingsFromForm(event.target);
      return;
    }
    if (event.target.id === "aiChatForm") {
      event.preventDefault();
      const formData = new FormData(event.target);
      const message = String(formData.get("message") || "").trim();
      event.target.reset();
      void sendAiChatMessage(message);
      return;
    }
    if (event.target.id === "aiVisionForm") {
      event.preventDefault();
      void recognizeQualityImage(event.target);
      return;
    }
    if (event.target.id === "publicReminderForm") {
      event.preventDefault();
      void savePublicReminderFromForm(event.target);
    }
  });

  elements.drawerContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drawer-action]");
    if (button) void handleDrawerAction(button.dataset.drawerAction);
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
    const unbindButton = event.target.closest("[data-admin-unbind-wecom]");
    if (unbindButton) {
      void unbindMemberWecom(unbindButton.dataset.adminUnbindWecom);
      return;
    }
    const resetPasswordButton = event.target.closest("[data-admin-reset-password]");
    if (resetPasswordButton) {
      void resetMemberPassword(resetPasswordButton.dataset.adminResetPassword);
      return;
    }
    if (event.target.closest("[data-admin-close]")) closeAdminModal();
  });
  elements.adminModalContent.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target.id === "adminUserForm") {
      if (!hasPermission("管理人员")) return;
      const formData = new FormData(event.target);
      const existing = state.teamMembers.find((item) => item.id === state.adminEditingId);
      const nextName = String(formData.get("name") || "").trim();
      const nextUsername = String(formData.get("username") || "").trim().toLowerCase();
        const nextRole = String(formData.get("role") || "").trim();
        const nextDepartment = String(formData.get("department") || "").trim();
        const nextWecomUserId = String(formData.get("wecomUserId") || "").trim();
        if (!nextName || !nextUsername || !nextRole || !nextDepartment) return;
        if (!/^[a-zA-Z0-9._-]{2,32}$/.test(nextUsername)) {
          window.alert("用户名只能使用字母、数字、点、下划线或短横线，长度 2-32 位。");
          return;
        }
        const duplicateUsername = state.teamMembers.some((member) => member.id !== existing?.id && String(member.username || "").toLowerCase() === nextUsername);
        if (duplicateUsername) {
          window.alert("这个登录用户名已经存在。");
          return;
        }
        if (existing) {
          if (existing.name !== nextName) renameMemberAcrossProjects(existing.name, nextName);
          existing.name = nextName;
        existing.username = nextUsername;
        existing.role = nextRole;
        existing.department = nextDepartment;
        existing.wecomUserId = nextWecomUserId;
        } else {
          state.teamMembers.push({ id: uid(), name: nextName, username: nextUsername, role: nextRole, department: nextDepartment, wecomUserId: nextWecomUserId, passwordReady: false });
        }
        state.departments = normalizeDepartments(state.departments, state.teamMembers);
        saveSettings();
        await flushRemoteSync();
        closeAdminModal();
        render();
      }
      if (event.target.id === "adminDepartmentForm") {
        if (!hasPermission("管理人员")) return;
        const formData = new FormData(event.target);
        const previousName = String(state.adminEditingId || "");
        const nextName = String(formData.get("name") || "").trim();
        if (!nextName) return;
        const duplicate = state.departments.some((department) => department === nextName && department !== previousName);
        if (duplicate) {
          window.alert("这个部门已经存在。");
          return;
        }
        if (previousName) {
          state.departments = state.departments.map((department) => (department === previousName ? nextName : department));
          renameDepartmentAcrossMembers(previousName, nextName);
        } else {
          state.departments.push(nextName);
        }
        state.departments = normalizeDepartments(state.departments, state.teamMembers);
        saveSettings();
        await flushRemoteSync();
        closeAdminModal();
        render();
      }
      if (event.target.id === "adminRoleForm") {
        if (!hasPermission("管理权限")) return;
        const formData = new FormData(event.target);
        const nextName = String(formData.get("name") || "").trim();
        const nextDescription = String(formData.get("description") || "").trim();
        if (!nextName) return;
        const existing = state.roles.find((role) => role.key === state.adminEditingId);
        const duplicate = state.roles.some((role) => role.name === nextName && role.key !== existing?.key);
        if (duplicate) {
          window.alert("这个角色已经存在。");
          return;
        }
        if (existing) {
          if (existing.name !== nextName) renameRoleAcrossSettings(existing.name, nextName);
          existing.name = nextName;
          existing.description = nextDescription || existing.description || "自定义角色";
        } else {
          state.roles.push({ key: recordId("role", `${nextName}-${Date.now()}`), name: nextName, description: nextDescription || "自定义角色", locked: false });
        }
        state.roles = normalizeRoles(state.roles);
        state.permissionRows = normalizePermissionRows(state.permissionRows, state.roles);
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
        const existingPartner = previousName ? findPartnerProfile(previousName) : null;
        const duplicate = getPartnerProfiles().some((partner) => partner.name === nextName && partner.name !== previousName);
        if (!nextName) return;
        if (duplicate) {
          window.alert("这个合作方已经存在。");
          return;
        }
        if (previousName && previousName !== nextName) renamePartnerAcrossProjects(previousName, nextName);
        const nextPartner = {
          id: existingPartner?.id || recordId("partner", `${nextName}-${Date.now()}`),
          name: nextName,
          contact: String(formData.get("contact") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          address: String(formData.get("address") || "").trim(),
          note: String(formData.get("note") || "").trim() || "项目录入时通过选择进入",
        };
        const currentPartners = getPartnerProfiles();
        if (previousName) {
          state.partners = currentPartners.map((partner) => (partner.name === previousName ? nextPartner : partner));
        } else {
          state.partners = [...currentPartners, nextPartner];
        }
        state.partners = normalizePartners(state.partners, state.projects);
        saveSettings();
        await flushRemoteSync();
        closeAdminModal();
      render();
    }
      if (event.target.id === "adminBusinessLineForm") {
        if (!hasPermission("管理流程节点")) return;
        const formData = new FormData(event.target);
        const nextName = String(formData.get("name") || "").trim();
        const nextWorkflowName = String(formData.get("workflowName") || "").trim();
        const nextDescription = String(formData.get("description") || "").trim();
        if (!nextName || !nextWorkflowName) return;
        const existing = businessLineOptions().find((line) => line.id === state.adminEditingId);
        const duplicate = businessLineOptions().some((line) => line.name === nextName && line.id !== existing?.id);
        if (duplicate) {
          window.alert("这个业务线已经存在。");
          return;
        }
        if (existing) {
          existing.name = nextName;
          existing.workflowName = nextWorkflowName;
          existing.description = nextDescription || "可在后台维护该业务线对应的流程节点。";
        } else {
          const newLine = {
            id: recordId("line", `${nextName}-${Date.now()}`),
            name: nextName,
            workflowName: nextWorkflowName,
            description: nextDescription || "可在后台维护该业务线对应的流程节点。",
            nodes: [
              { id: recordId("node", `${nextName}-节点-1-${Date.now()}`), name: "开始处理", ownerRole: "编辑", reminderRole: "项目主管", cycle: 3 },
              { id: recordId("node", `${nextName}-节点-2-${Date.now()}`), name: "交付确认", ownerRole: "协同支持", reminderRole: "项目主管", cycle: 2 },
            ],
          };
          state.businessLines.push(newLine);
          state.selectedWorkflowLineId = newLine.id;
        }
        state.businessLines = normalizeBusinessLines(state.businessLines, state.workflowConfig);
        syncWorkflowConfigCache();
        saveSettings();
        await flushRemoteSync();
        closeAdminModal();
        render();
      }
  });
  elements.formStatus.addEventListener("change", (event) => {
    elements.formCurrentNode.value = defaultNodeForStatus(event.target.value, elements.formBusinessLine.value || DEFAULT_BUSINESS_LINE_ID);
  });
  elements.formBusinessLine.addEventListener("change", (event) => {
    renderCurrentNodeOptions(event.target.value, defaultNodeForStatus(elements.formStatus.value, event.target.value));
  });
}

async function boot() {
  loadSettings();
  state.projects = loadProjects();
  attachEvents();
  const loggedIn = await requestAuthSession();
  if (!loggedIn) {
    setAuthenticatedView(false);
    setLoginMessage("请输入用户名和密码登录。初始管理员可使用 admin 账号。");
    elements.loginUsername.focus();
    return;
  }
  syncAuthenticatedUser();
  saveProjects();
  saveSettings();
  render();
  await hydrateRemoteState();
  await loadAiSettings();
}

void boot();
