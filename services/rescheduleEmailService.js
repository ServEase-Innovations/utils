const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SES_REGION, SENDER_EMAIL } = require('../config/emailConfig'); // Assuming you have this config file

const sesClient = new SESClient({
    region: SES_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const sendRescheduleEmail = async (email, userName, serviceType, spName, dateTime, confirmCode, phoneNumber) => {
    const emailBody = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background-color: #0683f9;
            color: white;
            text-align: center;
            padding: 20px;
            font-size: 24px;
        }
        .email-body {
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .email-footer {
            background-color: #f4f4f4;
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #777;
        }
        .social-icons {
            margin: 10px 0;
        }
        .social-icons a {
            margin: 0 5px;
            text-decoration: none;
        }
        .social-icons img {
            width: 24px;
            height: 24px;
            vertical-align: middle;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            margin-top: 20px;
            font-size: 16px;
            color: white;
            background-color: #0683f9;
            text-decoration: none;
            border-radius: 5px;
        }
        .button:hover {
            background-color: #0268c8;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100%;
                margin: 0;
            }
            .email-body {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            ServEaso - Your ${serviceType} Service Appointment Has Been Rescheduled
        </div>
        <div class="email-body">
            <p>Dear ${userName},</p>
            <p>We would like to inform you that your <b>${serviceType}</b> service appointment with <b>${spName}</b> has been rescheduled to <b>${dateTime}</b>.</p>
            <p>Please use the following confirmation code to start the service: <b>${confirmCode}</b>.</p>
            <p>If you need assistance, don’t hesitate to contact us at ${phoneNumber}.</p>
            <p>Thank you for choosing ServEaso!</p>
            <p>Cheers,</p>
            <p>ServEaso Team</p>
        </div>
        <div class="email-footer">
           /* ... (footer from reschedule.html) ... */
        </div>
    </div>
</body>
</html>`;

    const params = {
        Destination: { ToAddresses: [email] },
        Message: {
            Body: { Html: { Charset: 'UTF-8', Data: emailBody } },
            Subject: { Charset: 'UTF-8', Data: 'Rescheduled Appointment - ServEase' }, // Updated subject
        },
        Source: SENDER_EMAIL,
        ConfigurationSetName: 'config-set-1', // If you are using a configuration set
    };

    try {
        const command = new SendEmailCommand(params);
        await sesClient.send(command);
    } catch (error) {
        console.error('Error sending reschedule email:', error);
        throw new Error('Error sending reschedule email');
    }
};

module.exports = { sendRescheduleEmail };