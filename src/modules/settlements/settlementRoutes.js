const express = require("express");
const multer = require("multer");

const {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,

  // capNhatThanhLy,
  // huyThanhLy,
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

// Lấy danh sách hợp đồng cần thanh lý.
router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachThanhLy
);

// Lập phiếu trả / xác nhận thanh lý.
router.post(
  "/:orderId/return",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  upload.array("anh_khi_tra", 10),
  lapPhieuTra
);

// Xem chi tiết thanh lý.
router.get(
  "/:orderId",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietThanhLy
);

/*
  CẬP NHẬT THANH LÝ - ĐANG COMMENT

  Mở nếu thầy yêu cầu:
  - Sửa ghi chú thanh lý
  - Sửa lý do phát sinh
  - Sửa tiền hoàn cọc / khấu trừ / phụ thu

router.put(
  "/:orderId",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatThanhLy
);
*/

/*
  HỦY THANH LÝ - ĐANG COMMENT

  Khác với "xóa khỏi giao diện".
  Hủy thanh lý là hoàn tác dữ liệu thanh lý trong DB.

router.patch(
  "/:orderId/cancel",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  huyThanhLy
);
*/

module.exports = router;