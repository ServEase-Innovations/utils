const fs = require("fs");
const path = require("path");

/** Package root (services/utils), independent of process.cwd() */
const UTILS_ROOT = path.resolve(__dirname, "..");

let admin = null;
let initialized = false;
let loadError = null;

function resolveCredentialPath(filePath) {
  if (!filePath) return null;
  const trimmed = String(filePath).trim();
  if (!trimmed) return null;
  return path.isAbsolute(trimmed) ? trimmed : path.join(UTILS_ROOT, trimmed);
}

function getLocalCredentialCandidates() {
  return [
    resolveCredentialPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
    path.join(UTILS_ROOT, "secrets", "firebase-service-account.json"),
    path.join(UTILS_ROOT, "firebase-service-account.json"),
  ];
}

function getAdmin() {
  if (admin) return admin;
  if (loadError) return null;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    admin = require("firebase-admin");
    return admin;
  } catch (err) {
    loadError = err;
    console.error(
      "[fcm] firebase-admin is not installed. From repo root run: npm install"
    );
    return null;
  }
}

function parseServiceAccountJson(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.startsWith("{")
    ? JSON.parse(trimmed)
    : JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
}

function initFromServiceAccountFile(filePath, firebaseAdmin) {
  const resolved = resolveCredentialPath(filePath) || path.resolve(filePath);
  if (!fs.existsSync(resolved)) return false;
  const cred = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(cred) });
  }
  console.log("[fcm] Firebase Admin initialized from file:", resolved);
  return true;
}

function initFirebaseAdmin() {
  if (initialized) return true;

  const firebaseAdmin = getAdmin();
  if (!firebaseAdmin) return false;

  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const jsonPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    if (jsonRaw && String(jsonRaw).trim()) {
      const cred = parseServiceAccountJson(jsonRaw);
      firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(cred) });
      console.log("[fcm] Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON");
      initialized = true;
      return true;
    }
    const gacPath = resolveCredentialPath(jsonPath);
    if (gacPath && initFromServiceAccountFile(gacPath, firebaseAdmin)) {
      initialized = true;
      return true;
    }
    for (const candidate of getLocalCredentialCandidates()) {
      if (initFromServiceAccountFile(candidate, firebaseAdmin)) {
        initialized = true;
        return true;
      }
    }
  } catch (err) {
    console.error("[fcm] Firebase Admin init failed:", err.message);
    return false;
  }

  const tried = getLocalCredentialCandidates();
  console.warn(
    "[fcm] Firebase credentials missing — push send disabled. " +
      "Add firebase-service-account.json under services/utils or set " +
      "GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_JSON in .env.development. " +
      `Tried: ${tried.join(", ")}`
  );
  return false;
}

function isFcmReady() {
  return initFirebaseAdmin();
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string[]} opts.tokens
 * @param {Record<string, string>} [opts.data]
 */
async function sendToTokens({ title, body, tokens, data = {} }) {
  if (!isFcmReady()) {
    const hint = loadError
      ? "Run `npm install` from the Serveaso-BE repo root (workspaces)."
      : "Set FIREBASE_SERVICE_ACCOUNT_JSON on the utils service.";
    throw new Error(`Firebase Admin is not configured. ${hint}`);
  }
  const firebaseAdmin = getAdmin();
  const unique = [...new Set((tokens || []).filter(Boolean))];
  if (!unique.length) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const message = {
    notification: { title: String(title || "Serveaso"), body: String(body || "") },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [String(k), String(v ?? "")])
    ),
    tokens: unique,
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
    android: {
      priority: "high",
      notification: {
        channelId: "serveaso_default",
        sound: "default",
        icon: "ic_stat_serveaso",
        color: "#0B7DD9",
      },
    },
  };

  const res = await firebaseAdmin.messaging().sendEachForMulticast(message);
  return {
    successCount: res.successCount,
    failureCount: res.failureCount,
    responses: res.responses,
  };
}

module.exports = { initFirebaseAdmin, isFcmReady, sendToTokens };
