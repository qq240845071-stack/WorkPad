# WorkPad 企业微信固定 IP 代理

这个小服务用来解决 Vercel Serverless 出口 IP 变化导致企业微信 `60020 not allow to access from your ip` 的问题。

## 工作方式

1. WorkPad 主站继续部署在 Vercel。
2. 这个代理部署到有固定公网 IP 的服务器，例如阿里云 ECS + 固定公网 IP / EIP。
3. 企业微信后台只需要放行这个固定公网 IP。
4. WorkPad 调用企业微信的获取 `access_token`、主动发消息、下载语音素材接口时，统一转发到这个代理。

## 环境变量

```bash
HOST=0.0.0.0
PORT=3001
WORKPAD_PROXY_SECRET=一串足够长的随机密钥
WECOM_CORP_ID=企业微信 CorpID
WECOM_APP_SECRET=自建应用 Secret
WECOM_AGENT_ID=自建应用 AgentId
```

## 本地启动

```bash
npm start
```

## 健康检查

```bash
curl http://127.0.0.1:3001/health
```

返回里的 `egressIp` 就是要填到企业微信后台“企业可信 IP / IP 白名单”的公网 IP。

## WorkPad 侧配置

代理部署好以后，在 Vercel 的 WorkPad 项目里新增：

```bash
WECOM_PROXY_BASE_URL=https://你的代理域名
WECOM_PROXY_SECRET=和 WORKPAD_PROXY_SECRET 一致
```

重新部署 WorkPad 后，`/api/wecom/health` 会显示 `fixedIpProxyConfigured: true`。
