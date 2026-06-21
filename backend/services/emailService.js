const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { sendEmailViaResend } = require('./resendService');

let transporter = null;
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

  if (!user || !pass) {
    logger.warn('[EMAIL] SMTP credentials missing');
    return null;
  }

  // For Render, Port 465 with implicit SSL is much more reliable than 587 (STARTTLS)
  const port = Number(process.env.SMTP_PORT) || 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // MUST be true for port 465, false for 587
    auth: { user, pass },

    family: 4, // Bypasses Render's IPv6 DNS issues with Google SMTP

    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,

    // Turn on logging if we are not in production to debug issues further
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Generates the HTML template for the OTP email.
 */
const getOTPHtml = (name, otp) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
      <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">AI Hiring Platform</h1>
      <p style="color: #94a3b8; margin: 8px 0 0;">Email Verification</p>
    </div>

    <h2 style="color: #1e293b;">Hello ${name}! 👋</h2>
    <p style="color: #475569; font-size: 16px;">
      Please use the following OTP to verify your email address.
      This code expires in <strong>10 minutes</strong>.
    </p>

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

/**
 * sendOTP — sends an OTP email. Tries SMTP first, falls back to Resend.
 * @returns {Promise<boolean>} true if sent, false if failed
 */
const sendOTP = async (email, name, otp) => {
  const subject = `${otp} - Your Verification Code`;
  const html = getOTPHtml(name, otp);
  
  let smtpSuccess = false;
  
  // 1. Try Gmail SMTP
  logger.info('[EMAIL] Trying Gmail SMTP...');
  logger.info(`SMTP_HOST=${process.env.SMTP_HOST}`);
  logger.info(`SMTP_PORT=${process.env.SMTP_PORT}`);
  logger.info(`SMTP_USER=${process.env.SMTP_USER}`);
  logger.info(`SMTP_PASS_EXISTS=${!!process.env.SMTP_PASS}`);
  const t = getTransporter();
  
  if (t) {
    try {
      // Removed t.verify() overhead. t.sendMail will naturally fail if the connection doesn't work.
      await t.sendMail({
        from: `"AI Hiring Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });

      logger.info(`[EMAIL] SMTP Success. OTP sent to ${email}`);
      smtpSuccess = true;
      return true;
    } catch (err) {
      transporter = null; // Reset transporter on failure
      logger.error('[EMAIL] Full SMTP Error:', {
        message: err.message,
        code: err.code,
        command: err.command,
        response: err.response,
        responseCode: err.responseCode,
        stack: err.stack
      });
    }
  } else {
    logger.error('[EMAIL] Gmail SMTP Failed: Transporter not configured.');
  }

  // 2. Fallback to Resend API
  if (!smtpSuccess) {
    logger.info('[EMAIL] Switching to Resend...');
    const resendSuccess = await sendEmailViaResend(email, subject, html);
    
    if (resendSuccess) {
      return true;
    } else {
      logger.error(`[EMAIL] Both SMTP and Resend failed to send OTP to ${email}.`);
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[DEV] OTP for ${email}: ${otp}`);
      }
      return false;
    }
  }
};

/**
 * sendOTPBackground — fire-and-forget wrapper.
 * Call this when you don't want to await email sending.
 */
const sendOTPBackground = (email, name, otp) => {
  sendOTP(email, name, otp).catch((err) => {
    logger.error(`[EMAIL] Unexpected error in background send: ${err.message}`);
  });
};

module.exports = { sendOTP, sendOTPBackground };
