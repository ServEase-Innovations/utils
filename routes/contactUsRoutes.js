const express = require("express");
const {
  sendContactUsEmail,
  isEmailConfigured,
  resolveSupportRecipients,
  resolveSenderEmail,
} = require("../services/contactUsEmailService");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    endpoint: "/api/contact-us",
    method: "POST",
    description: "Submit Contact Us form — delivers email to the support inbox.",
    emailConfigured: isEmailConfigured(),
    sender: resolveSenderEmail() || null,
    supportInbox: resolveSupportRecipients(),
    body: {
      name: "string (required)",
      email: "string (required)",
      message: "string (required)",
      source: "string (optional, e.g. web | ios)",
    },
  });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 254;
const MAX_MESSAGE_LEN = 5000;

router.post("/", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const message = String(req.body?.message ?? "").trim();
  const source = String(req.body?.source ?? "web").trim().slice(0, 32) || "web";

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: "Name, email, and message are required.",
    });
  }

  if (name.length > MAX_NAME_LEN) {
    return res.status(400).json({
      success: false,
      error: `Name must be at most ${MAX_NAME_LEN} characters.`,
    });
  }

  if (email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid email address.",
    });
  }

  if (message.length > MAX_MESSAGE_LEN) {
    return res.status(400).json({
      success: false,
      error: `Message must be at most ${MAX_MESSAGE_LEN} characters.`,
    });
  }

  try {
    const result = await sendContactUsEmail({ name, email, message, source });
    return res.status(200).json({
      success: true,
      message: "Your message has been sent to our support team.",
      submittedAt: result.submittedAt,
    });
  } catch (error) {
    console.error("[contact-us] email failed:", error?.message || error);
    return res.status(500).json({
      success: false,
      error:
        "We could not deliver your message right now. Please try again or email support@serveaso.com directly.",
    });
  }
});

module.exports = router;
