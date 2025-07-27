const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    hashedPassword: String,
    totpSecret: String,
    role: { type: String, enum: ["SuperAdmin", "Admin", "User"], default: "User" },
  });
  

module.exports = mongoose.model("User", userSchema);
