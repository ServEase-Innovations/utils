const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const { Server } = require('ws');
const { Client } = require('pg');
const { getRecords, getRecordById, addRecord, updateRecord, uploadExcel, deleteAll, deleteRecord , getUserSettingsRecords , getUserSettingsById , addSettings , deleteUserPreferenceRecord ,updateUserSettings , deleteUserSettings , deleteAlUserPreference , createAuth0User  , deleteAdmin , updateAdmin , getAllAdmins} = require('./controllers/mongoDBControllers');
const emailRoutes = require('./routes/emailRoutes');
const bookemailRoutes = require('./routes/bookingemailRoutes');
const rescheduleEmailRoutes = require('./routes/rescheduleEmailRoutes');
const cancelEmailRoutes = require('./routes/cancelEmailRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const { connectToDB } = require('./controllers/mongoDBControllers');
const multer = require('multer');
const xlsx = require('xlsx');
const Razorpay = require('razorpay');
const http = require('http'); 
require('dotenv').config();
const { ObjectId } = require('mongodb');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcrypt");
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
app.get('/records', async (req, res) => {
  const records = await getRecords();
  res.json(records);
});

app.use("/authO", createAuth0User);

app.delete("/users/:id", deleteAdmin);

app.put("/users/:id", updateAdmin);

app.get("/users",  getAllAdmins);

app.get('/user-settings', async (req, res) => {
  const records = await getUserSettingsRecords();
  res.json(records);
});

app.get('/user-settings/:id', async (req, res) => {

  const recordId = req.params.id;
  const record = await getUserSettingsById(recordId);
  if (record) {
    return res.status(200).json(record);
  } else {
    return res.status(404).json({ message: 'Record not found' });
  }
});

app.post('/authO', createAuth0User);
app.post('/records', async (req, res) => {
  const recordData = req.body;
  try {
    const result = await addRecord(recordData);
    res.status(201).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/user-settings', async (req, res) => {
  const recordData = req.body;
  try {
    const result = await addSettings(recordData);
    res.status(201).json({ message: 'Record added successfully', result });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.put('/user-settings/:id', updateUserSettings);
app.delete('/user-settings/:id', deleteUserSettings);
app.delete('/user-settings/delete-all', deleteAlUserPreference);

app.get('/records/:id', async (req, res) => {
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


app.put('/records/:id', updateRecord);
app.delete('/records/:id', deleteRecord);
app.post('/upload', upload.single('file'), uploadExcel);
app.delete('/delete-all', deleteAll);

app.get("/metrics", async (req, res, next) => {
  try {
    res.set("Content-Type", metricsContentType);
    res.end(await getMetrics());
  } catch (err) {
    next(err);
  }
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

// 🔒 Auth0 Management API credentials (store securely in .env)
const AUTH0_DOMAIN = 'dev-y0yafxo2cjqtu8y2.us.auth0.com';
const AUTH0_CLIENT_ID = 'YOUR_MANAGEMENT_CLIENT_ID';
const AUTH0_CLIENT_SECRET = 'YOUR_MANAGEMENT_CLIENT_SECRET';
const AUTH0_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`;




app.get("/customer/check-email", async (req, res) => {
  const email = req.query.email?.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required" });
  }

  try {
    // 1. Check customer
    const customerResult = await pool.query(
  `SELECT "customerid" AS id
   FROM customer
   WHERE LOWER(TRIM("emailid")) = $1
   LIMIT 1`,
  [email]
);

    if (customerResult.rowCount > 0) {
      return res.json({
        exists: true,
        id: customerResult.rows[0].id,
        user_role: "CUSTOMER",
      });
    }

    console.log(`No customer found with email: ${email.trim().toLowerCase()}`);

    // 2. Check service provider
    const spResult = await pool.query(
  `SELECT "serviceproviderid" AS id
   FROM serviceprovider
   WHERE LOWER(TRIM("emailId")) = $1
   LIMIT 1`,
  [email]
);

    if (spResult.rowCount > 0) {
      return res.json({
        exists: true,
        id: spResult.rows[0].id,
        user_role: "SERVICE_PROVIDER",
      });
    }

    const vendorResult = await pool.query(
  `SELECT "vendorid" AS id
   FROM vendor
   WHERE LOWER(TRIM("emailid")) = $1
   LIMIT 1`,
  [email]
);
if (vendorResult.rowCount > 0) {
      return res.json({
        exists: true,
        id: vendorResult.rows[0].id,
        user_role: "VENDOR",
      });
    }

    // 3. Not found
    return res.json({ exists: false });

  } catch (err) {
    console.error("❌ Error checking customer email:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


const users = {
  admin: {
    password: "admin123",
    secret: speakeasy.generateSecret({ name: "Servease Admin" }).base32
  }
};

mongoose.connect("mongodb://serveaso:serveaso@98.130.50.75:27017/?authSource=admin", {
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

  const user = await User.findOne({
    username,
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  // Hash new password
  user.hashedPassword = await bcrypt.hash(newPassword, 10);

  // Clear reset fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.json({ message: "Password reset successful" });
});


app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ message: "User already exists" });

  const secret = speakeasy.generateSecret({ name: `Servease (${username})` });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    hashedPassword,
    totpSecret: secret.base32
  });

  await user.save();

  const qr = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ message: "Registered", qr, username });
});


app.post("/api/2fa/verify", async (req, res) => {
  const { username, token } = req.body;

  const user = await User.findOne({ username });
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


app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.hashedPassword);

  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  // Step 1: Ask for 2FA
  return res.status(200).json({ message: "2FA required", userId: user._id });
});



app.post("/api/verify", async (req, res) => {
  const { username, token } = req.body;
  console.log("Verifying:", username, token);

  const user = await User.findOne({ username });
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

  const user = await User.findOne({ username });
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

