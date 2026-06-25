const router = require("express").Router();
const deviceModelController = require("./deviceModelController");

// ============================================================
// Public API: Danh sách & chi tiết mẫu thiết bị (chỉ HOAT_DONG)
// ============================================================
router.get("/", deviceModelController.getDeviceModels);
router.get("/:id", deviceModelController.getDeviceModelDetail);

module.exports = router;
