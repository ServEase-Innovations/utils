require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "dev",

  // Application
  PORT: process.env.PORT || 3001,
  EMAIL_PORT: process.env.EMAIL_PORT || 4000,

  // MongoDB
  MONGO_URI: process.env.MONGO_URI,
  MONGO_SSL_CA_PATH: process.env.MONGO_SSL_CA_PATH || null,

  // PostgreSQL
  PG_HOST: process.env.PG_HOST,
  PG_PORT: process.env.PG_PORT || 5432,
  PG_DB: process.env.PG_DB,
  PG_USER: process.env.PG_USER,
  PG_PASSWORD: process.env.PG_PASSWORD,

  // Auth0
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  // Base URL (for swagger)
  BASE_URL: process.env.BASE_URL,
};
