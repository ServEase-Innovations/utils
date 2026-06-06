const express = require("express");
const { createAuth0DatabaseUser } = require("../lib/auth0Management");

const router = express.Router();

router.post("/authO/create-autho-user", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await createAuth0DatabaseUser({ email, password, name });
    res.status(201).json({ user_id: user.user_id });
  } catch (err) {
    if (err.code === "AUTH0_CONFIG_MISSING") {
      return res.status(503).json({ error: "Auth0 user creation is not configured" });
    }

    console.error("Error creating Auth0 user:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create Auth0 user" });
  }
});

module.exports = router;
