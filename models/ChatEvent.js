const mongoose = require("mongoose");

// ================== Chat Event Schema ==================
const chatEventSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true },
    eventType: { type: String, enum: ["join", "leave", "transfer", "close"], required: true },
    actorId: { type: Number, required: true }, // PostgreSQL user_id
    actorRole: { type: String, enum: ["User", "Admin", "SuperAdmin"], required: true },
    details: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
  });
// ==================================================
module.exports = mongoose.model("ChatEvent", chatEventSchema);
// ==================================================