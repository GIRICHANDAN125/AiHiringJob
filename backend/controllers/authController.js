const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  const result = await query(
    `INSERT INTO users (name, email, password_hash, otp_code, otp_expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email`,
    [name, email, passwordHash, otp, otpExpires]
  );

  try {
    await emailService.sendOTP(email, name, otp);
  } catch (err) {
    logger.warn('Failed to send OTP email:', err.message);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Check your email for OTP.',
    user: result.rows[0],
  });
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const result = await query(
    'SELECT id, otp_code, otp_expires_at, is_verified FROM users WHERE email = $1',
    [email]
  );

  if (!result.rows.length) {
    throw new AppError('User not found', 404);
  }

  const user = result.rows[0];

  if (user.is_verified) {
    throw new AppError('Email already verified', 400);
  }

  if (!user.otp_code || user.otp_code !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  if (new Date() > new Date(user.otp_expires_at)) {
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  await query(
    'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
    [user.id]
  );

  const { accessToken, refreshToken } = generateTokens(user.id);
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

  res.json({
    success: true,
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT id, name, email, password_hash, role, is_verified FROM users WHERE email = $1',
    [email]
  );

  if (!result.rows.length) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_verified) {
    // Resend OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
    try { await emailService.sendOTP(email, user.name, otp); } catch (e) {}
    throw new AppError('Email not verified. A new OTP has been sent.', 403);
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

  res.json({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) throw new AppError('Refresh token required', 400);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const result = await query(
    'SELECT id, refresh_token FROM users WHERE id = $1',
    [decoded.userId]
  );

  if (!result.rows.length || result.rows[0].refresh_token !== token) {
    throw new AppError('Invalid refresh token', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, decoded.userId]);

  res.json({ success: true, accessToken, refreshToken: newRefreshToken });
};

const logout = async (req, res) => {
  await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
  res.json({ success: true, message: 'Logged out successfully' });
};

const resendOTP = async (req, res) => {
  const { email } = req.body;
  const result = await query('SELECT id, name, is_verified FROM users WHERE email = $1', [email]);
  if (!result.rows.length) throw new AppError('User not found', 404);
  const user = result.rows[0];
  if (user.is_verified) throw new AppError('Email already verified', 400);

  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
  await emailService.sendOTP(email, user.name, otp);

  res.json({ success: true, message: 'OTP resent successfully' });
};

const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res) => {
  const { name, email } = req.body;

  const nextName = typeof name === 'string' ? name.trim() : '';
  const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!nextName || !nextEmail) {
    throw new AppError('Name and email are required', 400);
  }

  const duplicate = await query(
    'SELECT id FROM users WHERE email = $1 AND id != $2',
    [nextEmail, req.user.id]
  );

  if (duplicate.rows.length) {
    throw new AppError('Email is already in use', 409);
  }

  const result = await query(
    `UPDATE users
     SET name = $1, email = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, email, role, is_verified`,
    [nextName, nextEmail, req.user.id]
  );

  await query(
    `INSERT INTO notifications (user_id, message)
     VALUES ($1, $2)`,
    [req.user.id, 'Your profile information was updated successfully.']
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: result.rows[0],
  });
};

module.exports = {
  register,
  verifyOTP,
  login,
  refreshToken,
  logout,
  resendOTP,
  getProfile,
  updateProfile,
};
