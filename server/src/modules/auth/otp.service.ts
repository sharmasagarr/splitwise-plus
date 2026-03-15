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

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject: "Your Splitwise+ verification code",
    text: `Hi ${name},\n\nYour verification code is ${otp}. It expires in ${OTP_VALIDITY_MINUTES} minutes.\n\nIf you did not request this, you can ignore this email.`,
  });
};

export const OTP_LIMITS = {
  OTP_LENGTH,
  OTP_VALIDITY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_VERIFY_ATTEMPTS: 5,
};
