const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");
const {
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
} = require("./adminEquipmentModelController");

const router = express.Router();

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

router.post("/", taoMauThietBiAdmin);
router.patch("/:id", capNhatMauThietBiAdmin);
router.patch("/:id/status", capNhatTrangThaiMauThietBiAdmin);

module.exports = router;
