const express = require("express");
const mongoose = require("mongoose");

function createHealthRouter(pool) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "utils",
      uptime: process.uptime(),
    });
  });

  router.get("/ready", async (_req, res) => {
    const checks = { postgres: false, mongo: false };
    try {
      if (pool) {
        await pool.query("SELECT 1");
        checks.postgres = true;
      }
      if (mongoose.connection.readyState === 1) {
        checks.mongo = true;
      }
      const ready = checks.postgres && checks.mongo;
      res.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        service: "utils",
        checks,
      });
    } catch (err) {
      res.status(503).json({
        status: "not_ready",
        service: "utils",
        checks,
        error: err?.message || "dependency unreachable",
      });
    }
  });

  return router;
}

module.exports = { createHealthRouter };
