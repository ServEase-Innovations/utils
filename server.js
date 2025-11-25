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


const app = express();
const appForEmail = express();
const port = 3000;
const emailPort = 4000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const { Pool } = require("pg");

const pool = new Pool({
  host: "18.60.51.140",
  port: 5432,
  database: "serveaso",
  user: "serveaso",
  password: "serveaso",
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

const razorpay = new Razorpay({
  key_id: "rzp_test_lTdgjtSRlEwreA",
  key_secret: "g15WB8CEwaYBQ5FqpIKKMdNS",
});

// Middleware
app.use(cors());
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

// ✅ Create an HTTP server and use it for both Express and WebSocket
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Middleware for the email app (port 4000)
appForEmail.use(cors());
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

// Start the email server (port 4000)
const emailServer = http.createServer(appForEmail);
emailServer.listen(emailPort, () => {
  console.log(`Email server is running on http://localhost:${emailPort}`);
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
    host: "18.60.51.140",
    port: 5432,
    database: "serveaso",
    user: "serveaso",
    password: "serveaso",
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
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email query parameter is required" });
  }

  try {
    // Step 1: Check if user exists and get their role
    const userResult = await pool.query(
      "SELECT user_role FROM user_credentials WHERE username = $1 LIMIT 1",
      [email]
    );

    if (userResult.rowCount === 0) {
      return res.json({ exists: false });
    }

    const userRole = userResult.rows[0].user_role;

    let idResult;
    if (userRole === "CUSTOMER") {
      // Step 2a: Get ID from customer table
      idResult = await pool.query(
        "SELECT customerid AS id FROM customer WHERE emailid = $1 LIMIT 1",
        [email]
      );
    } else if (userRole === "SERVICE_PROVIDER") {
      idResult = await pool.query(
        "SELECT serviceproviderid AS id FROM serviceprovider WHERE emailid = $1 LIMIT 1",
        [email]
      );
    } else {
      return res.status(400).json({ error: "Unknown user role" });
    }

    if (idResult.rowCount === 0) {
      return res.status(404).json({ error: "User record not found in role-specific table" });
    }

    const userId = idResult.rows[0].id;

    // Step 3: Respond with combined data
    return res.json({
      id: userId,
      user_role: userRole,
    });

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

