const express = require("express");
const authRoutes = require("../modules/auth/authRoutes");
const deviceModelRoutes = require("../modules/deviceModels/deviceModelRoutes");
const customerRoutes = require("../modules/customer/customerRoutes");
const adminRoutes = require("../modules/admin/adminRoutes");
const paymentRoutes = require("../modules/payments/paymentRoutes");
const customerOrderRoutes = require("../modules/customerOrders/customerOrderRoutes");
const settlementRoutes = require("../modules/settlements/settlementRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/equipment-models", deviceModelRoutes);
router.use("/me", customerRoutes);
router.use("/admin", adminRoutes);

// Payment:
// POST /api/cart/checkout
// GET  /api/payment-sessions/:id
// GET  /api/payment-return/vnpay
router.use("/", paymentRoutes);
router.use("/me/orders", customerOrderRoutes);
router.use("/admin/settlements", settlementRoutes);

module.exports = router;