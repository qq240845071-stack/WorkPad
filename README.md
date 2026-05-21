# 订单大看板原型

这是一个零依赖的 H5 原型，用来验证出版项目看板的结构、交互和信息密度。

## 打开方式

### 方式 1：直接打开

直接打开根目录下的 `index.html` 即可。

### 方式 2：本地服务

在项目根目录执行：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173
```

### 方式 3：带后台接口的全栈模式

先安装依赖：

```bash
npm install
```

然后启动：

```bash
vercel dev --listen 4173
```

这时前台页面会优先走 `/api/state`，不再只依赖浏览器本地数据。

## 当前原型包含

1. 首页大看板
2. 风险项目清单
3. 按负责人、状态、风险、更新时间、提醒状态筛选
4. 按项目显示 / 按人员显示双视图
5. 管理后台总览
6. 人员录入、组织部门、角色管理、权限分配、合作方管理、流程节点配置
7. 按角色生效的轻权限控制，角色可在后台维护，管理员、主管、编辑、协同支持看到的入口和操作会区分
8. 项目详情抽屉
9. 新建 / 编辑项目弹窗
10. 暂停项目、标记完成
11. 演示数据重置
12. 内置演示数据自动补回，不会因为本地数据缺项而整批消失
13. `/api/auth/login`、`/api/auth/me`、`/api/auth/logout`、`/api/auth/reset-password` 登录与密码重置接口
14. `/api/state` 后端状态接口，前端可通过接口读写项目、人员、部门、角色、权限、合作方和流程配置，已要求登录后访问
15. `/api/health` 健康检查接口
16. `/api/wecom/callback`、`/api/wecom/send-message`、`/api/wecom/health` 企业微信接入骨架，提醒指令支持精确到分钟，并支持语音转文字后的自然语言提醒解析
17. `/api/ai/chat`、`/api/ai/risk`、`/api/ai/vision` 后台 AI 管家接口，分别支持对话、风险评估和图片识别
18. `/api/ai/config` AI 配置接口，后台可按任务配置 Base URL、模型名和供应商说明

## 登录与权限

1. 人员登录用户名统一使用本人姓名全拼小写，例如 `zhangying`。
2. 新建人员和重置密码后的默认密码统一为 `111111`。
3. 会话签名优先读取 `WORKPAD_AUTH_SECRET`；建议线上单独配置一个长随机密钥。
4. 人员管理里由系统按姓名自动生成登录用户名，并通过“重置密码”恢复默认密码。
5. 企业微信扫码登录需要额外配置企业微信网页登录授权/扫码登录回调域名；未配置前使用用户名密码登录。

## 当前数据模式

1. 登录功能依赖 API，本地调试建议使用 `vercel dev`，不要直接双击打开 `index.html`。
2. 用 `vercel dev` 启动时，默认走本地文件存储。
3. 部署到 Vercel 后，如果配置了 `BLOB_READ_WRITE_TOKEN`，会切到持久化的 Blob 存储。
4. 如果线上没配 Blob，接口仍然能跑，但会退化成临时云端缓存，不适合正式生产。

## 企业微信接口

1. 回调入口：`/api/wecom/callback`
2. 主动发消息：`/api/wecom/send-message`
3. 配置检查：`/api/wecom/health`
4. 联调说明：`docs/企业微信联调说明.md`
5. 自助绑定入口：在企业微信 `WorkPad` 应用聊天框里发送 `绑定 姓名`
6. 后台人员录入显示企微绑定状态：默认是 `待绑定`；`已绑定` 表示人员已通过企业微信绑定，或后台已明确填写企业微信 `UserId`，不是微信昵称。
7. 固定 IP 代理：`services/wecom-fixed-ip-proxy` 可部署到阿里云 ECS / EIP，用来稳定处理企业微信可信 IP 校验。
8. 到点提醒派发：`/api/cron/dispatch-reminders` 支持由 GitHub Actions 或外部定时器调用，扫描待提醒项目并通过企业微信主动推送。

## 大模型接口

后台“AI 管家”不会把密钥写进前端或代码仓库，只读取服务端环境变量。后台页面只配置非敏感项，例如模型名和 Base URL。

1. `AI_API_KEY`：云雾 API Key
2. `AI_BASE_URL`：默认 `https://yunwu.ai/v1`
3. `AI_MODEL`：默认 `deepseek-v4-flash`
4. `AI_PROVIDER_NAME`：默认 `云雾 DeepSeek V4 Flash`

任务级模型可以在后台页面配置：

1. 对话：默认 `deepseek-v4-flash`
2. 风险评估：默认 `deepseek-v4-flash`
3. 图片识别：默认 `qwen3-vl-flash`
4. 自然语言指令：默认 `deepseek-v4-pro`
5. 语音转文字：默认 `whisper-1`

如果后续需要给某个任务单独配置密钥，可使用服务端环境变量：

1. `AI_CHAT_API_KEY`
2. `AI_RISK_API_KEY`
3. `AI_VISION_API_KEY`
4. `AI_COMMAND_API_KEY`
5. `AI_TRANSCRIPTION_API_KEY`

## 文件说明

1. `index.html`：页面结构
2. `styles.css`：视觉样式
3. `app.js`：前端状态、看板交互和后台同步逻辑
4. `docs/功能清单与页面结构.md`：产品定义文档
5. `api/`：后端接口和存储适配
6. `docs/企业微信联调说明.md`：企业微信接入说明
