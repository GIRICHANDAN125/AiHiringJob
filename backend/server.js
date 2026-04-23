require('dotenv').config();
require('express-async-errors');

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// DEBUG (optional)
console.log("NODE_ENV:", process.env.NODE_ENV);

const startServer = async () => {
  try {

    // 👉 Only connect DB in local (NOT in production)
    if (process.env.NODE_ENV !== "production") {
      await connectDB();
      logger.info('✅ Database connected');
    } else {
      logger.info('⚠️ Skipping DB connection in production (temporary)');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

  } catch (error) {
    console.error("FULL ERROR:", error);
    logger.error('❌ Failed to start server:', error.message);

    // 👉 Don't crash in production
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
});