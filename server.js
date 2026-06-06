// Load .env.development / .env before any route reads process.env
require("./config/config.js");

const { initFirebaseAdmin } = require("./services/fcm.service");
initFirebaseAdmin();

const { requireAuth0ManagementConfig } = require("./lib/auth0Management");
const { validateUtilsProductionSecrets } = require("./config/validateProductionSecrets");

try {
  if (process.env.NODE_ENV === "production") {
    requireAuth0ManagementConfig();
    validateUtilsProductionSecrets();
  }
} catch (err) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Production startup validation failed:", err.message);
    process.exit(1);
  }
  console.warn(
    "⚠️",
    err.message,
    "— POST /authO will return 503 until AUTH0_* env vars are set."
  );
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const { Server } = require('ws');
const { Client } = require('pg');
const { getRecords, getRecordById, addRecord, updateRecord, uploadExcel, deleteAll, deleteRecord , getUserSettingsRecords , getUserSettingsById , addSettings , deleteUserPreferenceRecord ,updateUserSettings , deleteUserSettings , deleteAlUserPreference , createAuth0User  , deleteAdmin , updateAdmin , getAllAdmins, getPlatformSettings, getPublicPlatformSettings, upsertPlatformSettings, pingMongoForStatus} = require('./controllers/mongoDBControllers');
const { requireAdminApiAuth } = require("./middleware/adminApiAuth");
const axios = require('axios');
const emailRoutes = require('./routes/emailRoutes');
const bookemailRoutes = require('./routes/bookingemailRoutes');
const rescheduleEmailRoutes = require('./routes/rescheduleEmailRoutes');
const cancelEmailRoutes = require('./routes/cancelEmailRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const pushRoutes = require('./routes/pushRoutes');
const { connectToDB } = require('./controllers/mongoDBControllers');
const multer = require('multer');
const xlsx = require('xlsx');
const Razorpay = require('razorpay');
const http = require('http'); 
const { ObjectId } = require('mongodb');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const {
  normalizeUsername,
  hashUsername,
  hashPassword,
  verifyPassword,
  findUserByUsername,
  publicUserFields,
} = require("./lib/userCredentials");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const config = require("./config/config.js");
const { logger } = require("./logger");
const requestMetrics = require("./monitoring/requestMetrics");
const { getMetrics, metricsContentType } = require("./monitoring/prometheus");

const app = express();
const appForEmail = express();
// Defaults avoid clashes with other monorepo services (preferences:3001, providers:4000, etc.)
const port = Number(process.env.PORT) || 3030;
const emailPort = Number(process.env.UTILS_EMAIL_PORT) || 4030;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { Pool } = require("pg");

const pool = new Pool({
  host: config.postgres.host,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  port: config.postgres.port,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

app.get('/api/public', (req, res) => {
  res.json({ message: 'Hello from a public endpoint!' });
});

// Protected route
app.get('/api/protected', checkJwt, (req, res) => {
  res.json({ message: 'Hello from a protected endpoint!', user: req.auth });
});

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret })
    : null;

// Middleware
app.use(cors());
app.use(requestMetrics);
app.use(bodyParser.json());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/send-email', emailRoutes);
app.use('/api/push', pushRoutes);
app.get('/records', requireAdminApiAuth, async (req, res) => {
  const records = await getRecords();
  res.json(records);
});

app.use("/authO", createAuth0User);

app.delete("/users/:id", requireAdminApiAuth, deleteAdmin);

app.put("/users/:id", requireAdminApiAuth, updateAdmin);

app.get("/users", requireAdminApiAuth, getAllAdmins);

app.get('/user-settings', requireAdminApiAuth, async (req, res) => {
  const records = await getUserSettingsRecords();
  res.json(records);
});

app.get('/user-settings/:id', requireAdminApiAuth, async (req, res) => {

  const recordId = req.params.id;
  const record = await getUserSettingsById(recordId);
  if (record) {
    return res.status(200).json(record);
  } else {
    return res.status(404).json({ message: 'Record not found' });
  }
});

app.post('/authO', createAuth0User);
app.post('/records', requireAdminApiAuth, async (req, res) => {
  const recordData = req.body;
  try {
    const result = await addRecord(recordData);
    res.status(201).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/user-settings', requireAdminApiAuth, async (req, res) => {
  const recordData = req.body;
  try {
    const result = await addSettings(recordData);
    res.status(201).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.put('/user-settings/:id', requireAdminApiAuth, updateUserSettings);
app.delete('/user-settings/:id', requireAdminApiAuth, deleteUserSettings);
app.delete('/user-settings/delete-all', requireAdminApiAuth, deleteAlUserPreference);

app.get('/records/:id', requireAdminApiAuth, async (req, res) => {
  const recordId = req.params.id;
  if (!ObjectId.isValid(recordId)) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const record = await getRecordById(recordId);
  if (record) {
    return res.status(200).json(record);
  } else {
    return res.status(404).json({ message: 'Record not found' });
  }
});


app.put('/records/:id', requireAdminApiAuth, updateRecord);
app.delete('/records/:id', requireAdminApiAuth, deleteRecord);
app.post('/upload', requireAdminApiAuth, upload.single('file'), uploadExcel);
app.delete('/delete-all', requireAdminApiAuth, deleteAll);

app.get("/metrics", async (req, res, next) => {
  try {
    res.set("Content-Type", metricsContentType);
    res.end(await getMetrics());
  } catch (err) {
    next(err);
  }
});

// --- Platform settings ---
/** Public: cancellation policy for customer bookings UI */
app.get("/api/platform-settings/public", async (req, res) => {
  try {
    const settings = await getPublicPlatformSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error("GET /api/platform-settings/public:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to load settings" });
  }
});

app.get("/api/platform-settings", requireAdminApiAuth, async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error("GET /api/platform-settings:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to load settings" });
  }
});

app.put("/api/platform-settings", requireAdminApiAuth, async (req, res) => {
  try {
    const settings = await upsertPlatformSettings(req.body);
    res.json({ success: true, settings });
  } catch (err) {
    console.error("PUT /api/platform-settings:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save settings" });
  }
});

