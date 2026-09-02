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

function getBaseClientUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    DEFAULT_CLIENT_URL
  );
}

export function buildEmailActionLink(email, code, purpose) {
  if (!VALID_PURPOSES.has(purpose)) {
    const error = new Error(`Unsupported email action purpose: ${purpose}`);
    error.code = "EMAIL_LINK_INVALID";
    throw error;
  }

  const clientUrl = getBaseClientUrl();
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

function renderEmailLayout({ headerTitle = "Smart Water", subtitle = "Secure account service", heading, contentHtml }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#eff6ff; color:#1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px; overflow:hidden; border:1px solid #dbeafe; border-radius:18px; background-color:#ffffff; box-shadow:0 12px 30px rgba(30,64,175,0.10);">
            <tr>
              <td align="center" style="background-color:#164e8a; background-image:linear-gradient(135deg,#164e8a 0%,#2563eb 62%,#0891b2 100%); padding:30px 24px; color:#ffffff;">
                <div style="margin:0 auto 12px; width:42px; height:42px; border:1px solid rgba(255,255,255,0.55); border-radius:14px; background-color:rgba(255,255,255,0.16); font-size:24px; line-height:42px;">&#128167;</div>
                <div style="font-family:'Segoe UI',Arial,sans-serif; font-size:22px; font-weight:800; letter-spacing:0.2px;">${escapeHtml(headerTitle)}</div>
                <div style="margin-top:5px; font-family:'Segoe UI',Arial,sans-serif; font-size:12px; color:#dbeafe;">${escapeHtml(subtitle)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 30px; font-family:'Segoe UI',Arial,sans-serif;">
                <h1 style="margin:0 0 16px; color:#0f172a; font-size:22px; font-weight:800; line-height:1.3; text-align:center;">${heading}</h1>
                ${contentHtml}
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

  const contentHtml = `
    <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.7;">Hello ${safeName},<br>${intro}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="border-radius:12px; background-color:#1d4ed8;">
          <a href="${safeActionLink}" style="display:inline-block; padding:14px 30px; border-radius:12px; background-color:#1d4ed8; background-image:linear-gradient(90deg,#1d4ed8,#0891b2); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">${buttonLabel}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 14px; color:#64748b; font-size:13px; line-height:1.5; text-align:center;">Or enter this six-digit code:</p>
    <div style="text-align:center;">
      <div style="display:inline-block; border:1px dashed #93c5fd; border-radius:12px; background-color:#f8fbff; padding:15px 22px;">
        <div style="margin-bottom:7px; color:#64748b; font-size:10px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;">${codeLabel}</div>
        <div style="color:#1d4ed8; font-family:Consolas,'Courier New',monospace; font-size:28px; font-weight:800; letter-spacing:7px;">${safeCode}</div>
      </div>
    </div>
    <p style="margin:24px 0 0; color:#64748b; font-size:12px; line-height:1.6; text-align:center;">This code expires in 10 minutes and can be used only once.<br>${securityNote}</p>
  `;

  const html = renderEmailLayout({ heading, contentHtml });

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

/* =========================================================================
 * Household Member Notifications
 * ========================================================================= */

/**
 * 1. Member Added Notification
 */
export async function sendMemberAddedEmail({ email, recipientName, ownerName, deviceName, deviceId, role }) {
  const displayName = String(recipientName || "").trim() || "there";
  const safeName = escapeHtml(displayName);
  const safeOwner = escapeHtml(String(ownerName || "The device owner").trim());
  const safeDeviceName = escapeHtml(String(deviceName || deviceId).trim());
  const safeDeviceId = escapeHtml(deviceId);
  const isController = role === "controller";
  const roleLabel = isController ? "Controller" : "Viewer";

  const clientUrl = getBaseClientUrl();
  const loginUrl = `${clientUrl}/login`;
  const safeLoginUrl = escapeHtml(loginUrl);

  const permissionDesc = isController
    ? "As a <strong>Controller</strong>, you can monitor tank levels in real time and operate pump controls (ON/OFF and AUTO/MANUAL modes)."
    : "As a <strong>Viewer</strong>, you have read-only access to monitor tank levels and system status in real time. Physical pump controls are disabled.";

  const contentHtml = `
    <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.7;">Hello ${safeName},</p>
    <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.7;">
      <strong>${safeOwner}</strong> has added you to the Smart Water device:
    </p>

    <div style="border:1px solid #bfdbfe; border-radius:14px; background-color:#f0f7ff; padding:18px 20px; margin-bottom:22px;">
      <div style="font-size:17px; font-weight:800; color:#1e40af; margin-bottom:4px;">${safeDeviceName}</div>
      <div style="font-size:12px; font-family:Consolas,monospace; color:#64748b; margin-bottom:14px;">Device ID: ${safeDeviceId}</div>
      <div style="display:inline-block; border-radius:8px; background-color:${isController ? "#dbeafe" : "#f1f5f9"}; color:${isController ? "#1e40af" : "#475569"}; padding:4px 10px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">
        Access Level: ${roleLabel}
      </div>
      <p style="margin:0; font-size:13px; color:#334155; line-height:1.6;">${permissionDesc}</p>
    </div>

    <p style="margin:0 0 20px; color:#475569; font-size:14px; line-height:1.6;">
      You can now access this water tank immediately using your existing Smart Water account.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="border-radius:12px; background-color:#1d4ed8;">
          <a href="${safeLoginUrl}" style="display:inline-block; padding:14px 30px; border-radius:12px; background-color:#1d4ed8; background-image:linear-gradient(90deg,#1d4ed8,#0891b2); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">Open Smart Water</a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailLayout({
    heading: "You've been added to a Smart Water device",
    contentHtml,
  });

  const text = [
    `Hello ${displayName},`,
    "",
    `${ownerName} added you to the Smart Water device:`,
    "",
    `${deviceName} (Device ID: ${deviceId})`,
    `Your access level: ${roleLabel}`,
    "",
    isController
      ? "As a Controller, you can monitor the tank and operate its pump controls."
      : "As a Viewer, you can monitor the tank and its status, but you cannot operate pump controls.",
    "",
    "You can now sign in to Smart Water Management using your existing account:",
    loginUrl,
    "",
    "Smart Water Management",
  ].join("\n");

  const subject = "You've been added to a Smart Water device";
  const from = process.env.EMAIL_FROM || '"Smart Water" <no-reply@example.com>';

  return getTransporter().sendMail({ from, to: email, subject, html, text });
}

/**
 * 2. Member Role Changed Notification
 */
export async function sendMemberRoleChangedEmail({ email, recipientName, ownerName, deviceName, deviceId, previousRole, newRole }) {
  const displayName = String(recipientName || "").trim() || "there";
  const safeName = escapeHtml(displayName);
  const safeOwner = escapeHtml(String(ownerName || "The device owner").trim());
  const safeDeviceName = escapeHtml(String(deviceName || deviceId).trim());
  const safeDeviceId = escapeHtml(deviceId);

  const prevRoleLabel = previousRole === "controller" ? "Controller" : "Viewer";
  const newRoleLabel = newRole === "controller" ? "Controller" : "Viewer";
  const isNowController = newRole === "controller";

  const clientUrl = getBaseClientUrl();
  const safeUrl = escapeHtml(`${clientUrl}/devices/${encodeURIComponent(deviceId)}`);

  const desc = isNowController
    ? "You can now monitor the device and operate its pump controls."
    : "You can continue monitoring the device, but pump controls are now read-only.";

  const contentHtml = `
    <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.7;">Hello ${safeName},</p>
    <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.7;">
      Your access permissions for <strong>${safeDeviceName}</strong> (${safeDeviceId}) have been updated by <strong>${safeOwner}</strong>.
    </p>

    <div style="border:1px solid #bfdbfe; border-radius:14px; background-color:#f0f7ff; padding:18px 20px; margin-bottom:22px;">
      <div style="font-size:13px; color:#64748b; margin-bottom:6px;">
        Previous access: <strong style="color:#475569;">${prevRoleLabel}</strong>
      </div>
      <div style="font-size:15px; color:#1e40af; margin-bottom:12px;">
        New access: <strong>${newRoleLabel}</strong>
      </div>
      <p style="margin:0; font-size:13px; color:#334155; line-height:1.6;">${desc}</p>
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
      <tr>
        <td align="center" style="border-radius:12px; background-color:#1d4ed8;">
          <a href="${safeUrl}" style="display:inline-block; padding:14px 30px; border-radius:12px; background-color:#1d4ed8; background-image:linear-gradient(90deg,#1d4ed8,#0891b2); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">View Device</a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailLayout({
    heading: "Your Smart Water access has changed",
    contentHtml,
  });

  const text = [
    `Hello ${displayName},`,
    "",
    `Your access to ${deviceName} (${deviceId}) has changed.`,
    `Updated by: ${ownerName}`,
    "",
    `Previous access: ${prevRoleLabel}`,
    `New access: ${newRoleLabel}`,
    "",
    desc,
    "",
    "Smart Water Management",
  ].join("\n");

  const subject = "Your Smart Water access has changed";
  const from = process.env.EMAIL_FROM || '"Smart Water" <no-reply@example.com>';

  return getTransporter().sendMail({ from, to: email, subject, html, text });
}

/**
 * 3. Member Removed Notification
 */
export async function sendMemberRemovedEmail({ email, recipientName, ownerName, deviceName, deviceId }) {
  const displayName = String(recipientName || "").trim() || "there";
  const safeName = escapeHtml(displayName);
  const safeOwner = escapeHtml(String(ownerName || "The device owner").trim());
  const safeDeviceName = escapeHtml(String(deviceName || deviceId).trim());
  const safeDeviceId = escapeHtml(deviceId);

  const contentHtml = `
    <p style="margin:0 0 16px; color:#475569; font-size:15px; line-height:1.7;">Hello ${safeName},</p>
    <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.7;">
      Your access to <strong>${safeDeviceName}</strong> (${safeDeviceId}) has been removed by <strong>${safeOwner}</strong>.
    </p>

    <div style="border:1px solid #fecdd3; border-radius:14px; background-color:#fff1f2; padding:18px 20px; margin-bottom:22px; color:#9f1239; font-size:13px; line-height:1.6;">
      You will no longer be able to monitor or control this water tank device.
    </div>

    <p style="margin:0; color:#64748b; font-size:13px; line-height:1.6;">
      If you believe this was done in error, please contact the device admin.
    </p>
  `;

  const html = renderEmailLayout({
    heading: "Your Smart Water device access was removed",
    contentHtml,
  });

  const text = [
    `Hello ${displayName},`,
    "",
    `Your access to:`,
    `${deviceName}`,
    `Device: ${deviceId}`,
    "",
    `has been removed by ${ownerName}.`,
    "",
    "You will no longer be able to monitor or control this device.",
    "",
    "Smart Water Management",
  ].join("\n");

  const subject = "Your Smart Water device access was removed";
  const from = process.env.EMAIL_FROM || '"Smart Water" <no-reply@example.com>';

  return getTransporter().sendMail({ from, to: email, subject, html, text });
}
