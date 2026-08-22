import nodemailer from "nodemailer";

const SMTP_MODE = "smtp";
const BREVO_MODE = "brevo";
const CONSOLE_MODE = "console";

function configurationError(message) {
  const error = new Error(`Email configuration error: ${message}`);
  error.code = "EMAIL_CONFIG_INVALID";
  return error;
}

function getEmailMode() {
  const mode = (process.env.EMAIL_MODE || "").trim().toLowerCase();

  if (mode === BREVO_MODE || (!mode && (process.env.BREVO_API_KEY || process.env.SIB_API_KEY))) {
    return BREVO_MODE;
  }

  if (mode === SMTP_MODE) {
    return SMTP_MODE;
  }

  if (mode === CONSOLE_MODE || !mode) {
    return CONSOLE_MODE;
  }

  throw configurationError('EMAIL_MODE must be either "smtp", "brevo", or "console".');
}

function parsePort() {
  const rawPort = (process.env.SMTP_PORT || "587").trim();
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw configurationError("SMTP_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function parseSecure(port) {
  const rawSecure = process.env.SMTP_SECURE?.trim().toLowerCase();

  if (rawSecure && !["true", "false"].includes(rawSecure)) {
    throw configurationError('SMTP_SECURE must be either "true" or "false".');
  }

  const requestedSecure = rawSecure ? rawSecure === "true" : port === 465;

  // Port 465 uses implicit TLS. Port 587 starts plain and upgrades with STARTTLS.
  if (port === 465) {
    return true;
  }

  if (port === 587) {
    return false;
  }

  return requestedSecure;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  let pass = process.env.SMTP_PASS?.trim();
  const port = parsePort();
  const secure = parseSecure(port);
  const missing = [];

  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  if (missing.length > 0) {
    throw configurationError(`missing required variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  }

  // Google displays app passwords in groups. Whitespace is not part of the password.
  if (host.toLowerCase() === "smtp.gmail.com") {
    pass = pass.replace(/\s+/g, "");
  }

  return {
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: "TLSv1.2",
    },
  };
}

function createBrevoTransporter() {
  const apiKey = (process.env.BREVO_API_KEY || process.env.SIB_API_KEY || "").trim();
  if (!apiKey) {
    throw configurationError("BREVO_API_KEY is required when using Brevo mode.");
  }

  return {
    sendMail: async ({ from, to, subject, html, text }) => {
      let senderEmail = process.env.EMAIL_FROM?.trim() || "royeid984@gmail.com";
      let senderName = "Smart Water";

      if (from && typeof from === "string") {
        const match = from.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)$/);
        if (match) {
          senderName = match[1] || senderName;
          senderEmail = match[2] || senderEmail;
        } else if (from.includes("@")) {
          senderEmail = from;
        }
      }

      const recipients = Array.isArray(to) ? to : [to];
      const toFormatted = recipients.map((r) => {
        if (typeof r === "string") return { email: r.trim() };
        return r;
      });

      const payload = {
        sender: { name: senderName, email: senderEmail },
        to: toFormatted,
        subject,
        htmlContent: html,
        textContent: text,
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(`Brevo API Error (${response.status}): ${data.message || response.statusText}`);
        error.status = response.status;
        error.details = data;
        throw error;
      }

      console.log(`[EMAIL] Sent successfully via Brevo API to: ${toFormatted.map(t => t.email).join(", ")}`);
      return { messageId: data.messageId || "brevo-success" };
    },
  };
}

function createConsoleTransporter() {
  return {
    sendMail: async (mailOptions) => {
      const isProduction = process.env.NODE_ENV === "production";

      console.log("=== EMAIL SENT IN CONSOLE MODE ===");
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);

      // Codes and action links are useful locally, but must never appear in production logs.
      if (!isProduction) {
        console.log(`Body (HTML/Text):\n${mailOptions.text || mailOptions.html}`);
      } else {
        console.log("Body: [Redacted in Production]");
      }

      console.log("==================================");
      return { messageId: "console-mock-id" };
    },
  };
}

export function createEmailTransporter({ requireSmtp = false } = {}) {
  const mode = getEmailMode();

  if (mode === BREVO_MODE) {
    return createBrevoTransporter();
  }

  if (mode === SMTP_MODE) {
    return nodemailer.createTransport(getSmtpConfig());
  }

  if (requireSmtp) {
    throw configurationError('EMAIL_MODE must be "smtp" or "brevo" before live email dispatch can run.');
  }

  return createConsoleTransporter();
}

export function getEmailConfigSummary() {
  const mode = getEmailMode();
  const port = process.env.SMTP_PORT?.trim() || "(missing; default would be 587)";
  let secure = process.env.SMTP_SECURE?.trim() || "(missing; inferred from port)";

  if (port === "465") secure = "true (implicit TLS on port 465)";
  if (port === "587") secure = "false (STARTTLS required on port 587)";

  return {
    emailMode: mode,
    brevoApiKey: (process.env.BREVO_API_KEY || process.env.SIB_API_KEY) ? "(configured; redacted)" : "(missing)",
    smtpHost: process.env.SMTP_HOST?.trim() || "(missing)",
    smtpPort: port,
    smtpSecure: secure,
    smtpUser: process.env.SMTP_USER ? "(configured)" : "(missing)",
    smtpPass: process.env.SMTP_PASS ? "(configured; redacted)" : "(missing)",
    emailFrom: process.env.EMAIL_FROM ? "(configured)" : "(missing)",
  };
}
