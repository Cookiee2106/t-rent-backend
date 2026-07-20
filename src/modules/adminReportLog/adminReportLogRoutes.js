const express = require("express");

const {
  layBaoCaoDoanhThu,
  layBaoCaoTonKho,
  layDanhSachNhatKyThaoTac,
  layChiTietNhatKyThaoTac,
} = require("./adminReportLogController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroQuanTri = ["QUAN_TRI", "QUAN_TRI_VIEN", "QUẢN_TRỊ_VIÊN"];

router.get(
  "/reports/revenue",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layBaoCaoDoanhThu
);

router.get(
  "/reports/inventory",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layBaoCaoTonKho
);

router.get(
  "/audit-logs",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachNhatKyThaoTac
);

router.get(
  "/audit-logs/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layChiTietNhatKyThaoTac
);

module.exports = router;
