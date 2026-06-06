const crypto = require("crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;

function normalizeUsername(username) {
  return String(username ?? "").trim();
}

/** One-way username fingerprint for DB lookup (not reversible without pepper). */
function hashUsername(username) {
  const normalized = normalizeUsername(username).toLowerCase();
  if (!normalized) {
    return "";
  }
  const pepper =
    process.env.USERNAME_HASH_PEPPER ||
    process.env.ADMIN_PUSH_SECRET ||
    "serveaso-dev-username-pepper";
  return crypto.createHmac("sha256", pepper).update(normalized).digest("hex");
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), BCRYPT_ROUNDS);
}

async function verifyPassword(user, plainPassword) {
  if (!user) {
    return false;
  }

  if (user.hashedPassword) {
    return bcrypt.compare(String(plainPassword), user.hashedPassword);
  }

  // Legacy: plain `password` field in Mongo — migrate on successful login
  if (user.password && String(user.password) === String(plainPassword)) {
    user.hashedPassword = await hashPassword(plainPassword);
    user.password = undefined;
    await user.save();
    return true;
  }

  return false;
}

/**
 * Resolve user by login username; backfills usernameKey for legacy documents.
 */
async function findUserByUsername(User, username) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }

  const usernameKey = hashUsername(normalized);
  let user = await User.findOne({ usernameKey });
  if (user) {
    return user;
  }

  // Legacy records stored plain username
  const legacy = await User.findOne({
    username: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });
  if (!legacy) {
    return null;
  }

  if (!legacy.usernameKey) {
    legacy.usernameKey = usernameKey;
    await legacy.save();
  }
  return legacy;
}

function publicUserFields(user) {
  if (!user) {
    return null;
  }
  return {
    userId: user._id,
    role: user.role,
  };
}

module.exports = {
  normalizeUsername,
  hashUsername,
  hashPassword,
  verifyPassword,
  findUserByUsername,
  publicUserFields,
  BCRYPT_ROUNDS,
};
