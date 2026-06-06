const FORBIDDEN_PRODUCTION_SECRETS = new Set([
  "serveaso-test-push-secret",
  "change-me-in-production",
  "change-me",
]);

function assertProductionEnv(name, value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error(`${name} is required when NODE_ENV=production`);
  }
  if (FORBIDDEN_PRODUCTION_SECRETS.has(trimmed)) {
    throw new Error(`${name} must not use a dev/default value in production`);
  }
  return trimmed;
}

/**
 * Fail fast at startup if production is misconfigured (S4).
 */
function validateUtilsProductionSecrets() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  assertProductionEnv("ADMIN_PUSH_SECRET", process.env.ADMIN_PUSH_SECRET);
}

module.exports = { validateUtilsProductionSecrets, FORBIDDEN_PRODUCTION_SECRETS };
