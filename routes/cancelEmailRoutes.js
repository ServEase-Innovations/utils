const express = require('express');
const { sendCancelEmail } = require('../services/cancelEmailService');

const router = express.Router();

router.post('/', async (req, res) => {
    const { email, userName, serviceType, spName, dateTime, phoneNumber } = req.body;

    if (!email || !userName || !serviceType || !spName || !dateTime || !phoneNumber) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        await sendCancelEmail(email, userName, serviceType, spName, dateTime, phoneNumber);
        res.status(200).json({ message: 'Cancellation email sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Error sending cancellation email', details: error.message });
    }
});

module.exports = router;