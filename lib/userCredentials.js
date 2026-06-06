const crypto = require("crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;
const PASSWORD_SCHEME_WIRE = "bcrypt-sha256";

function normalizeUsername(username) {
  return String(username ?? "").trim();
}

/** SHA-256 hex — client and server can compute the same value (safe to send over HTTP). */
function clientUsernameHash(username) {
  const normalized = normalizeUsername(username).toLowerCase();
  if (!normalized) {
    return "";
  }
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/** SHA-256 hex of password — send this in login/register body instead of plain password. */
function clientPasswordHash(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

/** Legacy server-side username key (HMAC) — older accounts may still use this. */
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

async function hashPasswordStorage(passwordMaterial) {
  return bcrypt.hash(String(passwordMaterial), BCRYPT_ROUNDS);
}

/**
 * Parse login/register body.
 * Preferred: { usernameHash, passwordHash }
 * Legacy (dev): { username, password } — server derives hashes internally.
 */
function parseAuthBody(body) {
  const usernameHash = String(body?.usernameHash ?? body?.u ?? "").trim();
  const passwordHash = String(body?.passwordHash ?? body?.p ?? "").trim();
  const username = normalizeUsername(body?.username);
  const password = body?.password;

  if (usernameHash && passwordHash) {
    return {
      mode: "hashed",
      usernameHash,
      passwordHash,
      username: "",
      password: "",
    };
  }

  if (username && password != null && String(password).length > 0) {
    return {
      mode: "plain",
      username,
      password: String(password),
      usernameHash: clientUsernameHash(username),
      passwordHash: clientPasswordHash(password),
    };
  }

  return null;
}

function rejectPlainAuthInProduction(mode, res) {
  if (mode === "plain" && process.env.NODE_ENV === "production") {
    res.status(400).json({
      message:
        "Send usernameHash and passwordHash in the request body (plain username/password not allowed in production).",
      example: {
        usernameHash: "sha256(lowercase(trim(username)))",
        passwordHash: "sha256(password)",
      },
    });
    return true;
  }
  return false;
}

async function findUserForLogin(User, parsed) {
  const { usernameHash, username } = parsed;

  if (usernameHash) {
    const byWire = await User.findOne({
      $or: [{ usernameWireHash: usernameHash }, { usernameKey: usernameHash }],
    });
    if (byWire) {
      return byWire;
    }
  }

  if (username) {
    return findUserByUsername(User, username);
  }

  return null;
}

async function verifyPassword(user, plainPassword) {
  if (!user) {
    return false;
  }

  if (user.hashedPassword) {
    return bcrypt.compare(String(plainPassword), user.hashedPassword);
  }

  if (user.password && String(user.password) === String(plainPassword)) {
    user.hashedPassword = await hashPasswordStorage(plainPassword);
    user.password = undefined;
    await user.save();
    return true;
  }

  return false;
}

async function verifyLoginMaterial(user, parsed) {
  if (!user) {
    return false;
  }

  const { passwordHash, password, mode, usernameHash, username } = parsed;

  if (user.hashedPassword) {
    const wireOk = await bcrypt.compare(passwordHash, user.hashedPassword);
    if (wireOk) {
      await maybeMigrateUserToWireScheme(user, { usernameHash, username, passwordHash, mode, password });
      return true;
    }

    if (mode === "plain" && password) {
      const plainOk = await bcrypt.compare(password, user.hashedPassword);
      if (plainOk) {
        await migrateUserToWireScheme(user, {
          usernameHash,
          username,
          passwordHash,
        });
        return true;
      }
    }
  }

  if (mode === "plain" && password) {
    return verifyPassword(user, password);
  }

  return false;
}

async function maybeMigrateUserToWireScheme(user, ctx) {
  if (user.passwordScheme === PASSWORD_SCHEME_WIRE && user.usernameWireHash) {
    return;
  }
  await migrateUserToWireScheme(user, ctx);
}

async function migrateUserToWireScheme(user, { usernameHash, username, passwordHash }) {
  const wireUsername = usernameHash || clientUsernameHash(username);
  if (wireUsername && !user.usernameWireHash) {
    user.usernameWireHash = wireUsername;
  }
  if (passwordHash) {
    user.hashedPassword = await hashPasswordStorage(passwordHash);
    user.passwordScheme = PASSWORD_SCHEME_WIRE;
  }
  user.password = undefined;
  await user.save();
}

async function findUserByUsername(User, username) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return null;
  }

  const wireHash = clientUsernameHash(normalized);
  let user = await User.findOne({
    $or: [{ usernameWireHash: wireHash }, { usernameKey: wireHash }],
  });
  if (user) {
    return user;
  }

  const usernameKey = hashUsername(normalized);
  user = await User.findOne({ usernameKey });
  if (user) {
    return user;
  }

  const legacy = await User.findOne({
    username: {
      $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    },
  });
  if (!legacy) {
    return null;
  }

  if (!legacy.usernameWireHash) {
    legacy.usernameWireHash = wireHash;
    await legacy.save();
  }
  return legacy;
}

/** 2FA steps: accept usernameHash (preferred) or plain username. */
function parseUsernameLookup(body) {
  const usernameHash = String(body?.usernameHash ?? body?.u ?? "").trim();
  const username = normalizeUsername(body?.username);
  if (usernameHash) {
    return { usernameHash, username: "" };
  }
  if (username) {
    return { usernameHash: clientUsernameHash(username), username };
  }
  return null;
}

async function findUserByLookup(User, lookup) {
  if (!lookup) {
    return null;
  }
  return findUserForLogin(User, lookup);
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

function buildLoginPayload(username, password) {
  return {
    usernameHash: clientUsernameHash(username),
    passwordHash: clientPasswordHash(password),
  };
}

module.exports = {
  normalizeUsername,
  hashUsername,
  clientUsernameHash,
  clientPasswordHash,
  hashPasswordStorage,
  parseAuthBody,
  rejectPlainAuthInProduction,
  parseUsernameLookup,
  findUserByLookup,
  findUserForLogin,
  findUserByUsername,
  verifyLoginMaterial,
  verifyPassword,
  publicUserFields,
  buildLoginPayload,
  PASSWORD_SCHEME_WIRE,
  BCRYPT_ROUNDS,
};
