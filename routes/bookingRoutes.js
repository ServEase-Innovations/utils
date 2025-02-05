const express = require('express');
const sendgrid = require('@sendgrid/mail');
const router = express.Router();

// Set your SendGrid API key
sendgrid.setApiKey('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');

// Mail sending endpoint
router.post('/sendbmail', async (req, res) => {
    try {
        const { to, firstName, serviceType, spName, dateTime, confirmCode, phoneNumber } = req.body;

        if (!to || !firstName || !serviceType || !spName || !dateTime || !confirmCode || !phoneNumber) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const mailOptions = {
            from: 'ServEaso <ronit.maity@serveaseinnovation.com>',
            to: to,
            subject: `Your ${serviceType} Service Appointment Confirmation`,
            templateId: 'd-8d3a74a3e23d4de5a569007b280570c7', // Your dynamic template ID
            dynamic_template_data: {
                name: firstName,
                serviceType: serviceType,
                spName: spName,
                dateTime: dateTime,
                confirmCode: confirmCode,
                phoneNumber: phoneNumber
            }
        };

        const response = await sendgrid.send(mailOptions);
        res.status(200).json({ message: 'Email sent successfully', statusCode: response[0].statusCode });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

module.exports = router;
