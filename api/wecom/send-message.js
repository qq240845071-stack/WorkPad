const { readStoredState } = require("../_lib/store");
const { getConfig, hasSendConfig } = require("../_lib/wecom-crypto");
const { sendAppTextMessage, findMember } = require("../_lib/wecom-service");

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
    `提醒日期：${project.reminderDate}`,
    note ? `说明：${note}` : `下一步：${project.nextAction}`,
  ].join("\n");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "当前接口只支持 POST。" });
  }

  if (!hasSendConfig()) {
    return sendJson(res, 500, {
      ok: false,
      message: "企业微信主动发消息配置不完整。",
      required: ["WECOM_CORP_ID", "WECOM_APP_SECRET", "WECOM_AGENT_ID"],
    });
  }

  try {
    const body = await readJsonBody(req);
    const snapshot = await readStoredState();
    const state = snapshot.state;

    let toUser = String(body.toUser || "").trim();
    let content = String(body.content || "").trim();

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
    }

    if (body.memberKeyword && !toUser) {
      const member = findMember(state, body.memberKeyword);
      if (!member || !member.wecomUserId) {
        return sendJson(res, 400, { ok: false, message: "没有找到可发送的企微成员账号。" });
      }
      toUser = member.wecomUserId;
    }

    if (!toUser || !content) {
      return sendJson(res, 400, { ok: false, message: "需要提供 toUser + content，或者直接传 projectId。" });
    }

    const result = await sendAppTextMessage({ toUser, content });
    return sendJson(res, 200, {
      ok: true,
      toUser,
      agentId: getConfig().agentId,
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
