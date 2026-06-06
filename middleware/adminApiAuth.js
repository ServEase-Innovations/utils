/** Dev-only fallback — must match payments internal routes in development. */
const DEV_ADMIN_SECRET = "serveaso-test-push-secret";

function resolveExpectedAdminSecret() {
  const fromEnv = (
    process.env.ADMIN_PUSH_SECRET ||
    process.env.ADMIN_API_SECRET ||
    ""
  ).trim();
  if (fromEnv) {
    return fromEnv;
  }
  if ((process.env.NODE_ENV || "development") === "development") {
    return DEV_ADMIN_SECRET;
  }
  return "";
}

/**
 * Protect admin / destructive utils routes (S3).
 * Send header: X-Admin-Push-Secret (same value as ADMIN_PUSH_SECRET).
 */
function requireAdminApiAuth(req, res, next) {
  const provided = String(
    req.headers["x-admin-push-secret"] || req.headers["x-admin-api-secret"] || ""
  ).trim();
  const expected = resolveExpectedAdminSecret();
  if (!expected || provided !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

module.exports = { requireAdminApiAuth, resolveExpectedAdminSecret };
