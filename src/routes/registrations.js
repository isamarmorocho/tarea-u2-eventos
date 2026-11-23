const { Router } = require("express");
const registrationController = require("../controllers/registrationController");
const authenticateToken = require("../middlewares/auth");
const router = Router();

router.post("/", authenticateToken, registrationController.createRegistration);
router.get("/me", authenticateToken, registrationController.listMyRegistrations);
router.get("/:id", authenticateToken, registrationController.getRegistration);
router.patch("/:id/cancel", authenticateToken, registrationController.cancelRegistration);

module.exports = router;
