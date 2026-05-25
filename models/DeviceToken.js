const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    platform: { type: String, enum: ["ios", "android", "web"], default: "ios" },
    userId: { type: String, index: true },
    email: { type: String, index: true, lowercase: true, trim: true },
    role: { type: String, index: true },
    serviceProviderId: { type: String, index: true },
    customerId: { type: String, index: true },
    deviceName: { type: String },
    lastSeenAt: { type: Date, default: Date.now },
    disabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);
