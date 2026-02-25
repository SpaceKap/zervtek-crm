import nodemailer from "nodemailer";

const EMAIL_ADDRESS = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@localhost";
// Show "ZervTek" as sender name in Gmail etc. (use EMAIL_FROM like "ZervTek <team@...>" to override)
const from =
  process.env.EMAIL_FROM?.includes("<") && process.env.EMAIL_FROM?.includes(">")
    ? process.env.EMAIL_FROM
    : `ZervTek <${EMAIL_ADDRESS}>`;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn("Email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS). Skipping send.");
    return false;
  }
  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, "<br>\n"),
    });
    return true;
  } catch (e) {
    console.error("Send email error:", e);
    return false;
  }
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<boolean> {
  const subject = "Confirm your email address";
  const text = `Hi ${name},

You're one step away from accessing your ZervTek customer portal.

Please confirm your email address by clicking the link below:

${verifyUrl}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.

Thanks,
The ZervTek Team`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi ${name},</p>
  <p>You're one step away from accessing your ZervTek customer portal.</p>
  <p>Please confirm your email address by clicking the link below:</p>
  <p><a href="${verifyUrl}" style="color: #2563eb; font-weight: 500;">Confirm email address</a></p>
  <p style="word-break: break-all; font-size: 14px; color: #666;">${verifyUrl}</p>
  <p style="font-size: 14px; color: #666;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  <p>Thanks,<br><strong>The ZervTek Team</strong></p>
</body>
</html>`;
  return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "Reset your password";
  const text = `Hi ${name},

You requested a password reset for your ZervTek customer portal account. Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

Thanks,
The ZervTek Team`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi ${name},</p>
  <p>You requested a password reset for your ZervTek customer portal account. Click the link below to set a new password:</p>
  <p><a href="${resetUrl}" style="color: #2563eb; font-weight: 500;">Reset password</a></p>
  <p style="word-break: break-all; font-size: 14px; color: #666;">${resetUrl}</p>
  <p style="font-size: 14px; color: #666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
  <p>Thanks,<br><strong>The ZervTek Team</strong></p>
</body>
</html>`;
  return sendEmail({ to, subject, text, html });
}
