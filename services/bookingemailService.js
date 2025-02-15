const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SES_REGION, SENDER_EMAIL } = require('../config/emailConfig');

// Configure AWS SES client
const sesClient = new SESClient({
    region: SES_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const sendBookingEmail = async (email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber) => {
    const emailBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
        .email-container { max-width: 600px; margin: 20px auto; background: #ffffff; padding: 20px; border-radius: 8px; }
        .email-header { background-color: #0683f9; color: white; text-align: center; padding: 20px; font-size: 24px; }
        .email-body { padding: 20px; color: #333; line-height: 1.6; }
        .email-footer { background-color: #f4f4f4; text-align: center; padding: 10px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            ServEaso - Your ${serviceType} Service Appointment Confirmation
        </div>
        <div class="email-body">
            <p>Dear ${userName},</p>
            <p>Your <b>${serviceType}</b> service appointment with <b>${spName}</b> is confirmed for <b>${dateTime}</b>.
                To start the service, please use the following confirmation code: <b>${confirmCode}</b>.</p>
            <p>For any assistance, feel free to call us at ${phoneNumber}.</p>
            <p>Thank you for choosing ServEaso!</p>
            <p>Cheers,</p>
            <p>ServEase Team</p>
        </div>
        <div class="email-footer">
            &copy; 2025 ServEase. All rights reserved.
        </div>
    </div>
</body>
</html>`;

    const params = {
        Destination: { ToAddresses: [email] },
        Message: {
            Body: { Html: { Charset: 'UTF-8', Data: emailBody } },
            Subject: { Charset: 'UTF-8', Data: 'Booking Confirmation - ServEase' },
        },
        Source: SENDER_EMAIL,
        ConfigurationSetName: 'config-set-1',
    };

    try {
        const command = new SendEmailCommand(params);
        await sesClient.send(command);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Error sending email');
    }
};

module.exports = { sendBookingEmail };
