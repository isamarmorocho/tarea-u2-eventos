const mongoose = require("mongoose");

// Traduce los errores de Mongoose, MongoDB y Prisma a códigos HTTP.
// Mantiene el formato original: { status, statusCode, message }
const mapError = (err) => {
  // Errores propios de los servicios (HttpError con statusCode)
  if (err.statusCode) return { statusCode: err.statusCode, message: err.message, details: err.details };

  // Mongoose: validación del esquema → 400 (mensajes en español del modelo)
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return { statusCode: 400, message: "Datos inválidos", errors };
  }
  // Mongoose: tipo incorrecto (por ejemplo un _id mal formado) → 400
  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, message: `Valor inválido para ${err.path}: ${JSON.stringify(err.value)}` };
  }
  // MongoDB: índice único violado → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {}).join(", ");
    return { statusCode: 409, message: `Registro duplicado (E11000) en: ${field}`, details: err.keyValue };
  }
  // Prisma: único violado → 409, FK en uso → 409, no encontrado → 404
  if (err.code === "P2002") return { statusCode: 409, message: "Registro duplicado en PostgreSQL" };
  if (err.code === "P2003") return { statusCode: 409, message: "El registro está en uso en PostgreSQL" };
  if (err.code === "P2025") return { statusCode: 404, message: "Registro no encontrado en PostgreSQL" };
  // JSON mal formado en el body → 400
  if (err.type === "entity.parse.failed") return { statusCode: 400, message: "El cuerpo de la petición no es un JSON válido" };
  // Una de las bases no responde → 503
  if (err.name === "MongooseServerSelectionError" || err.name === "MongoNetworkError") {
    return { statusCode: 503, message: "MongoDB no disponible" };
  }
  return { statusCode: 500, message: err.message || "Ocurrio un error inesperado" };
};

const errorHandler = (err, req, res, next) => {
  const { statusCode, message, details, errors } = mapError(err);
  console.log(
    `[ERROR] ${new Date().toISOString()} - ${statusCode} - ${message}`,
  );
  if (statusCode >= 500 && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    ...(errors && { errors }),
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;
