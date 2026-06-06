const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  /** HMAC fingerprint of normalized username — used for login lookup */
  usernameKey: { type: String, unique: true, sparse: true },
  /** Legacy plain username (migrated to usernameKey on login) */
  username: { type: String },
  /** bcrypt hash — never store plain passwords */
  hashedPassword: { type: String },
  totpSecret: String,
  role: { type: String, enum: ["SuperAdmin", "Admin", "User"], default: "User" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

module.exports = mongoose.model("User", userSchema);
