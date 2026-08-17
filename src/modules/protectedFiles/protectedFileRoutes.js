const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const {
  xemNoiDungAnhXacMinh,
  xemNoiDungTepDonThue,
} = require("./protectedFileController");

const router = express.Router();

// Tất cả nội dung protected đều bắt buộc Bearer token.
router.get(
  "/verifications/:hoSoId/:loaiAnh/content",
  xacThucDangNhap,
  xemNoiDungAnhXacMinh
);

router.get(
  "/orders/:fileId/content",
  xacThucDangNhap,
  xemNoiDungTepDonThue
);

module.exports = router;
