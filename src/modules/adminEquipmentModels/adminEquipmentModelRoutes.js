const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");
const {
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
  layDanhSachBoDiKemAdmin,
  layGoiYBoDiKemAdmin,
  taoBoDiKemAdmin,
  xoaBoDiKemAdmin,
} = require("./adminEquipmentModelController");

const router = express.Router();

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

router.post("/", taoMauThietBiAdmin);
router.patch("/:id", capNhatMauThietBiAdmin);
router.patch("/:id/status", capNhatTrangThaiMauThietBiAdmin);
router.get("/:id/bundles", layDanhSachBoDiKemAdmin);
router.get("/:id/bundle-options", layGoiYBoDiKemAdmin);
router.post("/:id/bundles", taoBoDiKemAdmin);
router.delete("/:id/bundles/:bundleId", xoaBoDiKemAdmin);

module.exports = router;
