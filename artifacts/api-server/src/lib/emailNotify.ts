import { Resend } from "resend";
import { logger } from "./logger";

const FROM = "GILOS <noreply@olchaai.com>";
const FROM_FALLBACK = "GILOS <onboarding@resend.dev>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      await resend.emails.send({ from: FROM_FALLBACK, to, subject, html });
    }
  } catch (err) {
    logger.warn({ err, to, subject }, "emailNotify: send failed (non-fatal)");
  }
}

function base(content: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f1a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:20px 24px">
        <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px">GILOS</span>
      </div>
      <div style="padding:24px">${content}</div>
      <div style="padding:12px 24px;background:#ffffff08;font-size:11px;color:#888">
        GILOS — <a href="https://olchaai.com" style="color:#a78bfa">olchaai.com</a>
        &nbsp;·&nbsp; Bildirishnomalarni o'chirish uchun sozlamalarga kiring.
      </div>
    </div>`;
}

export async function notifyComment(opts: {
  toEmail: string;
  toName: string;
  commenterName: string;
  postPreview: string;
  commentText: string;
}): Promise<void> {
  const { toEmail, toName, commenterName, postPreview, commentText } = opts;
  const html = base(`
    <p style="margin:0 0 8px">Salom, <b>${toName}</b>!</p>
    <p style="margin:0 0 16px;color:#ccc">
      <b style="color:#a78bfa">${commenterName}</b> sizning postingizga komment yozdi:
    </p>
    <div style="background:#ffffff0d;border-left:3px solid #7c3aed;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;color:#ddd;font-size:13px">
      <i>"${postPreview.slice(0, 100)}${postPreview.length > 100 ? "…" : ""}"</i>
    </div>
    <div style="background:#ffffff08;padding:12px 16px;border-radius:8px;color:#e2e8f0;font-size:14px;margin-bottom:20px">
      💬 ${commentText.slice(0, 200)}${commentText.length > 200 ? "…" : ""}
    </div>
    <a href="https://olchaai.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ko'rish →
    </a>`);
  await send(toEmail, `${commenterName} sizning postingizga komment yozdi`, html);
}

export async function notifyLike(opts: {
  toEmail: string;
  toName: string;
  likerName: string;
  postPreview: string;
}): Promise<void> {
  const { toEmail, toName, likerName, postPreview } = opts;
  const html = base(`
    <p style="margin:0 0 8px">Salom, <b>${toName}</b>!</p>
    <p style="margin:0 0 16px;color:#ccc">
      <b style="color:#f472b6">${likerName}</b> sizning postingizni yoqtirdi ❤️
    </p>
    <div style="background:#ffffff0d;border-left:3px solid #db2777;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;color:#ddd;font-size:13px">
      <i>"${postPreview.slice(0, 120)}${postPreview.length > 120 ? "…" : ""}"</i>
    </div>
    <a href="https://olchaai.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Ko'rish →
    </a>`);
  await send(toEmail, `${likerName} sizning postingizni yoqtirdi ❤️`, html);
}

export async function notifyFollow(opts: {
  toEmail: string;
  toName: string;
  followerName: string;
}): Promise<void> {
  const { toEmail, toName, followerName } = opts;
  const html = base(`
    <p style="margin:0 0 8px">Salom, <b>${toName}</b>!</p>
    <p style="margin:0 0 20px;color:#ccc">
      <b style="color:#34d399">${followerName}</b> sizga obuna bo'ldi 🎉
    </p>
    <a href="https://olchaai.com" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Profilni ko'rish →
    </a>`);
  await send(toEmail, `${followerName} sizga obuna bo'ldi 🎉`, html);
}
