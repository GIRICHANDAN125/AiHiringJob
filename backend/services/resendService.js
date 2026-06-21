const { Resend } = require('resend');
const logger = require('../utils/logger');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends an email using the Resend API
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const sendEmailViaResend = async (email, subject, html) => {
  if (!resend) {
    logger.warn('[EMAIL] RESEND_API_KEY not configured. Cannot use fallback.');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Hardcoded testing domain to prevent Gmail rejection
      to: [email],
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    logger.info(`[EMAIL] Resend Success. Message ID: ${data.id}`);
    return true;
  } catch (err) {
    logger.error(`[EMAIL] Resend Failed: ${err.message}`);
    return false;
  }
};

module.exports = { sendEmailViaResend };
