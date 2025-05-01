const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure nodemailer with Mailtrap or default to provided credentials
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io",
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER || "c135177a1dab98",
    pass: process.env.SMTP_PASSWORD || "****4e51" // Default to provided password if env var not set
  }
});

/**
 * Send an invoice as email with PDF attachment
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email text content
 * @param {Buffer} pdfBuffer - PDF attachment as buffer
 * @param {string} pdfFilename - Filename for the PDF attachment
 * @returns {Promise} - Email sending result
 */
async function sendInvoiceEmail(to, subject, text, pdfBuffer, pdfFilename) {
  try {
    console.log(`Sending invoice email to ${to} with subject: ${subject}`);
    
    const result = await transport.sendMail({
      from: '"Invoice System" <invoices@example.com>',
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #6366f1;">Invoice</h2>
        <p>${text}</p>
        <p>Please find your invoice attached to this email.</p>
        <p>Thank you for your business!</p>
      </div>`,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    
    console.log(`Email sent successfully, message ID: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendInvoiceEmail
}; 