const express = require("express");
const deliveryRoutes = require("./routes/deliveryRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const aqiRoutes = require("./routes/aqiRoutes");
const metaRoutes = require("./routes/metaRoutes");
const liveRoutes = require("./routes/liveRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

function createApp() {
  const app = express();
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    return next();
  });
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "mock-api" });
  });

  app.use("/api", metaRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/weather", weatherRoutes);
  app.use("/api/aqi", aqiRoutes);
  app.use("/api/live", liveRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use((error, _req, res, _next) => {
    console.error("[mock-api] request failed", error);
    res.status(500).json({ ok: false, error: error.message || "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
