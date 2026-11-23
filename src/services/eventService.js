// Catálogo de eventos (MongoDB) + reglas que dependen de PostgreSQL
const mongoose = require("mongoose");
const prisma = require("../db/prisma");
const Event = require("../models/event");
const Survey = require("../models/survey");
const { badRequest, conflict, notFound } = require("../utils/httpError");

// Campos que el cliente puede enviar (no _id, ni createdAt, ni virtuals)
const WRITABLE = ["code", "title", "description", "category", "status", "sede", "agenda", "capacity", "price", "startDate", "endDate", "tags"];
// Campos permitidos en ?fields= y ?sort=
const PROJECTABLE = [...WRITABLE, "createdAt", "updatedAt"];
const SORTABLE = ["title", "code", "startDate", "capacity", "price", "createdAt"];

const pick = (obj = {}, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertObjectId = (id, label = "id") => {
  if (!mongoose.isValidObjectId(id) || String(new mongoose.Types.ObjectId(id)) !== String(id)) {
    throw badRequest(`El ${label} "${id}" no es un ObjectId válido`);
  }
};

const countConfirmed = (eventId) => prisma.registration.count({ where: { eventId, status: "CONFIRMADA" } });

// GET /api/events?q=&fields=&sort=&category=
const listEvents = async ({ q, fields, sort, category } = {}) => {
  const filter = {};
  if (q) filter.title = { $regex: escapeRegex(String(q)), $options: "i" }; // regex sin distinguir mayúsculas
  if (category) filter.category = String(category).toUpperCase();

  // Proyección: ?fields=title,code,startDate
  let projection;
  if (fields) {
    const requested = String(fields).split(",").map((f) => f.trim()).filter(Boolean);
    const invalid = requested.filter((f) => !PROJECTABLE.some((p) => f === p || f.startsWith(`${p}.`)));
    if (invalid.length) throw badRequest(`Campos no permitidos en fields: ${invalid.join(", ")}`);
    projection = requested.join(" ");
  }

  // Orden: ?sort=-startDate,title ("-" = descendente)
  let order = { startDate: 1 };
  if (sort) {
    order = {};
    for (const part of String(sort).split(",").map((s) => s.trim()).filter(Boolean)) {
      const key = part.replace(/^-/, "");
      if (!SORTABLE.includes(key)) throw badRequest(`No se puede ordenar por "${key}". Use: ${SORTABLE.join(", ")}`);
      order[key] = part.startsWith("-") ? -1 : 1;
    }
  }

  const query = Event.find(filter).sort(order);
  if (projection) query.select(projection);
  return query;
};

const findEventOrFail = async (id) => {
  assertObjectId(id);
  const event = await Event.findById(id);
  if (!event) throw notFound("Evento no encontrado");
  return event;
};

// Detalle con la agenda completa y los cupos (contados en PostgreSQL)
const getEvent = async (id) => {
  const event = await findEventOrFail(id);
  const taken = await countConfirmed(id);
  return { ...event.toJSON(), seatsTaken: taken, seatsAvailable: Math.max(event.capacity - taken, 0) };
};

const createEvent = async (data) => {
  const event = new Event(pick(data, WRITABLE));
  return event.save(); // ValidationError → 400 / E11000 en code → 409 (errorHandler)
};

// PUT con findById + save(): corre validaciones, pre("validate") y virtuals
const updateEvent = async (id, data) => {
  const event = await findEventOrFail(id);
  const changes = pick(data, WRITABLE);

  // El aforo no puede quedar por debajo de los inscritos confirmados
  if (changes.capacity !== undefined) {
    const taken = await countConfirmed(id);
    if (Number(changes.capacity) < taken) {
      throw conflict(`El aforo no puede ser menor que los ${taken} inscritos confirmados`);
    }
  }

  event.set(changes);
  return event.save();
};

// Borrado protegido: 409 si PostgreSQL lo usa; si no, cascada en MongoDB
const deleteEvent = async (id) => {
  const event = await findEventOrFail(id);

  const confirmed = await countConfirmed(id);
  if (confirmed > 0) {
    throw conflict(`No se puede eliminar: el evento tiene ${confirmed} inscripción(es) confirmada(s) en PostgreSQL`, { confirmed });
  }

  // 1) MongoDB: borra en cascada las encuestas del evento
  const { deletedCount: surveysDeleted } = await Survey.deleteMany({ event: event._id });
  // 2) PostgreSQL: las inscripciones canceladas quedan como historial, sin evento (eventId String? → null)
  const { count: registrationsDetached } = await prisma.registration.updateMany({ where: { eventId: id }, data: { eventId: null } });
  // 3) MongoDB: el evento
  await event.deleteOne();

  return { message: "Evento eliminado", surveysDeleted, registrationsDetached };
};

module.exports = { assertObjectId, listEvents, findEventOrFail, getEvent, createEvent, updateEvent, deleteEvent };