/**
 * GET remote monorepo service — tries common health/docs paths.
 * @param {string} id
 * @param {string} label
 * @param {string} baseUrl
 * @param {string[]} [pathCandidates]
 */
async function probeHttpService(id, label, baseUrl, pathCandidates) {
  const candidates = pathCandidates && pathCandidates.length
    ? pathCandidates
    : ["/health", "/metrics", "/api-docs", "/_whoami", "/"];
  const b = (baseUrl || "").trim().replace(/\/$/, "");
  if (!b) {
    return { id, label, status: "skipped", detail: "Set service URL in env to probe" };
  }
  let lastDetail = "unreachable";
  for (const p of candidates) {
    try {
      const r = await axios.get(`${b}${p}`, { timeout: 4500, validateStatus: () => true, maxRedirects: 2 });
      if (r.status >= 200 && r.status < 500) {
        return {
          id,
          label,
          status: r.status < 400 ? "ok" : "degraded",
          detail: `${p} → HTTP ${r.status}`,
        };
      }
      lastDetail = `${p} → HTTP ${r.status}`;
    } catch (e) {
      lastDetail = e.code || e.message || "error";
    }
  }
  return { id, label, status: "error", detail: String(lastDetail) };
}

app.get("/api/platform-status", requireAdminApiAuth, async (req, res) => {
  const env = process.env.NODE_ENV || "development";
  const payBase = (process.env.PAYMENTS_SERVICE_URL || "http://127.0.0.1:4100").replace(/\/$/, "");
  const providersBase = (process.env.PROVIDERS_SERVICE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
  const preferencesBase = (process.env.PREFERENCES_SERVICE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
  const couponsBase = (process.env.COUPONS_SERVICE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
  const reviewsBase = (process.env.REVIEWS_SERVICE_URL || "http://127.0.0.1:5005").replace(/\/$/, "");
  const chatBase = (process.env.CHAT_SERVICE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
  const notificationsBase = (process.env.NOTIFICATIONS_SERVICE_URL || "").trim().replace(/\/$/, "");
  const packages = (() => {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require("./package.json");
    } catch {
      return { version: "1.0.0" };
    }
  })();

  const services = [];

  services.push({
    id: "utils",
    label: "Utils API (this process)",
    status: "ok",
    detail: `this process, port ${port}`,
  });

  try {
    await pool.query("SELECT 1");
    services.push({ id: "postgres", label: "PostgreSQL", status: "ok", detail: "query ok" });
  } catch (e) {
    services.push({ id: "postgres", label: "PostgreSQL", status: "error", detail: e?.message || "unreachable" });
  }

  const mongo = await pingMongoForStatus();
  services.push({
    id: "mongo",
    label: "MongoDB (catalog & settings)",
    status: mongo.ok ? "ok" : "error",
    detail: mongo.message,
  });

  const [
    paymentsH,
    providersH,
    preferencesH,
    couponsH,
    reviewsH,
    chatH,
  ] = await Promise.all([
    probeHttpService("payments", "Payments API", payBase, ["/health", "/metrics", "/"]),
    probeHttpService("providers", "Providers API", providersBase, ["/api-docs", "/api-docs/", "/health", "/"]),
    probeHttpService("preferences", "Preferences API", preferencesBase, ["/health", "/metrics", "/_whoami", "/"]),
    probeHttpService("coupons", "Coupons API", couponsBase, ["/health", "/metrics", "/"]),
    probeHttpService("reviews", "Reviews API", reviewsBase, ["/health", "/metrics", "/api-docs", "/"]),
    probeHttpService("chat", "Chat / support API", chatBase, ["/health", "/api-docs", "/metrics", "/"]),
  ]);
  services.push(paymentsH, providersH, preferencesH, couponsH, reviewsH, chatH);

  if (notificationsBase) {
    services.push(
      await probeHttpService("notifications", "Notifications API", notificationsBase, ["/health", "/metrics", "/"])
    );
  } else {
    services.push({
      id: "notifications",
      label: "Notifications API",
      status: "skipped",
      detail: "set NOTIFICATIONS_SERVICE_URL to probe (optional)",
    });
  }

  const hasEmail = Boolean(
    process.env.SENDGRID_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_PORT) ||
      process.env.AWS_SES_REGION
  );
  services.push({
    id: "email",
    label: "Email (outbound, utils)",
    status: hasEmail ? "ok" : "limited",
    detail: hasEmail ? "SMTP / Sendgrid / SES configured" : "not configured in utils env",
  });

  res.json({
    success: true,
    environment: env,
    appVersion: packages.version || "1.0.0",
    service: "utils",
    serviceUrls: {
      payments: payBase || null,
      providers: providersBase || null,
      preferences: preferencesBase || null,
      coupons: couponsBase || null,
      reviews: reviewsBase || null,
      chat: chatBase || null,
      notifications: notificationsBase || null,
    },
    services,
  });
});

// ✅ Create an HTTP server and use it for both Express and WebSocket
const server = http.createServer(app);

server.listen(port, () => {
  logger.info("utils_main_server_started", { port, metrics: "/metrics" });
  console.log(`Utils main server (HTTP + WebSocket): http://localhost:${port}`);
});

// Secondary HTTP app (email send routes); scale out separately in production if needed
appForEmail.use(cors());
appForEmail.use(requestMetrics);
appForEmail.use(bodyParser.json());
appForEmail.use(express.json());
appForEmail.use(express.urlencoded({ extended: true }));
appForEmail.use(express.static('views'));
appForEmail.use('/send-cancel-email', cancelEmailRoutes);
appForEmail.use('/send-reschedule-email', rescheduleEmailRoutes);
appForEmail.use('/send-booking-email', bookemailRoutes); 

// Endpoint to create an order
app.post('/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay is not configured; set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      });
    }
    const { amount } = req.body; // Get amount from the frontend (in paise, e.g., 10000 for ₹100)

    const options = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${new Date().getTime()}`,
      payment_capture: 1,
    };

    // Create order
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const emailServer = http.createServer(appForEmail);
emailServer.listen(emailPort, () => {
  logger.info("utils_email_server_started", { port: emailPort });
  console.log(`Utils email HTTP app: http://localhost:${emailPort}`);
});



