const { Router } = require("express");
const surveyController = require("../controllers/surveyController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

router.post("/", authenticateToken, surveyController.createSurvey);

module.exports = router;
