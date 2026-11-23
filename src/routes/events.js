const { Router } = require("express");
const eventController = require("../controllers/eventController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

// Lecturas públicas: el catálogo se lee muchísimo
router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.get("/:id/surveys", eventController.listSurveys);
router.get("/:id/surveys/summary", eventController.surveySummary);

// Escrituras protegidas con el JWT del login (usuarios en PostgreSQL)
router.post("/", authenticateToken, eventController.createEvent);
router.put("/:id", authenticateToken, eventController.updateEvent);
router.delete("/:id", authenticateToken, eventController.deleteEvent);

module.exports = router;
