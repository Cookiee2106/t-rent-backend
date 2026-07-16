const express = require("express");

const authRoutes = require("../modules/auth/authRoutes");
const deviceModelRoutes = require("../modules/deviceModels/deviceModelRoutes");
const adminEquipmentModelRoutes = require("../modules/adminEquipmentModels/adminEquipmentModelRoutes");
const cartRouter = require("../modules/cart/cartRoutes");
const customerRoutes = require("../modules/customer/customerRoutes");
const adminRoutes = require("../modules/admin/adminRoutes");
const paymentRoutes = require("../modules/payments/paymentRoutes");
const orderRouter = require("../modules/order/orderRoutes");
const customerOrderRoutes = require("../modules/customerOrders/customerOrderRoutes");
const settlementRoutes = require("../modules/settlements/settlementRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/equipment-models", deviceModelRoutes);
router.use("/admin/equipment-models", adminEquipmentModelRoutes);
router.use("/cart", cartRouter);
router.use("/me", customerRoutes);
router.use("/admin", adminRoutes);
router.use("/", paymentRoutes);
router.use("/", orderRouter);
router.use("/me/orders", customerOrderRoutes);
router.use("/admin/settlements", settlementRoutes);

module.exports = router;
