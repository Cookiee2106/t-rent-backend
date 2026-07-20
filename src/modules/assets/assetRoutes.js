const express = require("express");

const {
  layDanhSachThietBiVatLy,
  layChiTietThietBiVatLy,
  themThietBiVatLy,
  capNhatThietBiVatLy,
  capNhatTrangThaiThietBiVatLy,
  xoaMemThietBiVatLy,
} = require("./assetController");

const {
  taoHoSoBaoTriTuThietBi,
} = require("../maintenances/maintenanceController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachThietBiVatLy
);

router.get(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietThietBiVatLy
);

router.post(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  themThietBiVatLy
);

router.put(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatThietBiVatLy
);

router.put(
  "/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatTrangThaiThietBiVatLy
);

router.delete(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  xoaMemThietBiVatLy
);

router.post(
  "/:id/maintenance",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  taoHoSoBaoTriTuThietBi
);

module.exports = router;
