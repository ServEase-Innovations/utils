require("dotenv").config();

/** Verified ServEaso outbound sender when env vars are unset (SES / SendGrid). */
const DEFAULT_OUTBOUND_SENDER = "info@serveaseinnovation.com";

function resolveOutboundSenderEmail() {
  return (
    process.env.SENDER_EMAIL?.trim() ||
    process.env.CONTACT_US_FROM?.trim() ||
    process.env.DEPLOY_NOTIFY_FROM?.trim() ||
    DEFAULT_OUTBOUND_SENDER
  );
}

module.exports = {
  SES_REGION: process.env.AWS_SES_REGION || "ap-south-1",
  SENDER_EMAIL: resolveOutboundSenderEmail(),
  DEFAULT_OUTBOUND_SENDER,
  resolveOutboundSenderEmail,
};
