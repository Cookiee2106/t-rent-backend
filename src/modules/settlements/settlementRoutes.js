// Import express để tạo router.
const express = require("express");

// Import multer để nhận file ảnh khi trả từ form-data.
const multer = require("multer");

// Import các controller của module thanh lý.
const {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,
} = require("./settlementController");

// Import middleware xác thực đăng nhập.
const xacThucDangNhap = require("../../middlewares/authMiddleware");

// Import middleware kiểm tra vai trò.
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

// Tạo router cho module thanh lý.
const router = express.Router();

// Danh sách vai trò nội bộ được phép dùng chức năng thanh lý.
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

// Cấu hình multer lưu file trong RAM.
// Sau đó service sẽ upload file.buffer lên Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),

  // Giới hạn mỗi ảnh tối đa 5MB.
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// Lấy danh sách đơn thanh lý.
// URL đầy đủ: GET /api/admin/settlements
router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachThanhLy
);

// Lập phiếu trả / thanh lý.
// URL đầy đủ: POST /api/admin/settlements/:orderId/return
// Field file trong form-data là: anh_khi_tra
router.post(
  "/:orderId/return",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  upload.array("anh_khi_tra", 10),
  lapPhieuTra
);

// Xem chi tiết thanh lý.
// URL đầy đủ: GET /api/admin/settlements/:orderId
router.get(
  "/:orderId",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietThanhLy
);

// Export router để routes/index.js dùng.
module.exports = router;