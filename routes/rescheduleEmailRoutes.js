const express = require('express');
const { sendRescheduleEmail } = require('../services/rescheduleEmailService');

const router = express.Router();

router.post('/', async (req, res) => {
    const { email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber } = req.body;

    if (!email || !userName || !serviceType || !spName || !dateTime || !confirmCode || !phoneNumber) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        await sendRescheduleEmail(email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber);
        res.status(200).json({ message: 'Reschedule email sent successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Error sending reschedule email', details: error.message });
    }
});

module.exports = router;