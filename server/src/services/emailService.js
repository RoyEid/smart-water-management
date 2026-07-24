import { createEmailTransporter } from "../config/email.js";

const DEFAULT_CLIENT_URL = "http://localhost:5173";
const VALID_PURPOSES = new Set(["verify-email", "reset-password"]);

let transporter;

function getTransporter() {
  if (!transporter) {
    // Create lazily so an SMTP configuration error fails only the email request,
    // rather than preventing the entire API server from starting.
    transporter = createEmailTransporter();
  }

  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildEmailActionLink(email, code, purpose) {
  if (!VALID_PURPOSES.has(purpose)) {
    const error = new Error(`Unsupported email action purpose: ${purpose}`);
    error.code = "EMAIL_LINK_INVALID";
    throw error;
  }

  const clientUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    DEFAULT_CLIENT_URL;
  let actionUrl;

  try {
    actionUrl = new URL("/verify-code", clientUrl);
  } catch {
    const error = new Error("Email configuration error: FRONTEND_URL must be an absolute URL.");
    error.code = "EMAIL_CONFIG_INVALID";
    throw error;
  }

  actionUrl.searchParams.set("email", email);
  actionUrl.searchParams.set("code", String(code));
  actionUrl.searchParams.set("purpose", purpose);
  return actionUrl.toString();
}

export function buildEmailContent({ email, name, code, purpose }) {
  const isPasswordReset = purpose === "reset-password";
  const displayName = String(name || "there").trim() || "there";
  const actionLink = buildEmailActionLink(email, code, purpose);
  const safeName = escapeHtml(displayName);
  const safeCode = escapeHtml(code);
  const safeActionLink = escapeHtml(actionLink);
  const heading = isPasswordReset ? "Reset your password" : "Verify your email address";
  const intro = isPasswordReset
    ? "We received a request to reset your Smart Water password."
    : "Welcome to Smart Water. Confirm your email to finish setting up your account.";
  const buttonLabel = isPasswordReset ? "Reset my password" : "Verify my account";
  const codeLabel = isPasswordReset ? "Password reset code" : "Verification code";
  const securityNote = isPasswordReset
    ? "If you did not request a password reset, you can safely ignore this email."
    : "If you did not create this account, you can safely ignore this email.";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eff6ff; color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px; overflow:hidden; border:1px solid #dbeafe; border-radius:18px; background-color:#ffffff; box-shadow:0 12px 30px rgba(30,64,175,0.10);">
            <tr>
              <td align="center" style="background-color:#164e8a; background-image:linear-gradient(135deg,#164e8a 0%,#2563eb 62%,#0891b2 100%); padding:30px 24px; color:#ffffff;">
                <div style="margin:0 auto 12px; width:42px; height:42px; border:1px solid rgba(255,255,255,0.55); border-radius:14px; background-color:rgba(255,255,255,0.16); font-size:24px; line-height:42px;">&#128167;</div>
                <div style="font-family:'Segoe UI',Arial,sans-serif; font-size:22px; font-weight:800; letter-spacing:0.2px;">Smart Water</div>
                <div style="margin-top:5px; font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#dbeafe;">Secure account service</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:34px 30px 30px; font-family:'Segoe UI',Arial,sans-serif;">
                <h1 style="margin:0; color:#0f172a; font-size:24px; line-height:1.3;">${heading}</h1>
                <p style="margin:14px 0 0; color:#475569; font-size:15px; line-height:1.7;">Hello ${safeName},<br>${intro}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 24px;">
                  <tr>
                    <td align="center" style="border-radius:12px; background-color:#1d4ed8;">
                      <a href="${safeActionLink}" style="display:inline-block; padding:14px 30px; border-radius:12px; background-color:#1d4ed8; background-image:linear-gradient(90deg,#1d4ed8,#0891b2); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">${buttonLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px; color:#64748b; font-size:13px; line-height:1.5;">Or enter this six-digit code:</p>
                <div style="display:inline-block; border:1px dashed #93c5fd; border-radius:12px; background-color:#f8fbff; padding:15px 22px;">
                  <div style="margin-bottom:7px; color:#64748b; font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;">${codeLabel}</div>
                  <div style="color:#1d4ed8; font-family:Consolas,'Courier New',monospace; font-size:28px; font-weight:800; letter-spacing:7px;">${safeCode}</div>
                </div>
                <p style="margin:24px 0 0; color:#64748b; font-size:12px; line-height:1.6;">This code expires in 10 minutes and can be used only once.<br>${securityNote}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="border-top:1px solid #e2e8f0; background-color:#f8fafc; padding:17px 24px; color:#94a3b8; font-family:'Segoe UI',Arial,sans-serif; font-size:11px;">Smart Water Management System &middot; Blue-and-white secure communications</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hello ${displayName},`,
    "",
    intro,
    `${buttonLabel}: ${actionLink}`,
    "",
    `${codeLabel}: ${code}`,
    "This code expires in 10 minutes and can be used only once.",
    securityNote,
  ].join("\n");

  return { html, text };
}

async function sendActionEmail({ email, name, code, purpose }) {
  const isPasswordReset = purpose === "reset-password";
  const subject = isPasswordReset
    ? "Reset your Smart Water account password"
    : "Verify your Smart Water account";
  const { html, text } = buildEmailContent({ email, name, code, purpose });
  const from = process.env.EMAIL_FROM || '"Smart Water" <no-reply@example.com>';

  return getTransporter().sendMail({ from, to: email, subject, html, text });
}

export function sendVerificationEmail(email, name, code) {
  return sendActionEmail({ email, name, code, purpose: "verify-email" });
}

export function sendPasswordResetEmail(email, name, code) {
  return sendActionEmail({ email, name, code, purpose: "reset-password" });
}
