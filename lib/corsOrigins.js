function parseCorsOrigins() {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    process.env.APP_URL ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.length === 0) {
    return !isProduction();
  }
  return allowedOrigins.includes(origin) || allowedOrigins.includes("*");
}

function corsOriginCallback(allowedOrigins) {
  return (origin, cb) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      return cb(null, true);
    }
    return cb(null, false);
  };
}

function assertCorsOriginsProduction() {
  if (!isProduction()) {
    return;
  }
  const origins = parseCorsOrigins();
  if (origins.length === 0) {
    throw new Error(
      "CORS_ORIGINS is required when NODE_ENV=production (comma-separated web/mobile origins)"
    );
  }
}

function createWsVerifyClient(allowedOrigins) {
  return (info, cb) => {
    const origin = info.origin;
    if (isOriginAllowed(origin, allowedOrigins)) {
      return cb(true);
    }
    return cb(false, 403, "Forbidden");
  };
}

module.exports = {
  parseCorsOrigins,
  isProduction,
  isOriginAllowed,
  corsOriginCallback,
  assertCorsOriginsProduction,
  createWsVerifyClient,
};
