const mongoose = require("mongoose");

const ChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },   // same sessionId you already generate
  createdBy: { type: Number, required: true }, // userId who started
  createdByName: String,
  lastMessage: String,
  lastMessageAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatSession", ChatSessionSchema);
