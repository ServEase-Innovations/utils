const express = require("express");
const axios = require("axios");
const router = express.Router();

// Load environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
const AUTH0_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`;

// Helper: Get Auth0 Management Token
async function getManagementToken() {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: "client_credentials",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
    });

    return response.data.access_token;
  } catch (err) {
    console.error("❌ Error fetching Auth0 token:", err.response?.data || err.message);
    throw new Error("Unable to retrieve Auth0 management token");
  }
}


router.post("/authO/create-autho-user", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const token = await getManagementToken();

    const userRes = await axios.post(
      `https://${AUTH0_DOMAIN}/api/v2/users`,
      {
        email,
        password,
        connection: "Username-Password-Authentication",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.status(201).json({ user_id: userRes.data.user_id });
  } catch (err) {
    console.error("❌ Error creating Auth0 user:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create Auth0 user" });
  }
});

module.exports = router;
