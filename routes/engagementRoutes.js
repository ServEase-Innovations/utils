// routes/engagementRoutes.js
const express = require('express');
const { getAllEngagements } = require('../services/engagementService'); // Import the service

const router = express.Router();

// Define a route to get all engagement records
router.get('/engagements', async (req, res) => {
  try {
    const engagements = await getAllEngagements(); // Fetch data from the database
    res.status(200).json(engagements); // Send the rows as JSON response
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch engagement data' });
  }
});

module.exports = router;
