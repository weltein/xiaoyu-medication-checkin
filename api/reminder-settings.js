const QSTASH_BASE_URL = "https://qstash.upstash.io/v2";
const SLOT_CONFIG = {
  morning: { label: "早", scheduleId: "xiaoyu-medication-morning" },
  noon: { label: "中", scheduleId: "xiaoyu-medication-noon" },
  evening: { label: "晚", scheduleId: "xiaoyu-medication-evening" },
  bedtime: { label: "睡前", scheduleId: "xiaoyu-medication-bedtime" }
};

function reply(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function isValidTime(value) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function qstashRequest(path, options = {}) {
  const response = await fetch(`${QSTASH_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`QStash ${response.status}: ${detail.slice(0, 240)}`);
  }
  return response;
}

async function deleteSchedules() {
  await Promise.all(Object.values(SLOT_CONFIG).map(async ({ scheduleId }) => {
    const response = await fetch(`${QSTASH_BASE_URL}/schedules/${scheduleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` }
    });
    if (!response.ok && response.status !== 404) {
      const detail = await response.text();
      throw new Error(`QStash ${response.status}: ${detail.slice(0, 240)}`);
    }
  }));
}

async function createSchedule(origin, email, key, time) {
  const { label, scheduleId } = SLOT_CONFIG[key];
  const [hour, minute] = time.split(":");
  const destination = `${origin}/api/send-reminder`;
  await qstashRequest(`/schedules/${encodeURIComponent(destination)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Upstash-Cron": `CRON_TZ=Asia/Shanghai ${Number(minute)} ${Number(hour)} * * *`,
      "Upstash-Schedule-Id": scheduleId,
      "Upstash-Method": "POST",
      "Upstash-Retries": "3",
      "Upstash-Forward-Authorization": `Bearer ${process.env.REMINDER_WEBHOOK_SECRET}`,
      "Upstash-Redact-Fields": "body, header[Authorization]"
    },
    body: JSON.stringify({ email, slot: label, time })
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "DELETE") {
    response.setHeader("Allow", "POST, DELETE");
    return reply(response, 405, { error: "Method not allowed" });
  }

  if (!process.env.QSTASH_TOKEN || !process.env.REMINDER_ADMIN_KEY || !process.env.REMINDER_WEBHOOK_SECRET) {
    return reply(response, 503, { error: "邮件提醒服务尚未完成配置" });
  }

  if (request.headers["x-reminder-key"] !== process.env.REMINDER_ADMIN_KEY) {
    return reply(response, 401, { error: "提醒设置口令不正确" });
  }

  try {
    if (request.method === "DELETE") {
      await deleteSchedules();
      return reply(response, 200, { ok: true, enabled: false });
    }

    const { email, morning, noon, evening, bedtime } = request.body || {};
    if (!isValidEmail(email)) return reply(response, 400, { error: "请填写有效的邮箱地址" });
    if (![morning, noon, evening, bedtime].every(isValidTime)) {
      return reply(response, 400, { error: "请填写有效的提醒时间" });
    }

    const protocol = request.headers["x-forwarded-proto"] || "https";
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    const origin = `${protocol}://${host}`;
    await Promise.all([
      createSchedule(origin, email, "morning", morning),
      createSchedule(origin, email, "noon", noon),
      createSchedule(origin, email, "evening", evening),
      createSchedule(origin, email, "bedtime", bedtime)
    ]);
    return reply(response, 200, { ok: true, enabled: true });
  } catch (error) {
    console.error(error);
    return reply(response, 502, { error: "提醒服务暂时不可用，请稍后重试" });
  }
}
