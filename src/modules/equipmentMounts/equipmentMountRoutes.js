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

// Chỉ Quản trị viên được quản lý nhu cầu/ngàm.
// Nhân viên không được cấp quyền vào module này.
const vaiTroQuanTri = [
  "QUAN_TRI",
  "QUAN_TRI_VIEN",
  "QUẢN_TRỊ_VIÊN",
];

// Module ngàm: bắt buộc đăng nhập và chỉ Quản trị viên được phép quản lý.
router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroQuanTri));

router.get("/", layDanhSachNgam);
router.post("/", taoNgam);

router.put("/:mountId/status", capNhatTrangThaiNgam);
router.patch("/:mountId/status", capNhatTrangThaiNgam);

router.put("/:mountId", capNhatNgam);
router.patch("/:mountId", capNhatNgam);

module.exports = router;
