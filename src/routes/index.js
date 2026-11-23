const { Router } = require("express");
const authRouter = require("./auth");
const adminRouter = require("./admin");
const reservations = require("./reservations");
const appointments = require("./appointments");
const specialities = require("./specialties");
const events = require("./events");
const registrations = require("./registrations");
const surveys = require("./surveys");

const router = Router();

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/specialties", specialities);
router.use("/reservations", reservations);
router.use("/users", appointments);

// Tarea U2 · Caso 10 · Eventos
router.use("/events", events);
router.use("/registrations", registrations);
router.use("/surveys", surveys);

module.exports = router;
