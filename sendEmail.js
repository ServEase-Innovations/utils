const nodemailer = require('nodemailer');

// Create a transporter using the SMTP server information
let transporter = nodemailer.createTransport({
  host: 'smtp.mailer91.com',  // SMTP server
  port: 587,  // SMTP port (587 is commonly used for TLS)
  secure: false,  // Use STARTTLS (false for port 587)
  auth: {
    user: 'emailer@gelqsr.mailer91.com',  // Your SMTP username
    pass: 'bUnfvruLq6LDk9Eg'  // Your SMTP password (replace with actual password)
  }
});

// Define the email options
let mailOptions = {
  from: '"No-reply" <No-reply@gelqsr.mailer91.com>',  // Sender address
  to: 'maity.ronit18@gmail.com',  // List of recipients
  subject: 'Welcome to MSG91',  // Subject line
  text: 'Testing some MSG91 awesomness!'  // Plain text body
};

// Send mail using the transporter
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log('Error occurred:', error);
  }
  console.log('Message sent:', info.messageId);
});
