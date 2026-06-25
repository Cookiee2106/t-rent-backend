const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const checkoutController = require("./checkoutController");

router.use(authMiddleware);
router.use(roleMiddleware("KHACH_HANG"));

// ============================================================
// Checkout API - chỉ KHACH_HANG đã xác minh
// ============================================================
router.post("/", checkoutController.createCheckoutSession);
router.get("/:id", checkoutController.getCheckoutSession);

module.exports = router;
