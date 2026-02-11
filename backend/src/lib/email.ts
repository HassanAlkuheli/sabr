import { env } from "../config/env";

/**
 * Send an email via Gmail SMTP using Bun's built-in fetch
 * and Google's SMTP relay (via nodemailer-compatible approach using raw SMTP).
 *
 * We use a lightweight approach: construct the email and POST via Gmail API
 * or fall back to a minimal SMTP implementation.
 *
 * For simplicity in Bun, we use the `nodemailer` package.
 */

let transporter: any = null;

async function getTransporter() {
  if (transporter) return transporter;

  const nodemailer = await import("nodemailer");
  transporter = nodemailer.default.createTransport({
    service: "gmail",
    auth: {
      user: env.SMTP_EMAIL,
      pass: env.SMTP_APP_PASSWORD,
    },
  });
  return transporter;
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  if (!env.SMTP_EMAIL || !env.SMTP_APP_PASSWORD) {
    console.warn("⚠️  SMTP not configured — skipping password reset email to", to);
    return;
  }

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Sabr LMS</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
      </div>

      <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          You requested a password reset. Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #3b82f6; color: white; text-decoration: none;
                    padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset Password
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
          If you didn't request this, please ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">
        &copy; ${new Date().getFullYear()} Sabr LMS
      </p>
    </div>
  `;

  const transport = await getTransporter();
  await transport.sendMail({
    from: `"Sabr LMS" <${env.SMTP_EMAIL}>`,
    to,
    subject: "Password Reset — Sabr LMS",
    html,
  });
}
