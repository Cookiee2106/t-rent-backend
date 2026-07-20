const express = require("express");
const multer = require("multer");

const {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,
} = require("./settlementController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachThanhLy
);

router.post(
  "/:orderId/return",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  upload.array("anh_khi_tra", 10),
  lapPhieuTra
);

router.get(
  "/:orderId",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietThanhLy
);

module.exports = router;
