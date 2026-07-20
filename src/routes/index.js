const express = require("express");

const authRoutes = require("../modules/auth/authRoutes");
const equipmentCategoryRoutes = require("../modules/equipmentCategories/equipmentCategoryRoutes");
const deviceModelRoutes = require("../modules/deviceModels/deviceModelRoutes");
const adminAccessoryRoutes = require("../modules/adminAccessories/adminAccessoryRoutes");
const adminEquipmentModelRoutes = require("../modules/adminEquipmentModels/adminEquipmentModelRoutes");
const cartRouter = require("../modules/cart/cartRoutes");
const customerRoutes = require("../modules/customer/customerRoutes");
const adminRoutes = require("../modules/admin/adminRoutes");
const paymentRoutes = require("../modules/payments/paymentRoutes");
const orderRouter = require("../modules/order/orderRoutes");
const customerOrderRoutes = require("../modules/customerOrders/customerOrderRoutes");
const settlementRoutes = require("../modules/settlements/settlementRoutes");
const employeeRoutes = require("../modules/employees/employeeRoutes");
const assetRoutes = require("../modules/assets/assetRoutes");
const maintenanceRoutes = require("../modules/maintenances/maintenanceRoutes");
const equipmentBrandRoutes = require("../modules/equipmentBrand/equipmentBrandRoutes");
const warehouseLocationRoutes = require("../modules/warehouseLocation/warehouseLocationRoutes");
const adminReportLogRoutes = require("../modules/adminReportLog/adminReportLogRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/equipment-categories", equipmentCategoryRoutes);
router.use("/equipment-models", deviceModelRoutes);
router.use("/admin/accessories", adminAccessoryRoutes);
router.use("/admin/equipment-models", adminEquipmentModelRoutes);
router.use("/cart", cartRouter);
router.use("/me", customerRoutes);
router.use("/admin", adminRoutes);
router.use("/", paymentRoutes);
router.use("/", orderRouter);
router.use("/me/orders", customerOrderRoutes);
router.use("/admin/settlements", settlementRoutes);
router.use("/admin/employees", employeeRoutes);
router.use("/admin/assets", assetRoutes);
router.use("/admin/maintenances", maintenanceRoutes);
router.use("/equipment-brands", equipmentBrandRoutes);
router.use("/warehouse-locations", warehouseLocationRoutes);
router.use("/admin", adminReportLogRoutes);

module.exports = router;
