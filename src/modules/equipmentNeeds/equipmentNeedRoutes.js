const express = require("express");

const {
  layDanhSachNhuCau,
  taoNhuCau,
  capNhatNhuCau,
  capNhatTrangThaiNhuCau,
} = require("./equipmentNeedController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroNoiBo = [
  "NHAN_VIEN",
  "QUAN_TRI",
  "QUAN_TRI_VIEN",
];

// Module nhu cầu tự kiểm tra đăng nhập và vai trò.
router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

router.get("/", layDanhSachNhuCau);
router.post("/", taoNhuCau);

router.put("/:needId/status", capNhatTrangThaiNhuCau);
router.patch("/:needId/status", capNhatTrangThaiNhuCau);

router.put("/:needId", capNhatNhuCau);
router.patch("/:needId", capNhatNhuCau);

module.exports = router;