// ✅ WebSocket server now correctly uses the HTTP server
const wss = new Server({ server });
const connectedNumbers = new Map();


wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed?.type === "IDENTIFY" && parsed?.id) {
        const idKey = String(parsed.id); // normalize ID
        connectedNumbers.set(idKey, ws);
        console.log(`✅ Client ${idKey} identified and connected`);

        // Send confirmation immediately so client can test onmessage
        ws.send(
          JSON.stringify({
            type: "CONFIRM_IDENTIFY",
            message: `You are now registered as ${idKey}`,
          })
        );
      } else {
        console.warn("⚠️ Unknown message format:", parsed);
      }
    } catch (err) {
      console.error("❌ Failed to parse message:", err);
    }
  });

  ws.on("close", () => {
    for (const [key, value] of connectedNumbers.entries()) {
      if (value === ws) {
        connectedNumbers.delete(key);
        console.log(`🛑 Client ${key} disconnected`);
        break;
      }
    }
  });

  ws.on("error", (err) => {
    console.error("⚠️ WebSocket error:", err);
  });
});

// Dedicated Postgres client for LISTEN/NOTIFY
(async () => {
  const pgClient = new Client({
    host: config.postgres.host,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  port: config.postgres.port,
  });

  await pgClient.connect();
  await pgClient.query("LISTEN engagement_insert");

  console.log("📡 Listening to engagement_insert notifications...");

  pgClient.on("notification", (msg) => {
    console.log("🔍 Raw PG payload:", msg.payload);

    try {
      const payload = JSON.parse(msg.payload);
      const serviceProviderId = String(payload.serviceproviderid);

      console.log("📨 New notification for:", serviceProviderId);

      const targetWs = connectedNumbers.get(serviceProviderId);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(
          JSON.stringify({
            type: "NEW_BOOKING",
            message: `New booking assigned to you`,
            bookingId: payload.bookingid ?? null,
          })
        );
        console.log(`✅ Sent message to provider ${serviceProviderId}`);
      } else {
        console.log(`⚠️ No active WebSocket for provider ${serviceProviderId}`);
      }
    } catch (err) {
      console.error("❌ Failed to handle notification payload:", err);
    }
  });

  pgClient.on("error", (err) => {
    console.error("❌ PostgreSQL error:", err);
  });
})();

