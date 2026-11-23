// Inscripción al evento (PostgreSQL) validando el catálogo en MongoDB
const crypto = require("crypto");
const prisma = require("../db/prisma");
const Event = require("../models/event");
const { assertObjectId } = require("./eventService");
const { badRequest, conflict, forbidden, notFound } = require("../utils/httpError");

const newTicketCode = () => `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const parseId = (id) => {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`El id "${id}" debe ser un entero positivo`);
  return n;
};

// POST /api/registrations  { eventId, attendeeName?, attendeeEmail? }
const createRegistration = async (userId, { eventId, attendeeName, attendeeEmail } = {}) => {
  // 1) Validar contra MongoDB: el _id existe (isValidObjectId + findById)
  if (!eventId) throw badRequest("El eventId es obligatorio");
  assertObjectId(eventId, "eventId");
  const event = await Event.findById(eventId).select("title capacity status").lean();
  if (!event) throw notFound("El evento no existe en el catálogo (MongoDB)");
  if (event.status !== "PUBLICADO") throw conflict(`El evento está ${event.status} y no admite inscripciones`);

  // 2) Datos del asistente desde PostgreSQL (el token solo trae id y role)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("El usuario del token no existe");

  // 3) Mensaje claro si ya está inscrito (el @@unique también lo protege: P2002 → 409)
  const existing = await prisma.registration.findFirst({ where: { userId, eventId } });
  if (existing) throw conflict("Ya tiene una inscripción para este evento", { registrationId: existing.id, status: existing.status });

  // 4) Aforo = límite duro. Transacción + candado por evento: dos peticiones
  //    simultáneas no pueden ocupar el último cupo a la vez.
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}::text))`;
    const taken = await tx.registration.count({ where: { eventId, status: "CONFIRMADA" } });
    if (taken >= event.capacity) {
      throw conflict(`Aforo completo: ${taken}/${event.capacity} cupos ocupados`, { capacity: event.capacity, taken });
    }
    return tx.registration.create({
      data: {
        userId, // del JWT
        eventId, // _id de MongoDB guardado como String
        attendeeName: (attendeeName || user.name).trim(),
        attendeeEmail: (attendeeEmail || user.email).trim().toLowerCase(),
        ticketCode: newTicketCode(),
      },
    });
  });
};

// GET /api/registrations/me → PostgreSQL + MongoDB unidos con $in + Map (2 consultas, sin N+1)
const listMyRegistrations = async (userId) => {
  const registrations = await prisma.registration.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const ids = [...new Set(registrations.map((r) => r.eventId).filter(Boolean))];
  const events = ids.length
    ? await Event.find({ _id: { $in: ids } })
        .select("code title category startDate endDate sede.name sede.city status")
        .lean()
    : [];
  const byId = new Map(events.map((e) => [String(e._id), e]));

  return registrations.map((r) => ({ ...r, event: r.eventId ? byId.get(r.eventId) ?? null : null }));
};

const findOwnedRegistration = async (user, id) => {
  const registration = await prisma.registration.findUnique({ where: { id: parseId(id) } });
  if (!registration) throw notFound("Inscripción no encontrada");
  if (registration.userId !== user.id && user.role !== "ADMIN") {
    throw forbidden("La inscripción pertenece a otro usuario");
  }
  return registration;
};

const getRegistration = async (user, id) => {
  const registration = await findOwnedRegistration(user, id);
  const event = registration.eventId
    ? await Event.findById(registration.eventId).select("code title startDate sede agenda").lean()
    : null;
  return { ...registration, event };
};

// PATCH /api/registrations/:id/cancel → libera el cupo
const cancelRegistration = async (user, id) => {
  const registration = await findOwnedRegistration(user, id);
  if (registration.status === "CANCELADA") throw conflict("La inscripción ya está cancelada");
  return prisma.registration.update({ where: { id: registration.id }, data: { status: "CANCELADA" } });
};

module.exports = { createRegistration, listMyRegistrations, getRegistration, cancelRegistration };
