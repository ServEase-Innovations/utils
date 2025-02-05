const express = require('express');
const { sendBookingEmail } = require('../services/bookingemailService');

const router = express.Router();

// POST route to send booking email
router.post('/', async (req, res) => {
    const { email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber } = req.body;

    if (!email || !userName || !serviceType || !spName || !dateTime || !confirmCode || !phoneNumber) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const data = await sendBookingEmail(email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber);
        res.status(200).json({ message: 'Booking email sent successfully!', data: data });
    } catch (error) {
        res.status(500).json({ error: 'Error sending email', details: error.message });
    }
});

module.exports = router;
