const express = require("express");
const {
  dangKy,
  dangNhap,
  layThongTinCuaToi,
} = require("./authController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const router = express.Router();

router.post("/register", dangKy);
router.post("/login", dangNhap);
router.get("/me", xacThucDangNhap, layThongTinCuaToi);

module.exports = router;