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
  ["删除订单", "可以删除订单及订单内提醒任务", "是", "否", "否", "否"],
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

const DEFAULT_PROCESS_CARD_FIELDS = [
  { id: "field-format", label: "成品规格", type: "text", options: "", required: true, placeholder: "例如 170x240mm / 16开" },
  { id: "field-binding", label: "装订方式", type: "select", options: "胶装\n锁线胶装\n精装\n骑马钉", required: true, placeholder: "" },
  { id: "field-paper", label: "纸张材料", type: "textarea", options: "", required: false, placeholder: "正文纸、封面纸、克重、特殊材料" },
];

const DEFAULT_LINE_RISK_CONFIG = {
  enabled: true,
  reviewer: "",
  focus: "排版、内容、进度、合同、质检等环节的潜在风险。",
  qualityStandard: "结合工艺卡、节点进度、订单备注和质检标准判断是否需要人工复核。",
};

const DEFAULT_BUSINESS_LINES = [
  {
    id: DEFAULT_BUSINESS_LINE_ID,
    name: "出版类业务线",
    workflowName: "出版标准流程",
    description: "出稿、排版校稿、样书、成品、合同、送货和尾印单。",
    processCardFields: DEFAULT_PROCESS_CARD_FIELDS,
    riskConfig: {
      ...DEFAULT_LINE_RISK_CONFIG,
      focus: "重点关注作者回稿、排版校稿、样书工艺、合同回签、送货回执和尾印单闭环。",
      qualityStandard: "质检时同时核对工艺卡、样书确认记录、合同状态和成品质量要求。",
    },
    nodes: WORKFLOW_CONFIG,
  },
  {
    id: "line-design",
    name: "设计类业务线",
    workflowName: "设计交付流程",
    description: "适合封面、版式、物料和视觉设计项目。",
    processCardFields: [
      { id: "field-design-size", label: "设计尺寸", type: "text", options: "", required: true, placeholder: "例如封面展开尺寸、内文版心" },
      { id: "field-deliverables", label: "交付文件", type: "select", options: "源文件\nPDF\n图片\n印刷文件", required: true, placeholder: "" },
      { id: "field-style", label: "风格要求", type: "textarea", options: "", required: false, placeholder: "风格关键词、参考案例、禁用元素" },
    ],
    riskConfig: {
      ...DEFAULT_LINE_RISK_CONFIG,
      focus: "重点关注需求是否明确、尺寸是否正确、素材授权、文件版本和交付格式。",
      qualityStandard: "质检时核对尺寸、分辨率、出血、字体版权、图片授权和最终交付文件完整性。",
    },
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
    processCardFields: [
      { id: "field-product-size", label: "成品规格", type: "text", options: "", required: true, placeholder: "成品尺寸、页数、数量" },
      { id: "field-production-binding", label: "装订方式", type: "select", options: "胶装\n锁线胶装\n骑马钉\n精装\n裸脊", required: true, placeholder: "" },
      { id: "field-qc-focus", label: "质检重点", type: "textarea", options: "", required: true, placeholder: "白边、色差、缺胶、裁切、包装等" },
    ],
    riskConfig: {
      ...DEFAULT_LINE_RISK_CONFIG,
      focus: "重点关注材料准备、印前检查、生产周期、装订质量、质检返工和发货交接。",
      qualityStandard: "质检时核对尺寸、白边、比例、色差、胶装缺胶、包装数量和送货清单。",
    },
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function dateString(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateTimeString(value) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateString(date)} ${hours}:${minutes}`;
}

function workflowNodesForBusinessLine(businessLineId = DEFAULT_BUSINESS_LINE_ID) {
  const line = DEFAULT_BUSINESS_LINES.find((item) => item.id === businessLineId) || DEFAULT_BUSINESS_LINES[0];
  return line.nodes;
}

function businessLineName(businessLineId = DEFAULT_BUSINESS_LINE_ID) {
  const line = DEFAULT_BUSINESS_LINES.find((item) => item.id === businessLineId) || DEFAULT_BUSINESS_LINES[0];
  return line.name;
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
    id: `demo-${code}`,
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
    processCardValues: {},
    aiRiskReport: "",
    aiRiskAssessedAt: "",
    aiRiskAssessedBy: "",
    aiRiskReviewer: "",
    reminderPerson: "",
    reminderDate: "",
    reminders: [],
    nodes: buildNodes(startDate, owner, status, currentNode, reminderPerson, reminderDate, blockedNode, DEFAULT_BUSINESS_LINE_ID),
    followUps: [
      { time: dateTimeString(addDays(updatedAt, -3)), user: owner, progress: summary, nextAction },
      { time: dateTimeString(updatedAt), user: owner, progress: riskNote, nextAction },
    ],
    logs: [
      { time: dateTimeString(addDays(startDate, -2)), actor: owner, action: "创建项目", detail: `建立项目 ${code} 并录入基础信息。` },
      { time: dateTimeString(startDate), actor: owner, action: "更新状态", detail: `项目进入「${status}」阶段。` },
      { time: dateTimeString(updatedAt), actor: owner, action: "补充跟进", detail: nextAction },
    ],
  };
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

function createDefaultState() {
  return {
    version: 2,
    projects: PROJECT_BLUEPRINTS.map(createSeedProject),
    teamMembers: clone(TEAM_MEMBERS),
    departments: clone(DEFAULT_DEPARTMENTS),
    roles: clone(DEFAULT_ROLES),
    permissionRows: defaultPermissionRows(DEFAULT_ROLES),
    partners: clone(DEFAULT_PARTNERS),
    workflowConfig: clone(WORKFLOW_CONFIG),
    businessLines: clone(DEFAULT_BUSINESS_LINES),
    selectedWorkflowLineId: DEFAULT_BUSINESS_LINE_ID,
    confirmablePushEnabled: true,
    currentUserId: TEAM_MEMBERS[0].id,
    wecomInbox: [],
    publicReminders: [],
    pushLogs: [],
  };
}

module.exports = {
  STATUS_ORDER,
  NODE_ORDER,
  TEAM_MEMBERS,
  DEFAULT_DEPARTMENTS,
  DEFAULT_ROLES,
  WORKFLOW_CONFIG,
  DEFAULT_BUSINESS_LINES,
  DEFAULT_BUSINESS_LINE_ID,
  DEFAULT_PARTNERS,
  ROLE_PERMISSION_ROWS,
  PROJECT_BLUEPRINTS,
  createDefaultState,
};
