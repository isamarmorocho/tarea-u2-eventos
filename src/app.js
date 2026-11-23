const express = require("express");
const routes = require("./routes/index");
const LoggerMiddleware = require("./middlewares/logger");
const errorHandler = require("./middlewares/errorHandler");
const app = express();

app.use(express.json());
if (process.env.NODE_ENV !== "test") app.use(LoggerMiddleware);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Ruta no encontrada → 404
app.use((req, res) => {
  res.status(404).json({ status: "error", statusCode: 404, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejo centralizado de errores (400 / 404 / 409 / 503)
app.use(errorHandler);

module.exports = app;
