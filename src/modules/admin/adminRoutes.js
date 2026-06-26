const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const upload = require("../../middlewares/uploadMiddleware");
const adminController = require("./adminController");
const contractsController = require("../contracts/contractsController");
const handoverController = require("../handover/handoverController");
const returnController = require("../return/returnController");

router.use(authMiddleware);
router.use(roleMiddleware("NHAN_VIEN", "QUAN_TRI"));

// ============================================================
// Người 1: Các API quản lý xác minh khách hàng
// ============================================================
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

// ============================================================
// API #7, #8, #9: Quản lý đơn thuê
// ============================================================
router.get("/orders", adminController.getOrders);
router.get("/orders/:id", adminController.getOrderDetail);
router.get("/orders/:id/available-assets", adminController.getAvailableAssets);

// ============================================================
// API #10: Upload hợp đồng giấy
// ============================================================
router.post("/orders/:id/contract-file", upload.single("file"), contractsController.uploadContract);

// ============================================================
// API #11, #12: Bàn giao thiết bị
// ============================================================
router.post("/orders/:id/handover-images", upload.array("images", 10), handoverController.uploadHandoverImages);
router.post("/orders/:id/handover", handoverController.createHandover);

// ============================================================
// API #13, #14: Danh sách & chi tiết thanh lý
// ============================================================
router.get("/contract-liquidations", returnController.getLiquidationsList);
router.get("/contract-liquidations/:id", returnController.getLiquidationDetail);

// ============================================================
// API #15, #16: Trả thiết bị
// ============================================================
router.post("/contract-liquidations/:id/return-images", upload.array("images", 10), returnController.uploadReturnImages);
router.post("/contract-liquidations/:id/return-inspection", returnController.createReturnInspection);

// ============================================================
// API #17, #18: Xử lý cọc
// ============================================================
router.post("/contract-liquidations/:id/refund-deposit", returnController.processRefundDeposit);
router.post("/contract-liquidations/:id/deduct-deposit", returnController.processDeductDeposit);

// ============================================================
// API #19: Bảo trì thiết bị
// ============================================================
router.post("/contract-liquidations/:id/maintenance", returnController.createMaintenanceRecord);

module.exports = router;
