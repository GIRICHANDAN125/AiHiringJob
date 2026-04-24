const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    console.log('Sending email');
    console.log('SMTP USER:', process.env.SMTP_USER);
    console.log('SMTP PASS:', process.env.SMTP_PASS ? 'SET' : 'MISSING');
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS && process.env.SMTP_PASS.replace(/\s+/g, ''),
      },
    });
  }
  return transporter;
};

const sendOTP = async (email, name, otp) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
      <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">AI Hiring Platform</h1>
      <p style="color: #94a3b8; margin: 8px 0 0;">Email Verification</p>
    </div>
    
    <h2 style="color: #1e293b;">Hello ${name}! 👋</h2>
    <p style="color: #475569; font-size: 16px;">Please use the following OTP to verify your email address. This code expires in <strong>10 minutes</strong>.</p>
    
    <div style="background: #f1f5f9; border: 2px dashed #38bdf8; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
      <h1 style="margin: 0; font-size: 48px; letter-spacing: 12px; color: #0f172a; font-weight: 800;">${otp}</h1>
    </div>
    
    <p style="color: #94a3b8; font-size: 14px;">If you did not create an account, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #cbd5e1; font-size: 12px; text-align: center;">AI Hiring Platform &copy; ${new Date().getFullYear()}</p>
  </body>
  </html>
  `;

  try {
    await getTransporter().sendMail({
      from: `"AI Hiring Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `${otp} - Your Verification Code`,
      html,
    });
    console.log('Email sent successfully');
    logger.info(`OTP email sent to ${email}`);
  } catch (err) {
    logger.error('Failed to send OTP email:', err.message);
    // Keep dev readable, but do not hide production failures
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV] OTP for ${email}: ${otp}`);
    } else {
      throw err;
    }
  }
};

module.exports = { sendOTP };
