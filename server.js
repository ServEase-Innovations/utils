const express = require('express');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses'); // Importing AWS SDK v3 modules
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure AWS SES v3 client
const sesClient = new SESClient({
  region: 'ap-south-1', // Your SES region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Use CORS middleware (Allow all origins by default)
app.use(cors()); // This will allow all origins by default. If you want to restrict, you can configure it

// Middleware to parse JSON data
app.use(bodyParser.json());

// Serve static files (for the front-end)
app.use(express.static('public'));

// POST route to send email
app.post('/send-email', async (req, res) => {
  const { email, name } = req.body;

  // Check if email and name are provided
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  // Set up the email parameters
  const params = {
    Destination: {
      ToAddresses: [email], // Recipient's email address
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<p>Hello ${name},</p><p>Welcome to our service!</p>`, // Email body
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Welcome!', // Subject line
      },
    },
    Source: 'ronit.maity@serveaseinnovation.com', // Sender's email address (must be verified with SES)
    ConfigurationSetName: 'config-set-1', // If using a configuration set
  };

  try {
    // Create the SES send email command
    const command = new SendEmailCommand(params);

    // Send the email
    const data = await sesClient.send(command);

    res.status(200).json({ message: 'Email sent successfully!', data });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Error sending email', details: error });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
