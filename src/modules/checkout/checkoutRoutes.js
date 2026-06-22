const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const checkoutController = require("./checkoutController");

router.use(authMiddleware);

router.post("/", checkoutController.createCheckoutSession);
router.get("/:id", checkoutController.getCheckoutSession);

module.exports = router;
