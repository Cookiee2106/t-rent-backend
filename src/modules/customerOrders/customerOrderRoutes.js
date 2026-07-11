// Import express để tạo router.
const express = require("express");

// Import controller đơn cá nhân.
const {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  huyDonCuaToi,
} = require("./customerOrderController");

// Import middleware xác thực đăng nhập.
const xacThucDangNhap = require("../../middlewares/authMiddleware");

// Tạo router.
const router = express.Router();

// Lấy danh sách đơn thuê của khách đang đăng nhập.
// URL đầy đủ: GET /api/me/orders
router.get("/", xacThucDangNhap, layDanhSachDonCuaToi);

// Hủy đơn thuê của khách đang đăng nhập.
// Chỉ dùng PATCH vì đây là cập nhật trạng thái đơn từ Đã giữ chỗ sang Đã hủy.
// URL đầy đủ: PATCH /api/me/orders/:id/cancel
router.patch("/:id/cancel", xacThucDangNhap, huyDonCuaToi);

// Lấy chi tiết đơn thuê của khách đang đăng nhập.
// Đặt route này sau route cancel để tránh nhầm ":id" với các route khác.
// URL đầy đủ: GET /api/me/orders/:id
router.get("/:id", xacThucDangNhap, layChiTietDonCuaToi);

// Export router để routes/index.js dùng.
module.exports = router;