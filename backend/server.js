require('dotenv').config();
require('express-async-errors');

const app = require('./app');
const { connectDB, hasDatabaseConfig } = require('./config/database');

const PORT = process.env.PORT || 5000;

// DEBUG (optional)
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log('ENV CHECK JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'MISSING');
console.log('ENV CHECK DB:', hasDatabaseConfig ? 'OK' : 'MISSING');

const startServer = async () => {
  try {
    if (hasDatabaseConfig) {
      await connectDB();
      console.log('DB connected');
    } else {
      console.log('No DB config detected, continuing without database...');
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