const express = require("express");
const mongoose = require("mongoose");
const DeviceToken = require("../models/DeviceToken");
const { sendToTokens, isFcmReady } = require("../services/fcm.service");
const { adminPushAuth } = require("../middleware/adminPushAuth");

const router = express.Router();

function resolveTokensForSend({ target, role, platform, deviceIds, emails, explicitTokens }) {
  if (target === "tokens" && Array.isArray(explicitTokens)) {
    return DeviceToken.find({
      token: { $in: explicitTokens.map(String).filter(Boolean) },
      disabled: { $ne: true },
    })
      .select("token email deviceName platform")
      .lean();
  }

  if (target === "devices" && Array.isArray(deviceIds) && deviceIds.length) {
    const ids = deviceIds
      .map(String)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    return DeviceToken.find({
      _id: { $in: ids },
      disabled: { $ne: true },
    })
      .select("token email deviceName platform")
      .lean();
  }

  if (target === "emails" && Array.isArray(emails) && emails.length) {
    const normalized = [
      ...new Set(
        emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      ),
    ];
    return DeviceToken.find({
      email: { $in: normalized },
      disabled: { $ne: true },
    })
      .select("token email deviceName platform")
      .lean();
  }

  const query = { disabled: { $ne: true } };
  if (role) query.role = String(role).toUpperCase();
  if (platform) query.platform = String(platform);
  return DeviceToken.find(query).select("token email deviceName platform").lean();
}

/** Register or refresh an FCM device token (mobile app). */
router.post("/register", async (req, res) => {
  try {
    const {
      token,
      platform = "ios",
      userId,
      email,
      role,
      serviceProviderId,
      customerId,
      deviceName,
    } = req.body || {};

  // Real FCM tokens are typically 140+ chars; reject short placeholders / test values
    const trimmedToken = typeof token === "string" ? token.trim() : "";
    if (!trimmedToken || trimmedToken.length < 100) {
      return res.status(400).json({
        error: "Valid FCM registration token is required (from the mobile app, not a test string).",
      });
    }

    const doc = await DeviceToken.findOneAndUpdate(
      { token: trimmedToken },
      {
        token: trimmedToken,
        platform: ["ios", "android", "web"].includes(platform) ? platform : "ios",
        userId: userId != null ? String(userId) : undefined,
        email: email ? String(email).trim().toLowerCase() : undefined,
        role: role ? String(role).toUpperCase() : undefined,
        serviceProviderId:
          serviceProviderId != null ? String(serviceProviderId) : undefined,
        customerId: customerId != null ? String(customerId) : undefined,
        deviceName: deviceName ? String(deviceName).trim().slice(0, 120) : undefined,
        lastSeenAt: new Date(),
        disabled: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("[push] register failed", err);
    return res.status(500).json({ error: err.message || "Registration failed" });
  }
});

/** Admin: send a push notification. */
router.post("/send", adminPushAuth, async (req, res) => {
  try {
    const {
      title,
      body,
      target = "all",
      role,
      platform,
      tokens: explicitTokens,
      deviceIds,
      emails,
    } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: "title and body are required" });
    }

    if (!isFcmReady()) {
      return res.status(503).json({
        error:
          "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on the utils service.",
      });
    }

    const rows = await resolveTokensForSend({
      target,
      role,
      platform,
      deviceIds,
      emails,
      explicitTokens,
    });
    const tokens = rows.map((r) => r.token).filter(Boolean);

    if (!tokens.length) {
      return res.status(400).json({
        error: "No device tokens registered for this audience.",
        registeredCount: 0,
      });
    }

    const result = await sendToTokens({
      title,
      body,
      tokens,
      data: { type: "ADMIN_BROADCAST" },
    });

    const stale = [];
    const failures = [];
    result.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "unknown";
        const message = r.error?.message || "Send failed";
        failures.push({ code, message });
        console.warn("[push] FCM delivery failed:", code, message);
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          stale.push(tokens[i]);
        }
      }
    });
    if (stale.length) {
      await DeviceToken.updateMany(
        { token: { $in: stale } },
        { $set: { disabled: true } }
      );
    }

    const recipients = rows.map((r) => ({
      email: r.email || null,
      platform: r.platform || null,
      deviceName: r.deviceName || null,
    }));

    return res.json({
      ok: true,
      attempted: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      staleDisabled: stale.length,
      failures,
      recipients,
    });
  } catch (err) {
    console.error("[push] send failed", err);
    return res.status(500).json({ error: err.message || "Send failed" });
  }
});

/** Admin: list registered devices (no full tokens). */
router.get("/devices", adminPushAuth, async (req, res) => {
  try {
    const rows = await DeviceToken.find({ disabled: { $ne: true } })
      .sort({ lastSeenAt: -1 })
      .limit(200)
      .lean();

    const devices = rows.map((d) => {
      const t = String(d.token || "");
      const tokenPreview =
        t.length > 16 ? `${t.slice(0, 8)}…${t.slice(-6)}` : t ? "•••" : "—";
      return {
        id: String(d._id),
        platform: d.platform || "unknown",
        email: d.email || null,
        role: d.role || null,
        deviceName: d.deviceName || null,
        userId: d.userId || null,
        lastSeenAt: d.lastSeenAt || d.updatedAt || d.createdAt,
        tokenPreview,
      };
    });

    const peopleMap = new Map();
    for (const d of devices) {
      const personKey = d.email || d.userId || d.id;
      if (!peopleMap.has(personKey)) {
        peopleMap.set(personKey, {
          key: personKey,
          email: d.email,
          userId: d.userId,
          role: d.role,
          deviceIds: [],
          platforms: [],
        });
      }
      const p = peopleMap.get(personKey);
      p.deviceIds.push(d.id);
      if (d.platform && !p.platforms.includes(d.platform)) {
        p.platforms.push(d.platform);
      }
    }

    const people = Array.from(peopleMap.values()).map((p) => ({
      ...p,
      deviceCount: p.deviceIds.length,
    }));

    return res.json({ devices, people, count: devices.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/** Admin: token stats */
router.get("/stats", adminPushAuth, async (req, res) => {
  try {
    const total = await DeviceToken.countDocuments({ disabled: { $ne: true } });
    const ios = await DeviceToken.countDocuments({
      disabled: { $ne: true },
      platform: "ios",
    });
    const android = await DeviceToken.countDocuments({
      disabled: { $ne: true },
      platform: "android",
    });
    const providers = await DeviceToken.countDocuments({
      disabled: { $ne: true },
      role: "SERVICE_PROVIDER",
    });
    const customers = await DeviceToken.countDocuments({
      disabled: { $ne: true },
      role: "CUSTOMER",
    });
    return res.json({
      fcmReady: isFcmReady(),
      total,
      ios,
      android,
      providers,
      customers,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
