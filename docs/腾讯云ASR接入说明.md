# 腾讯云 ASR 接入说明

WorkPad 企业微信语音命令的链路是：

企业微信语音消息 -> 下载语音素材 -> 腾讯云 ASR 转文字 -> 大模型解析命令 -> 写入提醒或订单记录

## 需要在腾讯云处理

1. 开通腾讯云语音识别 ASR。
2. 在腾讯云访问管理 CAM 中创建一个用于 WorkPad 的访问密钥。
3. 建议只授予语音识别相关权限，不要使用主账号长期密钥。

## 推荐部署方式：走腾讯云北京服务器代理

当前 WorkPad 已经复用企业微信固定 IP 代理作为 ASR 代理。也就是说：

WorkPad 主站 -> 腾讯云北京服务器代理 -> 腾讯云 ASR

这样 ASR 调用不会从 Vercel 海外机房直接发出。

## 需要在腾讯云北京服务器配置的环境变量

必填：

```text
TENCENT_ASR_SECRET_ID=腾讯云 SecretId
TENCENT_ASR_SECRET_KEY=腾讯云 SecretKey
```

可选：

```text
TENCENT_ASR_REGION=ap-shanghai
TENCENT_ASR_ENGINE=16k_zh
TENCENT_ASR_PROJECT_ID=0
TENCENT_ASR_FALLBACK_DISABLED=false
```

说明：

- `TENCENT_ASR_REGION` 默认 `ap-shanghai`。
- `TENCENT_ASR_ENGINE` 默认 `16k_zh`。
- 如果腾讯云 ASR 临时失败，系统默认会回退到原来的 OpenAI 兼容语音转写通道。
- 如果希望腾讯云失败时不要回退，可以设置 `TENCENT_ASR_FALLBACK_DISABLED=true`。

## 验证方式

配置后先在代理服务器上重启 `workpad-wecom-proxy`，再访问：

```text
https://workpad.tbxprint.com/api/wecom/health
```

看到下面字段为 `true` 即说明密钥已配置：

```json
{
  "tencentAsrConfigured": true,
  "tencentAsrProxyConfigured": true,
  "tencentAsrSecretIdReady": true,
  "tencentAsrSecretKeyReady": true
}
```

如果只看到 `tencentAsrProxyConfigured: true`，但 `tencentAsrSecretIdReady: false`，说明 WorkPad 已经会走北京服务器代理，但代理服务器上还没有配置腾讯云 ASR 密钥。
