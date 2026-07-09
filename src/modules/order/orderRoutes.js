const express = require("express");
const multer = require("multer");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");
const {
  layDanhSachDonThue,
  layChiTietDonThue,
  layThietBiSanSang,
  lapPhieuBanGiao,
  layFileDonThue,
} = require("./orderController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const VAI_TRO_NHAN_VIEN = ["NHAN_VIEN", "QUAN_TRI"];

// GET /api/admin/orders
router.get("/admin/orders", xacThucDangNhap, kiemTraVaiTro(VAI_TRO_NHAN_VIEN), layDanhSachDonThue);

// GET /api/admin/orders/:id
router.get("/admin/orders/:id", xacThucDangNhap, kiemTraVaiTro(VAI_TRO_NHAN_VIEN), layChiTietDonThue);

// GET /api/admin/assets/available
router.get("/admin/assets/available", xacThucDangNhap, kiemTraVaiTro(VAI_TRO_NHAN_VIEN), layThietBiSanSang);

// POST /api/admin/orders/:id/handover
router.post(
  "/admin/orders/:id/handover",
  xacThucDangNhap,
  kiemTraVaiTro(VAI_TRO_NHAN_VIEN),
  upload.fields([
    { name: "hop_dong_giay", maxCount: 5 },
    { name: "anh_ban_giao", maxCount: 10 },
  ]),
  lapPhieuBanGiao
);

// GET /api/admin/orders/:id/files
router.get("/admin/orders/:id/files", xacThucDangNhap, kiemTraVaiTro(VAI_TRO_NHAN_VIEN), layFileDonThue);

module.exports = router;
