// Encuesta de satisfacción (MongoDB) validando la inscripción en PostgreSQL
const mongoose = require("mongoose");
const prisma = require("../db/prisma");
const Survey = require("../models/survey");
const { findEventOrFail } = require("./eventService");
const { badRequest, conflict, forbidden, notFound } = require("../utils/httpError");

const WRITABLE = ["rating", "comment", "wouldRecommend", "aspects"];
const SORTABLE = ["createdAt", "rating"];

// POST /api/surveys  { registrationId, rating, comment?, wouldRecommend?, aspects? }
const createSurvey = async (userId, body = {}) => {
  const registrationId = Number(body.registrationId);
  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    throw badRequest("El registrationId es obligatorio y debe ser un entero positivo");
  }

  // 1) Validar contra PostgreSQL con Prisma: existe (404) y es del usuario del token (403)
  const registration = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!registration) throw notFound("La inscripción no existe en PostgreSQL");
  if (registration.userId !== userId) throw forbidden("Solo el asistente inscrito puede responder esta encuesta");
  if (registration.status !== "CONFIRMADA") throw conflict("La inscripción está cancelada: no admite encuesta");
  if (!registration.eventId) throw conflict("El evento de esta inscripción ya no existe");

  // 2) Crear en MongoDB. userId sale del JWT y attendeeName se COPIA de PostgreSQL.
  //    El índice único registrationId da E11000 → 409 si ya respondió.
  const data = Object.fromEntries(WRITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  return Survey.create({
    ...data,
    event: registration.eventId,
    registrationId: registration.id,
    userId,
    attendeeName: registration.attendeeName,
  });
};

// GET /api/events/:id/surveys?sort=-rating&limit=20 → lista con populate
const listSurveysByEvent = async (eventId, { sort, limit } = {}) => {
  await findEventOrFail(eventId); // 400 / 404

  let order = { createdAt: -1 };
  if (sort) {
    const key = String(sort).replace(/^-/, "");
    if (!SORTABLE.includes(key)) throw badRequest(`No se puede ordenar por "${key}". Use: ${SORTABLE.join(", ")}`);
    order = { [key]: String(sort).startsWith("-") ? -1 : 1 };
  }
  const max = Math.min(Math.max(Number(limit) || 50, 1), 100);

  return Survey.find({ event: eventId })
    .populate("event", "code title startDate")
    .sort(order)
    .limit(max)
    .lean();
};

// GET /api/events/:id/surveys/summary → aggregate: promedio, conteo y distribución
const surveySummary = async (eventId) => {
  const event = await findEventOrFail(eventId);

  const [result] = await Survey.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(String(eventId)) } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              avgRating: { $avg: "$rating" },
              recommend: { $sum: { $cond: ["$wouldRecommend", 1, 0] } },
            },
          },
        ],
        byRating: [{ $group: { _id: "$rating", count: { $sum: 1 } } }, { $sort: { _id: -1 } }],
      },
    },
  ]);

  const t = (result && result.totals[0]) || { total: 0, avgRating: null, recommend: 0 };
  return {
    event: { _id: event._id, code: event.code, title: event.title },
    total: t.total,
    avgRating: t.avgRating === null ? null : Math.round(t.avgRating * 100) / 100,
    recommendPct: t.total ? Math.round((t.recommend / t.total) * 100) : 0,
    byRating: ((result && result.byRating) || []).map((r) => ({ rating: r._id, count: r.count })),
  };
};

module.exports = { createSurvey, listSurveysByEvent, surveySummary };
