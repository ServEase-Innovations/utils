const express = require('express');
const sendgrid = require('@sendgrid/mail');
const bodyParser = require('body-parser');

const app = express();

// Set SendGrid API Key
sendgrid.setApiKey('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');

// Middleware to parse JSON data
app.use(bodyParser.json());

// Serve static files (for the front-end)
app.use(express.static('public'));

// POST route to send email
app.post('/send-email', (req, res) => {
  const { email, name } = req.body; // Get user data from the request body

  // Check if email and name are provided
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  const mailOptions = {
    from: 'ServEaso <ronit.maity@serveaseinnovation.com>', // Sender address
    to: email, // Recipient's email address
    subject: 'Welcome!', // Subject line
    templateId: 'd-8d3a74a3e23d4de5a569007b280570c7', // Dynamic template ID
    dynamic_template_data: {
      name: name, // Pass dynamic data (name) into the template
    },
  };

  // Send the email
  sendgrid
    .send(mailOptions)
    .then(() => {
      res.status(200).json({ message: 'Email sent successfully!' });
    })
    .catch((error) => {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Error sending email', details: error });
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
