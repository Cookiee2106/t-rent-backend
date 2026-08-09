const express = require("express");
const {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  guiYeuCauHuyDonCuaToi,
} = require("./customerOrderController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", xacThucDangNhap, layDanhSachDonCuaToi);
router.post("/:id/cancel-request", xacThucDangNhap, guiYeuCauHuyDonCuaToi);
router.get("/:id", xacThucDangNhap, layChiTietDonCuaToi);

module.exports = router;
