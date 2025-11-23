module.exports = {
  apps: [
    {
      name: "utils",
      script: "server.js",
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PROFILE: process.env.PROFILE,
        PORT: process.env.PORT,
        EMAIL_PORT: process.env.EMAIL_PORT,
        MONGO_URI: process.env.MONGO_URI,
        MONGO_SSL_CA_PATH: process.env.MONGO_SSL_CA_PATH,
        PG_HOST: process.env.PG_HOST,
        PG_DB: process.env.PG_DB,
        PG_USER: process.env.PG_USER,
        PG_PASSWORD: process.env.PG_PASSWORD,
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
        AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
        BASE_URL: process.env.BASE_URL
      }
    }
  ]
}
