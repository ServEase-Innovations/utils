const sendgrid = require('@sendgrid/mail');

// Set your SendGrid API key
sendgrid.setApiKey('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');

// Set up the email data with the dynamic template
const mailOptions = {
  from: 'ServEaso <ronit.maity@serveaseinnovation.com>', // Sender address
  to: 'maity.ronit18@gmail.com', // Recipient's email address
  subject: 'Welcome', // Subject line
  templateId: 'd-8d3a74a3e23d4de5a569007b280570c7', // The dynamic template ID
  dynamic_template_data: {
    name: 'Ronit', // Dynamic data to be injected into the template
  },
};

// Send the email using SendGrid
sendgrid
  .send(mailOptions)
  .then((response) => {
    console.log('Email sent:', response[0].statusCode);
  })
  .catch((error) => {
    console.error('Error sending email:', error);
  });