const { lookupUserByEmail } = require("./lib/checkEmailLookup.js");

app.get("/customer/check-email", async (req, res) => {
  try {
    const result = await lookupUserByEmail(pool, req.query.email);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json(result.body);
  } catch (err) {
    console.error("❌ Error checking customer email:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/** Align serviceprovider.emailid with Auth0 login (e.g. after legacy registration). */
app.post("/customer/link-auth0-email", async (req, res) => {
  const { normalizeLoginEmail } = require("./lib/checkEmailLookup.js");
  const email = normalizeLoginEmail(req.body?.email);
  const spId = Number(req.body?.serviceProviderId);
  const mobile = String(req.body?.mobile ?? "").replace(/\D/g, "");

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  try {
    let updated = false;
    if (Number.isFinite(spId) && spId > 0) {
      const r = await pool.query(
        `UPDATE serviceprovider SET emailid = $1
         WHERE serviceproviderid = $2
         RETURNING serviceproviderid`,
        [email, spId]
      );
      updated = r.rowCount > 0;
    } else if (mobile.length === 10) {
      const r = await pool.query(
        `UPDATE serviceprovider SET emailid = $1
         WHERE mobileno::text = $2 OR mobileno = $2::bigint
         RETURNING serviceproviderid`,
        [email, mobile]
      );
      updated = r.rowCount > 0;
    }

    if (!updated) {
      return res.status(404).json({
        error: "No service provider updated. Pass serviceProviderId or mobile.",
      });
    }

    const result = await lookupUserByEmail(pool, email);
    return res.json(result.body);
  } catch (err) {
    console.error("link-auth0-email error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


const users = {
  admin: {
    password: "admin123",
    secret: speakeasy.generateSecret({ name: "Servease Admin" }).base32
  }
};

const mongoUri = process.env.MONGO_URI?.trim();
if (!mongoUri) {
  console.error("❌ MONGO_URI is not set (services/utils/.env.development)");
  process.exit(1);
}
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.post("/api/reset-password", async (req, res) => {
  const { username, token, newPassword } = req.body;

  if (!username || !token || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await findUserByUsername(User, username);
  if (
    !user ||
    user.resetPasswordToken !== hashedToken ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires <= Date.now()
  ) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  user.hashedPassword = await hashPassword(newPassword);

  // Clear reset fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});


app.post("/api/register", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const usernameKey = hashUsername(username);
  const existing = await User.findOne({
    $or: [{ usernameKey }, { username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }],
  });
  if (existing) {
    return res.status(400).json({ message: "User already exists" });
  }

  const secret = speakeasy.generateSecret({ name: `Servease (${username})` });
  const hashedPassword = await hashPassword(password);

  const user = new User({
    usernameKey,
    hashedPassword,
    totpSecret: secret.base32,
  });

  await user.save();

  const qr = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ message: "Registered", qr, username });
});


app.post("/api/2fa/verify", async (req, res) => {
  const { username, token } = req.body;

  const user = await findUserByUsername(User, username);
  if (!user) return res.status(400).json({ message: "User not found" });

  const verified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  res.json({ message: "2FA verified successfully", role: user.role });
});


app.post("/api/login", async (req, res) => {
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const user = await findUserByUsername(User, username);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await verifyPassword(user, password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Step 1: password verified (stored as bcrypt hash); proceed to 2FA
  return res.status(200).json({
    message: "2FA required",
    ...publicUserFields(user),
  });
});



app.post("/api/verify", async (req, res) => {
  const { username, token } = req.body;
  console.log("Verifying:", username, token);

  const user = await findUserByUsername(User, username);
  if (!user || !user.totpSecret) {
    return res.status(400).json({ message: "User not found or 2FA not configured" });
  }

  const isVerified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!isVerified) {
    return res.status(401).json({ message: "Invalid token" });
  }

  return res.json({ message: "2FA verification successful" });
});




app.post("/api/verify-token", async (req, res) => {
  const { username, token } = req.body;

  const user = await findUserByUsername(User, username);
  if (!user) return res.status(400).json({ message: "User not found" });

  if (!user.totpSecret) {
    return res.status(400).json({ message: "2FA not configured" });
  }

  const verified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // basic rate limit
    return res.status(400).json({ message: "Invalid token" });
  }

  res.json({
    message: "2FA verified successfully",
    role: user.role,
    userId: user._id
  });
});



// Handle any uncaught exceptions in the application
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

