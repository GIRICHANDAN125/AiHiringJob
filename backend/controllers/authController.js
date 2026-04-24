const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const inMemoryUsers = new Map();

const isDbConfigured = () => {
  return Boolean(
    process.env.DB_URL ||
    process.env.DATABASE_URL ||
    process.env.DB_HOST
  );
};

const logAuthEnvCheck = () => {
  console.log('ENV CHECK JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'MISSING');
  console.log('ENV CHECK JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? 'OK' : 'MISSING');
  console.log('ENV CHECK DB:', isDbConfigured() ? 'OK' : 'MISSING');
};

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const saveInMemoryUser = (user) => {
  const key = normalizeEmail(user.email);
  if (key) inMemoryUsers.set(key, user);
};

const getInMemoryUser = (email) => inMemoryUsers.get(normalizeEmail(email));

const setInMemoryOtp = (user) => {
  const otp = generateOTP();
  const otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  user.otp_code = otp;
  user.otp_expires_at = otpExpires.toISOString();
  user.is_verified = false;
  saveInMemoryUser(user);
  console.log('Generated OTP');
  return { otp, otpExpires };
};

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
  console.log('Request body:', req.body);

  try {
    logAuthEnvCheck();

    const { name, email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (isDbConfigured()) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const otp = generateOTP();
      console.log('Generated OTP');
      const otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);

      const result = await query(
        `INSERT INTO users (name, email, password_hash, otp_code, otp_expires_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email`,
        [name, normalizedEmail, passwordHash, otp, otpExpires]
      );

      await emailService.sendOTP(normalizedEmail, name, otp);

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Check your email for OTP.',
        user: result.rows[0],
      });
    }

    const existingInMemory = getInMemoryUser(normalizedEmail);
    if (existingInMemory && existingInMemory.is_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const memoryUser = existingInMemory || {
      id: uuidv4(),
      name,
      email: normalizedEmail,
      role: 'recruiter',
      refresh_token: null,
    };

    memoryUser.name = name;
    memoryUser.password_hash = passwordHash;

    const { otp } = setInMemoryOtp(memoryUser);
    await emailService.sendOTP(normalizedEmail, name, otp);

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for OTP.',
      user: {
        id: memoryUser.id,
        name: memoryUser.name,
        email: memoryUser.email,
      },
    });
  } catch (error) {
    console.error('AUTH ERROR:', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !otp) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (isDbConfigured()) {
    const result = await query(
      'SELECT id, otp_code, otp_expires_at, is_verified FROM users WHERE email = $1',
      [normalizedEmail]
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

    return res.json({
      success: true,
      message: 'Email verified successfully',
      accessToken,
      refreshToken,
    });
  }

  const memoryUser = getInMemoryUser(normalizedEmail);
  if (!memoryUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (memoryUser.is_verified) {
    return res.status(400).json({ error: 'Email already verified' });
  }

  if (!memoryUser.otp_code || memoryUser.otp_code !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  if (new Date() > new Date(memoryUser.otp_expires_at)) {
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  memoryUser.is_verified = true;
  memoryUser.otp_code = null;
  memoryUser.otp_expires_at = null;
  saveInMemoryUser(memoryUser);

  const { accessToken, refreshToken } = generateTokens(memoryUser.id);
  memoryUser.refresh_token = refreshToken;
  saveInMemoryUser(memoryUser);

  return res.json({
    success: true,
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
  });
};

const login = async (req, res) => {
  console.log('Request body:', req.body);

  try {
    logAuthEnvCheck();

    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ error: 'Server auth environment is not configured' });
    }

    if (isDbConfigured()) {
      const result = await query(
        'SELECT id, name, email, password_hash, role, is_verified FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (!result.rows.length) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.is_verified) {
        const otp = generateOTP();
        console.log('Generated OTP');
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
        await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
        await emailService.sendOTP(normalizedEmail, user.name, otp);
        return res.status(403).json({ error: 'Email not verified. A new OTP has been sent.' });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);
      await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

      return res.json({
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
    }

    const memoryUser = getInMemoryUser(normalizedEmail);
    if (!memoryUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, memoryUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!memoryUser.is_verified) {
      const { otp } = setInMemoryOtp(memoryUser);
      await emailService.sendOTP(normalizedEmail, memoryUser.name, otp);
      return res.status(403).json({ error: 'Email not verified. A new OTP has been sent.' });
    }

    const { accessToken, refreshToken } = generateTokens(memoryUser.id);
    memoryUser.refresh_token = refreshToken;
    saveInMemoryUser(memoryUser);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: memoryUser.id,
        name: memoryUser.name,
        email: memoryUser.email,
        role: memoryUser.role,
      },
    });
  } catch (error) {
    console.error('AUTH ERROR:', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
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
  console.log('Request body:', req.body);

  try {
    logAuthEnvCheck();

    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const normalizedEmail = normalizeEmail(email);

    if (isDbConfigured()) {
      const result = await query('SELECT id, name, is_verified FROM users WHERE email = $1', [normalizedEmail]);
      if (!result.rows.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      if (user.is_verified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const otp = generateOTP();
      console.log('Generated OTP');
      const otpExpires = new Date(Date.now() + OTP_EXPIRY_MS);

      await query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpires, user.id]);
      await emailService.sendOTP(normalizedEmail, user.name, otp);

      return res.json({ success: true, message: 'OTP resent successfully' });
    }

    const memoryUser = getInMemoryUser(normalizedEmail);
    if (!memoryUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (memoryUser.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const { otp } = setInMemoryOtp(memoryUser);
    await emailService.sendOTP(normalizedEmail, memoryUser.name, otp);

    return res.json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    console.error('AUTH ERROR:', error);
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
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
