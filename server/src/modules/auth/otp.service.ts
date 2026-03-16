import crypto from "node:crypto";
import nodemailer from "nodemailer";

const OTP_VALIDITY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

const smtpHost = process.env.BREVO_SMTP_HOST;
const smtpPort = Number(process.env.BREVO_SMTP_PORT || 587);
const smtpUser = process.env.BREVO_SMTP_USER;
const smtpPassword = process.env.BREVO_SMTP_PASSWORD;
const fromEmail = process.env.BREVO_FROM_EMAIL || smtpUser;

const transporter =
  smtpHost && smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      })
    : null;

export const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

export const hashOtp = (otp: string) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

export const getOtpExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_VALIDITY_MINUTES);
  return expiresAt;
};

export const isOtpResendAllowed = (lastSentAt?: Date | null) => {
  if (!lastSentAt) {
    return true;
  }

  const secondsSinceLastSend = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
  return secondsSinceLastSend >= OTP_RESEND_COOLDOWN_SECONDS;
};

export const getOtpResendWaitSeconds = (lastSentAt?: Date | null) => {
  if (!lastSentAt) {
    return 0;
  }

  const secondsSinceLastSend = Math.floor((Date.now() - lastSentAt.getTime()) / 1000);
  return Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
};

export const sendSignupOtpEmail = async ({
  to,
  name,
  otp,
}: {
  to: string;
  name: string;
  otp: string;
}) => {
  if (!transporter || !fromEmail) {
    throw new Error("Email service is not configured");
  }

  const requestId = crypto.randomUUID();
  const firstName = String(name || "User").trim().split(/\s+/)[0] || "User";

  const otpHtml = `
  <div style="margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:18px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(15,23,42,0.12);">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:18px 24px;">
                <div style="font-size:12.5px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:0.2px;">Splitwise Plus</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 26px 22px;color:#0f172a;">
                <h2 style="margin:0 0 10px;font-size:15px;line-height:1.3;">Verify your email</h2>
                <p style="margin:0 0 18px;font-size:9.375px;line-height:1.7;color:#334155;">Hi ${firstName}, use the verification code below to complete your Splitwise Plus signup.</p>
                <div style="display:inline-block;padding:14px 20px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;font-size:18.75px;letter-spacing:8px;font-weight:800;color:#0f172a;">${otp}</div>
                <p style="margin:18px 0 8px;font-size:8.125px;line-height:1.6;color:#64748b;">This code expires in ${OTP_VALIDITY_MINUTES} minutes.</p>
                <p style="margin:0;font-size:8.125px;line-height:1.6;color:#64748b;">If you did not request this code, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 26px 22px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:7.5px;line-height:1.5;">Splitwise Plus Security Team</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  await transporter.sendMail({
    // Display name in inbox sender line.
    from: `Splitwise Plus <${fromEmail}>`,
    to,
    // Unique subject token helps clients keep OTP sends as separate emails.
    subject: `Email Verification`,
    messageId: `<otp-${requestId}@splitwise.plus>`,
    headers: {
      "X-Entity-Ref-ID": requestId,
      "X-Auto-Response-Suppress": "All",
    },
    text: `Hi ${firstName},\n\nYour verification code is ${otp}. It expires in ${OTP_VALIDITY_MINUTES} minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: otpHtml,
  });
};

export const OTP_LIMITS = {
  OTP_LENGTH,
  OTP_VALIDITY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_VERIFY_ATTEMPTS: 5,
};
