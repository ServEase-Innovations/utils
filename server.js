const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const emailRoutes = require('./routes/emailRoutes'); // Import email routes

const app = express();

// Use CORS middleware (Allow all origins by default)
app.use(cors());

// Middleware to parse JSON data
app.use(bodyParser.json());

// Serve static files (for the front-end)
app.use(express.static('public'));

// Use email routes
app.use('/send-email', emailRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
