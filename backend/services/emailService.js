const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Destroy cached transporter so a new one is created on next call
// (useful if env vars change or connection dies)
let transporter = null;
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS
    ? process.env.SMTP_PASS.replace(/\s+/g, '')
    : undefined;

  if (!user || !pass) {
    logger.warn('SMTP credentials missing');
    return null;
  }

  logger.info(`SMTP USER: ${user}`);
  logger.info(`SMTP PASS: ${pass ? 'SET' : 'MISSING'}`);
  logger.info(`SMTP HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  logger.info(`SMTP PORT: ${process.env.SMTP_PORT || 465}`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,

    auth: {
      user,
      pass,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,

    tls: {
      rejectUnauthorized: false,
    },

    debug: true, // 3. Add proper SMTP debugging logs
    logger: true, // Enables internal nodemailer logging
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * sendOTP — sends an OTP email.
 *
 * IMPORTANT: This function NEVER throws.
 * All errors are caught internally and logged.
 * Callers do NOT need to await this — it is designed to be fire-and-forget.
 *
 * @returns {Promise<boolean>} true if sent, false if failed
 */
const sendOTP = async (email, name, otp) => {
  const t = getTransporter();
  if (!t) {
    logger.warn(`[Email] Transporter not configured — skipping OTP email to ${email}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV] OTP for ${email}: ${otp}`);
    }
    return false;
  }

  const html = `
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

  try {
    // 4. Add transporter.verify() before sendMail()
    logger.info(`[Email] Verifying connection to ${process.env.SMTP_HOST || 'smtp.gmail.com'}...`);
    await new Promise((resolve, reject) => {
      t.verify((error, success) => {
        if (error) {
          logger.error(`[Email] SMTP Verification Error: ${error.message}`);
          reject(error);
        } else {
          logger.info('[Email] SMTP Connection Verified: Server is ready to take our messages');
          resolve(success);
        }
      });
    });

    logger.info(`[Email] Attempting to send mail to ${email}...`);
    const info = await t.sendMail({
      from: `"AI Hiring Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `${otp} - Your Verification Code`,
      html,
    });
    logger.info(`[Email] OTP sent successfully to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (err) {
    // Reset transporter so next call creates a fresh connection
    transporter = null;

    logger.error(`[Email] Failed to send OTP to ${email}: ${err.message}`);
    // 9. Add detailed error logging
    logger.error(`[Email] SMTP error code: ${err.code || 'unknown'}`);
    logger.error(`[Email] SMTP error command: ${err.command || 'unknown'}`);
    logger.error(`[Email] Full Error Object: ${JSON.stringify(err, null, 2)}`);

    if (process.env.NODE_ENV !== 'production') {
      // In dev, print OTP to console so you can still test
      logger.info(`[DEV] OTP for ${email}: ${otp}`);
    }

    // NEVER re-throw — email failure must never crash registration
    return false;
  }
};

/**
 * sendOTPBackground — fire-and-forget wrapper.
 * Call this when you don't want to await email sending.
 * The HTTP response is sent before the email completes.
 */
const sendOTPBackground = (email, name, otp) => {
  // Intentionally not awaited
  sendOTP(email, name, otp).catch((err) => {
    // This catch is a safety net — sendOTP itself never throws,
    // but just in case something unexpected happens.
    logger.error(`[Email] Unexpected error in background send: ${err.message}`);
  });
};

module.exports = { sendOTP, sendOTPBackground };
