require('dotenv').config();
require('express-async-errors');

const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const hasDbConfig = Boolean(process.env.DATABASE_URL || process.env.DB_URL || process.env.DB_HOST);

// DEBUG (optional)
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log('ENV CHECK JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'MISSING');
console.log('ENV CHECK DB:', hasDbConfig ? 'OK' : 'MISSING');

const startServer = async () => {
  try {
    if (hasDbConfig) {
      try {
        await connectDB();
        console.log('DB connected');
      } catch (dbError) {
        console.error(dbError);
      }
    } else {
      console.log('No DB, but continuing...');
    }

    app.listen(PORT, () => {
      console.log('Server running');
    });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on('uncaughtException', (err) => {
  console.error("Uncaught Exception:", err);
});