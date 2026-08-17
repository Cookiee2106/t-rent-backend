const express = require("express");

const {
  layDanhSachNhuCau,
  taoNhuCau,
  capNhatNhuCau,
  capNhatTrangThaiNhuCau,
} = require("./equipmentNeedController");

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

// Module nhu cầu: bắt buộc đăng nhập và chỉ Quản trị viên được phép quản lý.
router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroQuanTri));

router.get("/", layDanhSachNhuCau);
router.post("/", taoNhuCau);

router.put("/:needId/status", capNhatTrangThaiNhuCau);
router.patch("/:needId/status", capNhatTrangThaiNhuCau);

router.put("/:needId", capNhatNhuCau);
router.patch("/:needId", capNhatNhuCau);

module.exports = router;
