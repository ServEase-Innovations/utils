const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  /** SHA-256 hex of normalized username — matches client usernameHash on the wire */
  usernameWireHash: { type: String, unique: true, sparse: true },
  /** Legacy HMAC username key */
  usernameKey: { type: String, unique: true, sparse: true },
  /** Legacy plain username */
  username: { type: String },
  /** bcrypt hash of password material (sha256 hex for wire scheme) */
  hashedPassword: { type: String },
  passwordScheme: { type: String, enum: ["bcrypt-sha256", "bcrypt-plain"], default: "bcrypt-sha256" },
  totpSecret: String,
  role: { type: String, enum: ["SuperAdmin", "Admin", "User"], default: "User" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("User", userSchema);
