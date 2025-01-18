const express = require('express');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// POST route to send email
router.post('/', async (req, res) => {
  const { email, name } = req.body;

  // Check if email and name are provided
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  try {
    const emailData = await sendEmail(email, name);
    res.status(200).json({ message: 'Email sent successfully!', data: emailData });
  } catch (error) {
    res.status(500).json({ error: 'Error sending email', details: error.message });
  }
});

module.exports = router;
