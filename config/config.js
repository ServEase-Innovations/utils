const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const ENV = process.env.NODE_ENV || "development";

// EC2 will always have only `.env` because GitHub writes it.
// Local will load `.env.<env>` if available.
let envPath = path.resolve(process.cwd(), `.env.${ENV}`);

if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), ".env");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== "") {
      process.env[key] = value;
    }
  }
  console.log("✔ Loaded env file:", filePath);
  return true;
}

if (!loadEnvFile(envPath)) {
  console.warn(
    `[utils] no ${path.resolve(process.cwd(), `.env.${ENV}`)} or .env — ` +
      "using Render/host environment variables."
  );
}

// Monorepo root .env.local — fills AUTH0_*, MONGO_URI, etc. without overriding service env.
const monorepoRoot = path.resolve(process.cwd(), "../..");
for (const name of [".env.local", ".env.monorepo"]) {
  const sharedPath = path.join(monorepoRoot, name);
  if (!fs.existsSync(sharedPath)) continue;
  const parsed = dotenv.parse(fs.readFileSync(sharedPath));
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== "" && process.env[key] == null) {
      process.env[key] = value;
    }
  }
  console.log("✔ Loaded shared env (fill gaps):", sharedPath);
}

const { syncPostgresDbAliases, requirePostgresDatabaseName } = require("./postgresEnv.cjs");
syncPostgresDbAliases(process.env);

let database;
try {
  database = requirePostgresDatabaseName(process.env);
} catch (err) {
  throw new Error(
    `${err.message} On Render: Environment → add DATABASE_URL (postgresql://…/serveaso1) ` +
      "or POSTGRES_DB=serveaso1 with POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST."
  );
}

module.exports = {
  env: ENV,
  postgres: {
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || "127.0.0.1",
    user: process.env.POSTGRES_USER || process.env.DB_USER,
    password: process.env.POSTGRES_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    database,
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
  },
  mongo: {
    uri: process.env.MONGO_URI,
  },
};
