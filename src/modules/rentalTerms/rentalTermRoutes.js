const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const rentalTermController = require("./rentalTermController");

router.get("/current", rentalTermController.getCurrentTerms);
router.post("/accept", authMiddleware, rentalTermController.acceptTerms);

module.exports = router;
