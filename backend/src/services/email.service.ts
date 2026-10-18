import { env } from "../config/env";
import { logger } from "../middleware/logger";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId: string;
  provider: "resend" | "postmark" | "development";
  error?: string;
}

export class EmailService {
  /**
   * Primary dispatcher: Sends email using Resend, Postmark, or Dev Logger.
   */
  static async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const fromAddress = env.EMAIL_FROM || "TaskFlow Pro <notifications@taskflow.dev>";

    // 1. Try Resend if configured
    if (env.RESEND_API_KEY) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: recipients,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ""),
          }),
        });

        const data: any = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Resend error code ${response.status}`);
        }

        logger.info({ messageId: data.id, recipients }, "✉️ Email successfully dispatched via Resend");
        return {
          success: true,
          messageId: data.id,
          provider: "resend",
        };
      } catch (err: any) {
        logger.error({ err: err.message }, "❌ Failed to send email via Resend, falling back");
      }
    }

    // 2. Try Postmark if configured
    if (env.POSTMARK_SERVER_TOKEN) {
      try {
        const response = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            "X-Postmark-Server-Token": env.POSTMARK_SERVER_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            From: fromAddress,
            To: recipients.join(","),
            Subject: options.subject,
            HtmlBody: options.html,
            TextBody: options.text || options.html.replace(/<[^>]*>/g, ""),
          }),
        });

        const data: any = await response.json();
        if (!response.ok) {
          throw new Error(data.Message || `Postmark error code ${response.status}`);
        }

        logger.info({ messageId: data.MessageID, recipients }, "✉️ Email successfully dispatched via Postmark");
        return {
          success: true,
          messageId: data.MessageID,
          provider: "postmark",
        };
      } catch (err: any) {
        logger.error({ err: err.message }, "❌ Failed to send email via Postmark, falling back");
      }
    }

    // 3. Development Fallback (clean logger so local environment runs without external keys)
    const devId = `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log("\n=======================================================");
    console.log("📨 [EmailService - Development Fallback]");
    console.log(`To:      ${recipients.join(", ")}`);
    console.log(`From:    ${fromAddress}`);
    console.log(`Subject: ${options.subject}`);
    console.log("-------------------------------------------------------");
    console.log(options.text || options.html.replace(/<[^>]*>/g, " ").trim().substring(0, 300) + "...");
    console.log("💡 Tip: Set RESEND_API_KEY or POSTMARK_SERVER_TOKEN in .env for live dispatch.");
    console.log("=======================================================\n");

    return {
      success: true,
      messageId: devId,
      provider: "development",
    };
  }

  /**
   * Send an invitation email to a new team member.
   */
  static async sendWorkspaceInvitation(options: {
    to: string;
    inviterName: string;
    workspaceName: string;
    workspaceSlug?: string;
    inviteUrl?: string;
    role?: string;
  }): Promise<EmailResult> {
    const inviteUrl = options.inviteUrl || `${env.APP_URL}/dashboard`;
    const roleName = options.role || "Member";

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0d14; color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #121826; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 36px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
          <div style="display: flex; align-items: center; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #6366f1, #a855f7); width: 40px; height: 40px; border-radius: 10px; display: inline-block; vertical-align: middle; text-align: center; line-height: 40px; font-weight: bold; font-size: 20px; color: white;">⚡</div>
            <span style="font-size: 22px; font-weight: 700; margin-left: 12px; color: #f8fafc; vertical-align: middle;">TaskFlow <span style="color: #818cf8;">Pro</span></span>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">You've been invited to join ${options.workspaceName}</h2>
          <p style="font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
            <strong style="color: #f8fafc;">${options.inviterName}</strong> has invited you to collaborate on <strong style="color: #f8fafc;">${options.workspaceName}</strong> as a <strong>${roleName}</strong>.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
              Accept Workspace Invitation &rarr;
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px;">
            If button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${inviteUrl}" style="color: #818cf8; word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: options.to,
      subject: `[Invitation] ${options.inviterName} invited you to join ${options.workspaceName} on TaskFlow Pro`,
      html,
    });
  }

  /**
   * Send a Welcome Email upon user account registration.
   */
  static async sendWelcomeEmail(options: {
    to: string;
    displayName: string;
    loginUrl?: string;
  }): Promise<EmailResult> {
    const loginUrl = options.loginUrl || `${env.APP_URL}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0d14; color: #f8fafc; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #121826; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 36px;">
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">Welcome to TaskFlow Pro, ${options.displayName}! 🎉</h2>
          <p style="font-size: 15px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
            Your account has been created. You can now build team workspaces, coordinate live Kanban boards, and track your engineering velocity.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block;">
              Access Your Dashboard &rarr;
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: options.to,
      subject: `Welcome to TaskFlow Pro, ${options.displayName}!`,
      html,
    });
  }
}
