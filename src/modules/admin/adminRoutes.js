const router = require("express").Router();
const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const upload = require("../../middlewares/uploadMiddleware");
const adminController = require("./adminController");

router.use(express.json());
router.use(authMiddleware);
router.use(roleMiddleware("STAFF", "ADMIN"));

router.get("/customer-accounts", adminController.getCustomerAccounts);
router.get("/customer-accounts/:id", adminController.getCustomerAccountDetail);
router.patch(
  "/customer-accounts/:id/approve-verification",
  adminController.approveVerification
);
router.patch(
  "/customer-accounts/:id/reject-verification",
  adminController.rejectVerification
);

// ─── Orders ───
router.get("/orders", adminController.getOrders);
router.get("/orders/:id", adminController.getOrderDetail);
router.get("/orders/:id/available-assets", adminController.getAvailableAssets);

// ─── Handover ───
router.post("/orders/:id/contract-file", upload.single("file"), adminController.uploadContractFile);
router.post("/orders/:id/handover-images", upload.array("images", 10), adminController.uploadHandoverImages);
router.post("/orders/:id/handover", upload.array("images", 10), adminController.createHandover);

// ─── Giai đoạn 3: Thanh lý hợp đồng (Return) ───
router.get("/contract-liquidations", adminController.getLiquidations);
router.get("/contract-liquidations/:id", adminController.getLiquidationDetail);
router.post("/contract-liquidations/:id/return-images", upload.array("images", 10), adminController.uploadReturnImages);
router.post("/contract-liquidations/:id/return-inspection", adminController.createReturnInspection);
router.post("/contract-liquidations/:id/refund-deposit", adminController.processRefundDeposit);
router.post("/contract-liquidations/:id/deduct-deposit", adminController.processDeductDeposit);
router.post("/contract-liquidations/:id/maintenance", adminController.createMaintenanceRecord);

module.exports = router;
