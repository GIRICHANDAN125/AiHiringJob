require('dotenv').config();
require('express-async-errors');

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// DEBUG (optional)
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log('ENV CHECK JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'MISSING');
console.log('ENV CHECK DB:', (process.env.DATABASE_URL || process.env.DB_URL || process.env.DB_HOST) ? 'OK' : 'MISSING');

const startServer = async () => {
  try {
    if (process.env.DATABASE_URL || process.env.DB_URL || process.env.DB_HOST) {
      try {
        await connectDB();
        logger.info('✅ Database connected');
      } catch (dbError) {
        logger.error('⚠️ Database connection failed:', dbError.message);
      }
    } else {
      logger.warn('⚠️ No DB environment variables found; auth mock responses will be used for login/register');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error("FULL ERROR:", error);
    logger.error('❌ Failed to start server:', error.message);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
});