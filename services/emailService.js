const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses'); // AWS SES SDK

// AWS SES configuration
const sesClient = new SESClient({
  region: 'ap-south-1', // SES region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sendEmail = async (email, name) => {
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
                  <a href="https://wa.me/YourNumber" target="_blank">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp">
                  </a>
                  <a href="https://www.facebook.com/YourPage" target="_blank">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Facebook">
                  </a>
                  <a href="https://www.linkedin.com/in/YourProfile" target="_blank">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/0/01/LinkedIn_Logo.svg" alt="LinkedIn">
                  </a>
                  
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
      Source: 'ronit.maity@serveaseinnovation.com', // Sender's email address (must be verified with SES)
      ConfigurationSetName: 'config-set-1', // If using a configuration set
    }

  try {
    const command = new SendEmailCommand(params);
    return await sesClient.send(command);
  } catch (error) {
    throw new Error('Email send failed: ' + error.message);
  }
};

module.exports = {
  sendEmail,
};