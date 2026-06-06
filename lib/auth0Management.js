const axios = require("axios");

/**
 * Auth0 Management API (M2M) — credentials from env only.
 * Required for POST /authO and related user-creation routes.
 */
function requireAuth0ManagementConfig() {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();

  const missing = [];
  if (!domain) missing.push("AUTH0_DOMAIN");
  if (!clientId) missing.push("AUTH0_MANAGEMENT_CLIENT_ID");
  if (!clientSecret) missing.push("AUTH0_MANAGEMENT_CLIENT_SECRET");

  if (missing.length > 0) {
    const err = new Error(
      `Auth0 Management API not configured (missing: ${missing.join(", ")}). ` +
        "Set these in services/utils env or monorepo .env.local."
    );
    err.code = "AUTH0_CONFIG_MISSING";
    throw err;
  }

  return {
    domain,
    clientId,
    clientSecret,
    audience: `https://${domain}/api/v2/`,
  };
}

async function getManagementToken() {
  const { domain, clientId, clientSecret, audience } = requireAuth0ManagementConfig();

  try {
    const response = await axios.post(`https://${domain}/oauth/token`, {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    });
    return response.data.access_token;
  } catch (err) {
    console.error("Error fetching Auth0 management token:", err.response?.data || err.message);
    throw new Error("Unable to retrieve Auth0 management token");
  }
}

async function createAuth0DatabaseUser({ email, password, name }) {
  const { domain } = requireAuth0ManagementConfig();
  const token = await getManagementToken();

  const payload = {
    email,
    password,
    connection: "Username-Password-Authentication",
  };
  if (name) {
    payload.name = name;
  }

  const response = await axios.post(`https://${domain}/api/v2/users`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.data;
}

module.exports = {
  requireAuth0ManagementConfig,
  getManagementToken,
  createAuth0DatabaseUser,
};
