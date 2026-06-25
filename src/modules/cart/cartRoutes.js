const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const cartController = require("./cartController");

router.use(authMiddleware);
router.use(roleMiddleware("KHACH_HANG"));

// ============================================================
// Cart API - chỉ khách hàng đã xác minh
// ============================================================
router.post("/items", cartController.addCartItem);
router.get("/", cartController.getCart);
router.delete("/items/:id", cartController.removeCartItem);

module.exports = router;
