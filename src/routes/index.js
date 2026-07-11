const express = require("express");

const authRoutes = require("../modules/auth/authRoutes");
const deviceModelRoutes = require("../modules/deviceModels/deviceModelRoutes");
const cartRouter = require("../modules/cart/cartRoutes");
const customerRoutes = require("../modules/customer/customerRoutes");
const adminRoutes = require("../modules/admin/adminRoutes");
const paymentRouter = require("../modules/payments/paymentRoutes");
const orderRouter = require("../modules/order/orderRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/equipment-models", deviceModelRoutes);
router.use("/cart", cartRouter);
router.use("/me", customerRoutes);
router.use("/admin", adminRoutes);
// Payment: /api/payment-sessions/:id & /api/payment-webhooks
router.use("/", paymentRouter);
// Order management: /api/admin/orders, /api/admin/assets/available, etc.
router.use("/", orderRouter);

module.exports = router;
