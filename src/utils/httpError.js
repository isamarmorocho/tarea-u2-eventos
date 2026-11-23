// Error con código HTTP (statusCode, como lo lee el errorHandler del proyecto)
class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const forbidden = (msg = "No tiene permiso para esta operación") => new HttpError(403, msg);
const notFound = (msg = "Recurso no encontrado") => new HttpError(404, msg);
const conflict = (msg, details) => new HttpError(409, msg, details);

module.exports = { HttpError, badRequest, forbidden, notFound, conflict };
