const express = require("express");

const { requestLogger } = require("./middleware/requestLogger");
const { notFoundHandler } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");
const { apiRouter } = require("./routes");

function buildApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
