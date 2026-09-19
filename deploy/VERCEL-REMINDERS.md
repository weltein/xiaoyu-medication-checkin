# 邮件提醒部署配置

当前实现不增加数据库：药品与打卡仍在浏览器 `localStorage`；QStash 只保存早、中、晚、睡前四条北京时间定时规则，Resend 负责发送邮件。

## Vercel 环境变量

在项目 Settings → Environment Variables 中添加以下变量，并应用到 Production：

- `QSTASH_TOKEN`：Upstash QStash API Token
- `RESEND_API_KEY`：Resend API Key
- `REMINDER_FROM_EMAIL`：已在 Resend 验证域名下的发件地址，例如 `用药提醒 <reminder@example.com>`
- `REMINDER_ADMIN_KEY`：自行生成的设置口令，至少 16 位；保存/关闭提醒时在网页中输入
- `REMINDER_WEBHOOK_SECRET`：自行生成的随机值，至少 32 位，仅供 QStash 调用发送接口
- `PUBLIC_SITE_URL`：最终站点地址，例如 `https://med.example.com`

配置后重新部署。打开网站的“提醒”，填写接收邮箱、四个时间和 `REMINDER_ADMIN_KEY`，保存即可。

## 外部服务

1. 在 Upstash Console 创建 QStash，复制 Token。
2. 在 Resend 添加并验证自定义域名，按其提示配置 SPF/DKIM DNS 记录。
3. 创建 Resend API Key。

网页对外不加载任何 QStash/Resend 脚本；两项服务只由 Vercel 服务端函数访问。
