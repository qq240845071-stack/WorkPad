const { readStoredState, writeStoredState } = require("../_lib/store");
const { getConfig, hasSendConfig } = require("../_lib/wecom-crypto");
const { sendAppTextMessage, findMember, hasWecomProxyConfig } = require("../_lib/wecom-service");
const { appendPushLog, memberNameByUserId } = require("../_lib/push-log");
const { requireAuth } = require("../_lib/auth");

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function buildProjectReminder(project, note) {
  return [
    "【WorkPad 提醒】",
    `项目：${project.title}`,
    `编号：${project.code}`,
    `状态：${project.status} / ${project.currentNode}`,
    `提醒时间：${project.reminderDate}`,
    note ? `说明：${note}` : `下一步：${project.nextAction}`,
  ].join("\n");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!hasSendConfig() && !hasWecomProxyConfig()) {
    return sendJson(res, 500, {
      ok: false,
      message: "企业微信主动发消息配置不完整。",
      required: [
        "直连模式：WECOM_CORP_ID、WECOM_APP_SECRET、WECOM_AGENT_ID",
        "固定 IP 代理模式：WECOM_PROXY_BASE_URL、WECOM_PROXY_SECRET",
      ],
    });
  }

  try {
    const body = await readJsonBody(req);
    const snapshot = await readStoredState();
    const state = snapshot.state;

    let toUser = String(body.toUser || "").trim();
    let content = String(body.content || "").trim();
    let receiver = memberNameByUserId(state, toUser);
    let projectForLog = null;
    const actor = String(body.actor || auth.member.name || "WorkPad 后台").trim();
    const source = String(body.source || (body.projectId ? "项目提醒推送" : "手动推送")).trim();

    if (body.projectId) {
      const project = state.projects.find((item) => item.id === body.projectId);
      if (!project) {
        return sendJson(res, 404, { ok: false, message: "没有找到对应项目。" });
      }
      const member = findMember(state, project.reminderPerson);
      if (!member || !member.wecomUserId) {
        return sendJson(res, 400, { ok: false, message: "项目提醒人还没有配置企微账号 UserId。" });
      }
      toUser = member.wecomUserId;
      content = content || buildProjectReminder(project, body.note);
      receiver = member.name;
      projectForLog = project;
    }

    if (body.memberKeyword && !toUser) {
      const member = findMember(state, body.memberKeyword);
      if (!member || !member.wecomUserId) {
        return sendJson(res, 400, { ok: false, message: "没有找到可发送的企微成员账号。" });
      }
      toUser = member.wecomUserId;
      receiver = member.name;
    }

    if (!toUser || !content) {
      return sendJson(res, 400, { ok: false, message: "需要提供 toUser + content，或者直接传 projectId。" });
    }

    let result;
    try {
      result = await sendAppTextMessage({ toUser, content });
    } catch (error) {
      appendPushLog(state, {
        content,
        actor,
        receiver: receiver || memberNameByUserId(state, toUser) || toUser,
        receiverUserId: toUser,
        success: false,
        source,
        error: error instanceof Error ? error.message : String(error),
        projectCode: projectForLog?.code,
        projectTitle: projectForLog?.title,
      });
      await writeStoredState(state);
      throw error;
    }
    appendPushLog(state, {
      content,
      actor,
      receiver: receiver || memberNameByUserId(state, toUser) || toUser,
      receiverUserId: toUser,
      success: true,
      source,
      projectCode: projectForLog?.code,
      projectTitle: projectForLog?.title,
    });
    await writeStoredState(state);
    return sendJson(res, 200, {
      ok: true,
      toUser,
      agentId: getConfig().agentId || "fixed-ip-proxy",
      fixedIpProxy: hasWecomProxyConfig(),
      result,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      message: "企业微信发消息失败。",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
