import crypto from "node:crypto";
import nodemailer from "nodemailer";

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

type SendPaymentReminderEmailParams = {
  amount: number;
  expenseCount: number;
  fromName: string;
  groupNames: string[];
  to: string;
  toName: string;
};

export const sendPaymentReminderEmail = async ({
  amount,
  expenseCount,
  fromName,
  groupNames,
  to,
  toName,
}: SendPaymentReminderEmailParams) => {
  if (!transporter || !fromEmail) {
    throw new Error("Email service is not configured");
  }

  const requestId = crypto.randomUUID();
  const safeFromName = String(fromName || "A friend").trim() || "A friend";
  const safeToName = String(toName || "there").trim().split(/\s+/)[0] || "there";
  const formattedAmount = `₹${Number(amount || 0).toFixed(2)}`;
  const groupSummary =
    groupNames.length > 0 ? groupNames.join(", ") : "your pending shares";

  const html = `
  <div style="margin:0;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#312e81 0%,#4338ca 55%,#0ea5e9 100%);">
                <div style="font-size:12px;line-height:1.2;font-weight:700;letter-spacing:0.3px;color:#ffffff;">Splitwise Plus</div>
                <div style="margin-top:10px;font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;">Payment reminder</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.9);">${safeFromName} asked you to settle your pending balance.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 18px;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">Hi ${safeToName},</p>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#334155;">
                  You currently have an outstanding amount of <strong style="color:#111827;">${formattedAmount}</strong>
                  with <strong style="color:#111827;">${safeFromName}</strong>.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;background:#f8fafc;border:1px solid #dbeafe;border-radius:18px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:12px;line-height:1.3;color:#475569;">Outstanding total</div>
                      <div style="margin-top:6px;font-size:28px;line-height:1.1;font-weight:800;color:#1d4ed8;">${formattedAmount}</div>
                      <div style="margin-top:8px;font-size:13px;line-height:1.6;color:#64748b;">Across ${expenseCount} pending ${expenseCount === 1 ? "expense" : "expenses"} in ${groupSummary}.</div>
                    </td>
                  </tr>
                </table>

                <div style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#334155;">
                  Open the Splitwise Plus app to review the pending items and record your payment once it is done.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 24px;border-top:1px solid #e2e8f0;">
                <div style="font-size:12px;line-height:1.7;color:#94a3b8;">
                  This reminder was sent from Splitwise Plus. If you already paid, you can ignore this message and update the settlement in the app.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  await transporter.sendMail({
    from: `Splitwise Plus <${fromEmail}>`,
    to,
    subject: `${safeFromName} sent you a payment reminder`,
    messageId: `<payment-reminder-${requestId}@splitwise.plus>`,
    headers: {
      "X-Entity-Ref-ID": requestId,
      "X-Auto-Response-Suppress": "All",
    },
    text: `Hi ${safeToName},\n\n${safeFromName} sent you a payment reminder for ${formattedAmount}. You currently have ${expenseCount} pending ${expenseCount === 1 ? "expense" : "expenses"} in ${groupSummary}.\n\nOpen Splitwise Plus to review and settle it.`,
    html,
  });
};
