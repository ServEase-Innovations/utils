const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');  // Required to serve HTML file
const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));  // assuming your HTML is in the 'public' folder

// Middleware to parse JSON bodies
app.use(express.json());

// Create a transporter using SMTP server information
let transporter = nodemailer.createTransport({
  host: 'smtp.mailer91.com',
  port: 587,
  secure: false,
  auth: {
    user: 'emailer@gelqsr.mailer91.com',
    pass: 'bUnfvruLq6LDk9Eg'
  }
});

// POST route for sending emails
app.post('/send-email', (req, res) => {
  const { to, subject, text } = req.body;

  // Check if required fields are provided
  if (!to || !subject || !text) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, text' });
  }

  let mailOptions = {
    from: '"No-reply" <No-reply@gelqsr.mailer91.com>',
    to: to,
    subject: subject,
    text: text
  };

  // Send email using the transporter
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: 'Error occurred while sending email', details: error });
    }
    res.status(200).json({ message: 'Email sent successfully', messageId: info.messageId });
  });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
