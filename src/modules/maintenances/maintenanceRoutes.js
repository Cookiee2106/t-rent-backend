const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const {
  layDanhSachHoSoBaoTri,
  layChiTietHoSoBaoTri,
  taoHoSoBaoTriTuThietBi,
  capNhatKetQuaBaoTri,
} = require("./maintenanceController");

const router = express.Router();
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

// GET /api/admin/maintenances
router.get("/", xacThucDangNhap, kiemTraVaiTro(vaiTroNoiBo), layDanhSachHoSoBaoTri);

// POST /api/admin/maintenances/from-asset/:id
router.post(
  "/from-asset/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  taoHoSoBaoTriTuThietBi
);

// GET /api/admin/maintenances/:id
router.get("/:id", xacThucDangNhap, kiemTraVaiTro(vaiTroNoiBo), layChiTietHoSoBaoTri);

// PUT /api/admin/maintenances/:id/result
router.put(
  "/:id/result",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatKetQuaBaoTri
);

module.exports = router;
