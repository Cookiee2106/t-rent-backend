const express = require("express");
const multer = require("multer");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const {
  layDanhSachDonThue,
  layChiTietDonThue,
  layThietBiSanSang,
  lapPhieuBanGiao,
} = require("./orderController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/admin/orders",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachDonThue
);

router.get(
  "/admin/assets/available",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layThietBiSanSang
);

router.get(
  "/admin/orders/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietDonThue
);

router.post(
  "/admin/orders/:id/handover",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  upload.fields([
    { name: "hop_dong_giay", maxCount: 5 },
    { name: "anh_ban_giao", maxCount: 5 },
  ]),
  lapPhieuBanGiao
);

module.exports = router;
