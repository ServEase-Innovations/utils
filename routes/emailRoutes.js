// routes/emailRoutes.js
const express = require('express');
const emailService = require('../services/emailService');

const router = express.Router();

// Email service route
router.post('/send-email', async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  try {
    const result = await emailService.sendEmail(email, name);
    res.status(200).json({ message: 'Email sent successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
