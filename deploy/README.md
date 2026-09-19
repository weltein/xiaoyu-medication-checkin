# Ubuntu + Nginx 上线说明

该项目是零依赖静态 PWA，不使用 React、Vite 或其他构建器。`dist/` 就是生产目录，生产构建命令是对该目录进行校验后打包。

以下示例使用：

- 本地项目目录：`C:\Users\52767\Desktop\杂项\小鱼\用药打卡\打卡项目`
- 服务器 SSH 用户：`ubuntu`
- 服务器地址：`SERVER_IP`
- 域名：`YOUR_DOMAIN`
- 站点目录：`/var/www/medication-checkin/current`

执行前请把 `SERVER_IP`、`YOUR_DOMAIN` 和邮箱替换为真实值。

## 1. 域名解析

在域名 DNS 控制台添加 A 记录：

```text
主机记录：按需要填写，例如 med
记录类型：A
记录值：香港服务器公网 IPv4
```

等待域名解析生效，并确认 `YOUR_DOMAIN` 能解析到 `SERVER_IP`。

## 2. 本地生成生产包

在 PowerShell 中进入项目目录：

```powershell
node .\scripts\verify-production.mjs
tar -czf .\medication-checkin-production.tar.gz -C .\dist .
```

第一条命令检查必需文件、内联 JavaScript、manifest 和国外外部依赖；第二条命令将 `dist/` 打包为 `medication-checkin-production.tar.gz`。仓库内已经生成生产压缩包。

## 3. 上传文件

```powershell
scp .\medication-checkin-production.tar.gz ubuntu@SERVER_IP:/tmp/
scp .\deploy\nginx\medication-checkin-http.conf ubuntu@SERVER_IP:/tmp/
scp .\deploy\nginx\medication-checkin-https.conf ubuntu@SERVER_IP:/tmp/
```

## 4. 安装 Nginx 和 Certbot

登录服务器：

```bash
ssh ubuntu@SERVER_IP
```

在服务器执行：

```bash
sudo apt update
sudo apt install -y nginx certbot
sudo mkdir -p /var/www/medication-checkin/current /var/www/certbot
sudo tar -xzf /tmp/medication-checkin-production.tar.gz -C /var/www/medication-checkin/current
sudo chown -R root:root /var/www/medication-checkin
sudo find /var/www/medication-checkin -type d -exec chmod 755 {} \;
sudo find /var/www/medication-checkin -type f -exec chmod 644 {} \;
```

## 5. 启用 HTTP 配置

先把配置中的域名占位符替换掉：

```bash
sed "s/YOUR_DOMAIN/你的真实域名/g" /tmp/medication-checkin-http.conf | sudo tee /etc/nginx/sites-available/medication-checkin >/dev/null
sudo ln -s /etc/nginx/sites-available/medication-checkin /etc/nginx/sites-enabled/medication-checkin
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 防火墙端口

云厂商安全组入站开放：

- TCP 22：SSH，建议仅允许管理员固定 IP。
- TCP 80：HTTP，用于访问和 Let's Encrypt 验证。
- TCP 443：HTTPS，供用户访问。

如果 Ubuntu 启用了 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

应用本身没有后端，不需要开放 3000、5173、8080 或数据库端口。

## 7. 申请 Let's Encrypt 证书

确认 DNS 已经生效且 80 端口可从公网访问后执行：

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d 你的真实域名 --email 你的邮箱 --agree-tos --no-eff-email
```

## 8. 启用最终 HTTPS 配置

```bash
sed "s/YOUR_DOMAIN/你的真实域名/g" /tmp/medication-checkin-https.conf | sudo tee /etc/nginx/sites-available/medication-checkin >/dev/null
sudo nginx -t
sudo systemctl reload nginx
```

测试自动续期：

```bash
sudo certbot renew --dry-run
systemctl status certbot.timer --no-pager
```

## 9. 验证

```bash
curl -I http://你的真实域名
curl -I https://你的真实域名
curl -I https://你的真实域名/sw.js
```

浏览器检查：

1. 手机打开 HTTPS 地址。
2. 切换日期并完成一次打卡。
3. 刷新页面，确认打卡记录仍在。
4. 编辑一项药品名称和日期，刷新后确认修改仍在。
5. 直接访问任意路径，例如 `/test-route`，确认返回应用页面而不是 Nginx 404。

## 10. 后续更新

本地重新生成压缩包并上传后，在服务器执行：

```bash
sudo tar -xzf /tmp/medication-checkin-production.tar.gz -C /var/www/medication-checkin/current
sudo nginx -t
sudo systemctl reload nginx
```

打卡记录和药品编辑仍使用原来的 localStorage 键：`medication-checkin-records-v1` 和 `medication-plans-v1`，未增加数据库。
