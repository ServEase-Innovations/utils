/**
 * Protects admin push send endpoints.
 * Set ADMIN_PUSH_SECRET on the server and send the same value in X-Admin-Push-Secret.
 */
function adminPushAuth(req, res, next) {
  const expected = (process.env.ADMIN_PUSH_SECRET || "").trim();
  if (!expected) {
    return res.status(503).json({
      error:
        "Push admin API is not configured. Set ADMIN_PUSH_SECRET on the utils service.",
    });
  }
  const provided = String(req.headers["x-admin-push-secret"] || "").trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({
      error: "Unauthorized",
      hint: "Send header X-Admin-Push-Secret matching ADMIN_PUSH_SECRET on utils",
    });
  }
  next();
}

module.exports = { adminPushAuth };
