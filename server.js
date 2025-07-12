const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/swaggerDocs');
const { Server } = require('ws');
const { Client } = require('pg');
const { getRecords, getRecordById, addRecord, updateRecord, uploadExcel, deleteAll, deleteRecord , getUserSettingsRecords , getUserSettingsById , addSettings , deleteUserPreferenceRecord ,updateUserSettings , deleteUserSettings , deleteAlUserPreference } = require('./controllers/mongoDBControllers');
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

const app = express();
const appForEmail = express();
const port = 3000;
const emailPort = 4000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
      amount: amount * 100, // Amount in paise
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

wss.on('connection', (ws) => {
  // Handle incoming messages from the WebSocket client
  ws.on('message', (message) => {
    const number = message.toString().trim();
    console.log('Received number:', number);
    if (number) {
      connectedNumbers.set(number, ws);
      console.log('Connected numbers:', Array.from(connectedNumbers.keys()));
    }
  });

  // Handle WebSocket client closure without crashing the app
  ws.on('close', () => {
    try {
      // Try to remove the client from connectedNumbers map
      for (const [key, client] of connectedNumbers.entries()) {
        if (client === ws) {
          connectedNumbers.delete(key);
          console.log(`WebSocket client disconnected for number: ${key}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error during client disconnection:', error);
    }
  });

  // Handle WebSocket errors gracefully
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// ✅ PostgreSQL client
const pgClient = new Client({
  host: "13.203.193.7",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "serveaso",
  max: 10, // max connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 2000,
});

// pgClient.connect();

// // Listen for notifications on PostgreSQL
// pgClient.query('LISTEN engagement_insert');

// // Handle PostgreSQL notifications
// pgClient.on('notification', (msg) => {
//   try {
//     console.log('Notification received:', msg.payload);

//     const payload = JSON.parse(msg.payload);
//     const serviceProviderId = payload.serviceproviderid.toString();

//     // Check if there's an active WebSocket connection for the serviceProviderId
//     if (connectedNumbers.has(serviceProviderId)) {
//       const client = connectedNumbers.get(serviceProviderId);
//       if (client && client.readyState === WebSocket.OPEN) {
//         client.send(`New data inserted for ServiceProviderID: ${serviceProviderId}`);
//       }
//     } else {
//       console.log(`No connected client for ServiceProviderID: ${serviceProviderId}`);
//     }
//   } catch (error) {
//     console.error('Error processing notification:', error);
//   }
// });

// pgClient.on('error', (error) => {
//   console.error('PostgreSQL client error:', error);
// });

const { Pool } = require("pg");

const pool = new Pool({
  host: "13.203.193.7",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "serveaso",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

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



// Handle any uncaught exceptions in the application
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

