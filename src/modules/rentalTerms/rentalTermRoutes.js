const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const rentalTermController = require("./rentalTermController");

// ============================================================
// Public: Lấy điều khoản thuê hiện hành
// ============================================================
router.get("/current", rentalTermController.getCurrentTerms);

// ============================================================
// Chỉ KHACH_HANG đã xác minh: Chấp nhận điều khoản
// ============================================================
router.post(
  "/accept",
  authMiddleware,
  roleMiddleware("KHACH_HANG"),
  rentalTermController.acceptTerms
);

module.exports = router;
