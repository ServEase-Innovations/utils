const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const sgMail = require("@sendgrid/mail");
const {
  SES_REGION,
  resolveOutboundSenderEmail,
} = require("../config/emailConfig");

const DEFAULT_SUPPORT_INBOX = "info@serveaseinnovation.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveSupportRecipients() {
  const raw =
    process.env.CONTACT_US_SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_INBOX;
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function canSendViaSes() {
  return Boolean(
    resolveOutboundSenderEmail() &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function canSendViaSendGrid() {
  return Boolean(process.env.SENDGRID_API_KEY?.trim());
}

function isEmailConfigured() {
  return canSendViaSes() || canSendViaSendGrid();
}

function buildContactUsEmailContent({ name, email, message, source = "web" }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const submittedAt = new Date().toISOString();
  const safeSource = escapeHtml(source);
  const subject = `[ServEaso Contact] ${name}`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ServEaso Contact Us</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <div style="max-width: 640px; margin: 24px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background: linear-gradient(135deg, #0369a1 0%, #0f172a 100%); color: #ffffff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 20px;">New Contact Us message</h1>
      <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Submitted via ${safeSource}</p>
    </div>
    <div style="padding: 24px; color: #334155; line-height: 1.6;">
      <p style="margin: 0 0 12px;"><strong>Name:</strong> ${safeName}</p>
      <p style="margin: 0 0 12px;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
      <p style="margin: 0 0 8px;"><strong>Message:</strong></p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${safeMessage}</div>
      <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">Received at ${submittedAt}</p>
    </div>
    <div style="background: #f8fafc; padding: 12px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      ServEaso Contact Us · Reply to this email to reach the customer directly.
    </div>
  </div>
</body>
</html>`;

  const textBody = [
    "New Contact Us message",
    `Source: ${source}`,
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
    "",
    `Received at ${submittedAt}`,
  ].join("\n");

  return { subject, htmlBody, textBody, submittedAt };
}

async function sendViaSes({ from, recipients, replyTo, subject, htmlBody, textBody }) {
  const sesClient = new SESClient({
    region: process.env.AWS_SES_REGION || SES_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const params = {
    Destination: { ToAddresses: recipients },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
        Text: { Charset: "UTF-8", Data: textBody },
      },
      Subject: { Charset: "UTF-8", Data: subject },
    },
    Source: from,
    ReplyToAddresses: [replyTo],
    ...(process.env.SES_CONFIGURATION_SET
      ? { ConfigurationSetName: process.env.SES_CONFIGURATION_SET }
      : process.env.NODE_ENV === "production"
        ? { ConfigurationSetName: "config-set-1" }
        : {}),
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
  return "ses";
}

async function sendViaSendGrid({ from, recipients, replyTo, subject, htmlBody, textBody }) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY.trim());
  await sgMail.send({
    to: recipients,
    from,
    replyTo,
    subject,
    text: textBody,
    html: htmlBody,
  });
  return "sendgrid";
}

/**
 * Notify the support inbox about a Contact Us submission.
 * Uses AWS SES when configured, otherwise SendGrid.
 */
async function sendContactUsEmail({ name, email, message, source = "web" }) {
  const recipients = resolveSupportRecipients();
  if (!recipients.length) {
    throw new Error("CONTACT_US_SUPPORT_EMAIL is not configured");
  }

  const from = resolveOutboundSenderEmail();
  const { subject, htmlBody, textBody, submittedAt } = buildContactUsEmailContent({
    name,
    email,
    message,
    source,
  });

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[contact-us] Email transport not configured — logging submission in non-production:",
        { from, recipients, name, email, source, subject }
      );
      return { recipients, submittedAt, transport: "dev-log" };
    }
    throw new Error(
      "Email transport is not configured (set AWS SES credentials or SENDGRID_API_KEY)"
    );
  }

  let transport = "none";
  if (canSendViaSes()) {
    transport = await sendViaSes({
      from,
      recipients,
      replyTo: email,
      subject,
      htmlBody,
      textBody,
    });
  } else if (canSendViaSendGrid()) {
    transport = await sendViaSendGrid({
      from,
      recipients,
      replyTo: email,
      subject,
      htmlBody,
      textBody,
    });
  }

  return { recipients, submittedAt, transport };
}

module.exports = {
  sendContactUsEmail,
  resolveSupportRecipients,
  isEmailConfigured,
  resolveSenderEmail: resolveOutboundSenderEmail,
};
