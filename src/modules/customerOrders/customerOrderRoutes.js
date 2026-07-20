const express = require("express");
const {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  huyDonCuaToi,
} = require("./customerOrderController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", xacThucDangNhap, layDanhSachDonCuaToi);
router.patch("/:id/cancel", xacThucDangNhap, huyDonCuaToi);
router.get("/:id", xacThucDangNhap, layChiTietDonCuaToi);

module.exports = router;
