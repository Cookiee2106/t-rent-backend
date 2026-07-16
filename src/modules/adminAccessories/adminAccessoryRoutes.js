const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");
const {
  layDanhSachPhuKienAdmin,
  layChiTietPhuKienAdmin,
  taoPhuKienAdmin,
  capNhatPhuKienAdmin,
  xoaMemPhuKienAdmin,
} = require("./adminAccessoryController");

const router = express.Router();

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

router.get("/", layDanhSachPhuKienAdmin);
router.get("/:id", layChiTietPhuKienAdmin);
router.post("/", taoPhuKienAdmin);
router.patch("/:id", capNhatPhuKienAdmin);
router.delete("/:id", xoaMemPhuKienAdmin);

module.exports = router;
