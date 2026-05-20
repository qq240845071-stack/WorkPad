# 阿里云固定 IP 部署步骤

下面以一台 Linux ECS 为例。目标是让企业微信接口请求从固定公网 IP 发出，解决 Vercel 出口 IP 经常变化的问题。

## 1. 准备资源

1. 一台阿里云 ECS，绑定固定公网 IP 或 EIP。
2. 一个代理域名，例如 `wecom-proxy.tbxprint.com`。
3. DNS 增加一条 `A` 记录：`wecom-proxy` 指向 ECS 固定公网 IP。
4. ECS 安全组放行 `80` 和 `443` 端口。
5. 企业微信后台先不要再继续追 Vercel IP，后面只填 ECS 的固定公网 IP。

## 2. 安装运行环境

Ubuntu / Debian 可参考：

```bash
apt update
apt install -y nodejs npm git caddy
```

如果系统自带 Node 版本过低，建议安装 Node.js 20 LTS。

## 3. 拉取代码

```bash
mkdir -p /opt/workpad
git clone https://github.com/qq240845071-stack/WorkPad.git /opt/workpad
cd /opt/workpad/services/wecom-fixed-ip-proxy
```

## 4. 写环境变量

```bash
cat >/etc/workpad-wecom-proxy.env <<'EOF'
HOST=127.0.0.1
PORT=3001
WORKPAD_PROXY_SECRET=换成一串足够长的随机密钥
WECOM_CORP_ID=企业微信 CorpID
WECOM_APP_SECRET=WorkPad 自建应用 Secret
WECOM_AGENT_ID=1000009
TENCENT_ASR_SECRET_ID=后续填腾讯云 ASR SecretId
TENCENT_ASR_SECRET_KEY=后续填腾讯云 ASR SecretKey
TENCENT_ASR_REGION=ap-shanghai
TENCENT_ASR_ENGINE=16k_zh
EOF
```

这里的 `WORKPAD_PROXY_SECRET` 后面要同步填到 Vercel 的 `WECOM_PROXY_SECRET`。

## 5. 配置 systemd 保活

```bash
cat >/etc/systemd/system/workpad-wecom-proxy.service <<'EOF'
[Unit]
Description=WorkPad WeCom Fixed IP Proxy
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/workpad/services/wecom-fixed-ip-proxy
EnvironmentFile=/etc/workpad-wecom-proxy.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now workpad-wecom-proxy
systemctl status workpad-wecom-proxy
```

## 6. 配置 HTTPS

把 `/etc/caddy/Caddyfile` 改成：

```caddyfile
wecom-proxy.tbxprint.com {
  reverse_proxy 127.0.0.1:3001
}
```

然后执行：

```bash
systemctl reload caddy
```

Caddy 会自动申请和续期 HTTPS 证书。

## 7. 测试代理

```bash
curl https://wecom-proxy.tbxprint.com/health
```

正常会看到：

```json
{
  "ok": true,
  "ready": true,
  "asrReady": true,
  "egressIp": "你的 ECS 固定公网 IP"
}
```

如果 `egressIp` 为空，但 `ready` 是 `true`，也可以直接用 ECS 控制台里看到的固定公网 IP。

## 8. 企业微信后台

在 WorkPad 自建应用的“企业可信 IP / IP 白名单”里，只填写 ECS 固定公网 IP。

不要再填写 Vercel 报错里变化的 `from ip`。

## 9. Vercel 配置

在 WorkPad 项目的 Vercel 环境变量里增加：

```bash
WECOM_PROXY_BASE_URL=https://wecom-proxy.tbxprint.com
WECOM_PROXY_SECRET=和 WORKPAD_PROXY_SECRET 一致
```

如果 ASR 和企业微信共用这个代理，不需要额外设置 `TENCENT_ASR_PROXY_BASE_URL`。WorkPad 会自动复用 `WECOM_PROXY_BASE_URL` 和 `WECOM_PROXY_SECRET`。

然后重新部署 WorkPad。部署后打开：

```text
https://workpad.tbxprint.com/api/wecom/health
```

确认：

```json
{
  "fixedIpProxyConfigured": true,
  "sendConfigured": true
}
```

到这里以后，再发企业微信语音命令，就不会再因为 Vercel 出口 IP 变化被企业微信拦截。
