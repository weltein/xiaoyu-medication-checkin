function reply(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { error: "Method not allowed" });
  }

  if (!process.env.REMINDER_WEBHOOK_SECRET ||
      request.headers.authorization !== `Bearer ${process.env.REMINDER_WEBHOOK_SECRET}`) {
    return reply(response, 401, { error: "Unauthorized" });
  }

  if (!process.env.RESEND_API_KEY || !process.env.REMINDER_FROM_EMAIL) {
    return reply(response, 503, { error: "Email provider is not configured" });
  }

  const { email, slot, time } = request.body || {};
  if (!isValidEmail(email) || !["早", "中", "晚", "睡前"].includes(slot)) {
    return reply(response, 400, { error: "Invalid reminder payload" });
  }

  const siteUrl = process.env.PUBLIC_SITE_URL || "";
  const safeSlot = slot.replace(/[<>&"']/g, "");
  const safeTime = String(time || "").replace(/[<>&"']/g, "");
  const openButton = siteUrl
    ? `<p style="margin:24px 0 0"><a href="${siteUrl}" style="display:inline-block;padding:11px 18px;border-radius:12px;background:#bd5870;color:#fff;text-decoration:none;font-weight:700">打开用药打卡</a></p>`
    : "";

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.REMINDER_FROM_EMAIL,
        to: [email],
        subject: `用药提醒｜${safeSlot}`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;color:#382f32;line-height:1.7"><h2 style="margin:0;color:#923d53">${safeSlot}间用药提醒</h2><p>现在是设定的用药时间 ${safeTime}，请打开用药打卡查看今天需要使用的药品与规格，并在完成后记录。</p>${openButton}<p style="margin-top:26px;color:#75696d;font-size:13px">这是一封自动提醒邮件。</p></div>`
      })
    });
    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      throw new Error(`Resend ${resendResponse.status}: ${detail.slice(0, 240)}`);
    }
    return reply(response, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return reply(response, 502, { error: "Email delivery failed" });
  }
}
