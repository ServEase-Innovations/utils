require('dotenv').config();

// Here we can export any global config we need (e.g., AWS credentials, SES region)
module.exports = {
  SES_REGION: 'ap-south-1',
  SENDER_EMAIL: process.env.SENDER_EMAIL, // Add sender email from env variables
};
