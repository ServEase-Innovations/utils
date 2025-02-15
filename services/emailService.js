const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SES_REGION, SENDER_EMAIL } = require('../config/emailConfig'); 

// Configure AWS SES v3 client
const sesClient = new SESClient({
  region: SES_REGION, // Use the SES region from config
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // From environment variables
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // From environment variables
  },
});

const sendEmail = async (email, name) => {
  // Set up the email parameters
  const params = {
    Destination: {
      ToAddresses: [email], // Recipient's email address
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        /* Styling omitted for brevity */
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            Welcome to ServEase – We're Glad You're Here!
        </div>
        <div class="email-body">
            <p>Hi ${name},</p>
            <p>Welcome to ServeasO! We’re excited to have you with us.</p>
            <p>Here’s what you can expect:</p>
            <p><b>Quality Service:</b> We’re committed to providing reliable and top-notch services tailored to your needs.</p>
            <p><b>Convenience:</b> Manage your requests easily through your account.</p>
            <p><b>Support You Can Rely On:</b> Our team is here to assist you every step of the way.</p>
            <a href="[Insert Link]" class="button">Get Started</a>
            <p>Cheers,</p>
            <p>ServEase Team</p>
        </div>
        <div class="email-footer">
            <div class="social-icons">
                <a href="https://www.instagram.com/YourProfile" target="_blank">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram">
                </a>
                <!-- Other social links omitted for brevity -->
            </div>
            &copy; 2025 ServEase. All rights reserved.
        </div>
    </div>
</body>
</html>`, // Email body
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Welcome!', // Subject line
      },
    },
    Source: SENDER_EMAIL, // Sender's email address from the config
    ConfigurationSetName: 'config-set-1', // If using a configuration set
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email');
  }
};

module.exports = { sendEmail };