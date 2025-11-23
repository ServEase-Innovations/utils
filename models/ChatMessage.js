// models/ChatMessage.js
const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  senderId: { type: Number, required: true },
  senderName: String,
  senderRole: { type: String, enum: ["User", "Admin"], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
