import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create transporter with App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email server connection failed:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Function to send email
export const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"BankBackend" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
};

// Function to send welcome email
export const sendRegisteredEmail = async (email, userName) => {
  const subject = "🎉 Welcome to BankBackend!";
  const text = `Hello ${userName},\n\nThank you for registering at our banking backend system.\n\nBest regards,\nBankBackend Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #4CAF50;">Welcome to BankBackend! 🎉</h2>
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Thank you for registering at our banking backend system.</p>
      <p>You can now access our banking services.</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Best regards,<br>BankBackend Team</p>
    </div>
  `;
  
  await sendEmail(email, subject, text, html);
};