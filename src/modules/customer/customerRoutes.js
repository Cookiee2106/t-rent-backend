const router = require("express").Router();
const upload = require("../../middlewares/uploadMiddleware");
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const customerController = require("./customerController");

router.use(authMiddleware);
router.use(roleMiddleware("KHACH_HANG"));

// ============================================================
// Người 1: Các API quản lý tài khoản & xác minh
// ============================================================
router.get("/account", customerController.getAccount);
router.put("/account/profile", customerController.updateProfile);
router.post(
  "/verifications",
  upload.fields([
    { name: "anh_mat_truoc", maxCount: 1 },
    { name: "anh_mat_sau", maxCount: 1 },
  ]),
  customerController.submitVerification
);

// ============================================================
// API #4, #5, #6: Quản lý đơn thuê
// ============================================================
router.get("/orders", customerController.getOrders);
router.get("/orders/:id", customerController.getOrderDetail);
router.patch("/orders/:id/cancel", customerController.cancelOrder);

module.exports = router;
