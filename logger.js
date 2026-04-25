const fs = require("fs");
const path = require("path");

const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const stream = fs.createWriteStream(path.join(logsDir, "app.log"), { flags: "a" });

function write(level, message, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  stream.write(`${JSON.stringify(entry)}\n`);
}

const logger = {
  info(message, meta) {
    console.log(message, meta ?? "");
    write("info", message, meta);
  },
  error(message, meta) {
    console.error(message, meta ?? "");
    write("error", message, meta);
  },
};

module.exports = { logger };
