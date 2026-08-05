const express = require("express");

const {
  layDanhSachNgam,
  taoNgam,
  capNhatNgam,
  capNhatTrangThaiNgam,
} = require("./equipmentMountController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroNoiBo = [
  "NHAN_VIEN",
  "QUAN_TRI",
  "QUAN_TRI_VIEN",
];

// Module ngàm tự kiểm tra đăng nhập và vai trò.
router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

router.get("/", layDanhSachNgam);
router.post("/", taoNgam);

router.put("/:mountId/status", capNhatTrangThaiNgam);
router.patch("/:mountId/status", capNhatTrangThaiNgam);

router.put("/:mountId", capNhatNgam);
router.patch("/:mountId", capNhatNgam);

module.exports = router;
