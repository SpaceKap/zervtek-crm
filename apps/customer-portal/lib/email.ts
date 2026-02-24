import nodemailer from "nodemailer";

const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@localhost";

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

Please confirm your email address by clicking the link below:

${verifyUrl}

This link expires in 24 hours. If you didn't create an account, you can ignore this email.

Thanks,
The Team`;
  return sendEmail({ to, subject, text });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "Reset your password";
  const text = `Hi ${name},

You requested a password reset. Click the link below to set a new password:

${resetUrl}

This link expires in 1 hour. If you didn't request this, you can ignore this email.

Thanks,
The Team`;
  return sendEmail({ to, subject, text });
}
