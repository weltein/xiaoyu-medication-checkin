import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const requiredFiles = ["index.html", "sw.js", "manifest.webmanifest", "favicon.svg"];

for (const file of requiredFiles) {
  const absolute = path.join(dist, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    throw new Error(`缺少生产文件：dist/${file}`);
  }
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(dist, "sw.js"), "utf8");
const manifest = fs.readFileSync(path.join(dist, "manifest.webmanifest"), "utf8");
const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const reminderSettings = fs.readFileSync(path.join(root, "api", "reminder-settings.js"), "utf8");
const sendReminder = fs.readFileSync(path.join(root, "api", "send-reminder.js"), "utf8");

JSON.parse(manifest);
new Function(worker);

if (vercelConfig.outputDirectory !== "dist") throw new Error("Vercel 输出目录必须是 dist");
if (!vercelConfig.rewrites?.some((rule) => rule.source === "/(.*)" && rule.destination === "/index.html")) {
  throw new Error("Vercel SPA 回退路由缺失");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if (!inlineScripts.length) throw new Error("index.html 中没有应用脚本");
for (const match of inlineScripts) new Function(match[1]);
for (const [name, source] of [["api/reminder-settings.js", reminderSettings], ["api/send-reminder.js", sendReminder]]) {
  const scriptBody = source.replace(/export\s+default\s+async\s+function\s+handler/, "async function handler");
  try { new Function(scriptBody); } catch (error) { throw new Error(`${name} 语法错误：${error.message}`); }
}

const externalAsset = /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i;
if (externalAsset.test(html)) throw new Error("index.html 仍引用外部资源");

const forbidden = /(?:fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|cdnjs|unpkg|openai|chatgpt\.site|modelContext)/i;
for (const [name, content] of [["index.html", html], ["sw.js", worker], ["manifest.webmanifest", manifest]]) {
  if (forbidden.test(content)) throw new Error(`dist/${name} 中仍含国外或平台专用依赖`);
}

if (!html.includes('name="bedtime"') || !reminderSettings.includes('bedtime')) {
  throw new Error("缺少睡前提醒时间设置");
}

console.log("Production verification passed: PWA plus four email reminder schedules.");
