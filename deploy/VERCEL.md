# Vercel Free 部署与自定义域名

## 项目设置

- 技术栈：原生 HTML、CSS、JavaScript PWA
- 安装命令：无
- 生产校验命令：`node scripts/verify-production.mjs`
- 输出目录：`dist`
- 数据：浏览器 localStorage，不使用数据库
- SPA 回退：`vercel.json` 将未知路径重写到 `/index.html`

## 部署

连接 Vercel 后，在项目根目录发布生产版本。项目的 `vercel.json` 已经包含构建、输出目录、SPA 路由和缓存响应头设置。

部署完成后应取得类似以下地址：

```text
https://项目名称.vercel.app
```

## 自定义域名

先将域名添加到 Vercel 项目，再以 Vercel 项目返回的 DNS 建议为准。

常见配置如下：

### 根域名

```text
类型：A
主机记录：@
记录值：76.76.21.21
```

### 子域名

```text
类型：CNAME
主机记录：例如 med
记录值：cname.vercel-dns-0.com
```

Vercel 有时会为项目返回专属 CNAME，正式修改 DNS 前必须以域名检查结果显示的值为准。如果域名已绑定其他 Vercel 账户，还可能要求添加 TXT 所有权验证记录。

DNS 验证成功后，Vercel 自动申请和续期 HTTPS 证书。最终验证以下地址均应正常：

```text
http://你的域名       -> 自动跳转 HTTPS
https://你的域名      -> HTTP 200
https://你的域名/sw.js
https://你的域名/test-route -> 返回应用页面而不是 404
```

## 中国大陆用户访问测试清单

至少使用两家不同运营商和两种网络测试：

- 中国移动 4G/5G
- 中国联通或中国电信 4G/5G
- 家庭宽带 Wi-Fi
- iPhone Safari
- 安卓 Chrome 或系统浏览器
- 微信内置浏览器

每种环境依次检查：

1. 首次打开自定义 HTTPS 域名，页面在可接受时间内出现。
2. 地址栏没有证书警告，证书域名与自定义域名一致。
3. 页面没有空白、字体缺失或外部资源加载失败。
4. 切换前一天和后一天正常。
5. 点击“记录”，刷新页面后完成状态和时间仍保留。
6. 编辑药品名称、规格和日期，刷新后修改仍保留。
7. 直接访问 `/test-route`，确认不出现 404。
8. 将页面添加到手机主屏幕后重新打开。
9. 首次成功打开后关闭网络，再打开一次，确认离线缓存可用。
10. 在浏览器开发者工具或抓包中确认只有自定义域名自身的静态请求，没有 Google Fonts、国外 CDN、OpenAI 或 chatgpt.site 请求。

## 数据说明

存储键仍然是：

- `medication-checkin-records-v1`
- `medication-plans-v1`

浏览器会按域名隔离 localStorage，因此原 `chatgpt.site` 地址中的已有记录不会自动迁移到 Vercel 或自定义域名，但新站的数据逻辑保持不变。

Vercel 是境外托管平台，自定义域名不能保证所有中国大陆地区和运营商始终具备相同速度或可用性，必须按以上清单进行实测。
