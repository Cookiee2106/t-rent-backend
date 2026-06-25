const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prisma");

// ============================================================
// REGISTER
// Mục đích: Tạo tài khoản khách hàng mới
// ============================================================
async function register({ ho_ten, email, so_dien_thoai, mat_khau }) {
  // Kiểm tra email đã tồn tại chưa
  const nguoi_dung_ton_tai = await prisma.$queryRaw`
    SELECT id, email
    FROM nguoi_dung
    WHERE email = ${email}
    LIMIT 1
  `;

  if (nguoi_dung_ton_tai && nguoi_dung_ton_tai.length > 0) {
    const error = new Error("Email đã được sử dụng");
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const mat_khau_hash = await bcrypt.hash(mat_khau, 10);

  // Tạo user và customer profile trong transaction
  const ket_qua = await prisma.$transaction(async (tx) => {
    // Tạo user
    const ket_qua_tao = await tx.$queryRaw`
      INSERT INTO nguoi_dung (ho_ten, email, so_dien_thoai, mat_khau_hash, vai_tro, trang_thai, created_at, updated_at)
      VALUES (${ho_ten}, ${email}, ${so_dien_thoai || null}, ${mat_khau_hash}, 'KHACH_HANG', 'HOAT_DONG', NOW(), NOW())
      RETURNING id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, created_at
    `;

    const nguoi_dung = ket_qua_tao[0];

    // Tạo customer profile (ho_so_khach_hang)
    await tx.$executeRaw`
      INSERT INTO ho_so_khach_hang (nguoi_dung_id, trang_thai_xac_minh, created_at, updated_at)
      VALUES (${nguoi_dung.id}, 'CHUA_XAC_MINH', NOW(), NOW())
    `;

    // Response - dùng field DB tiếng Việt
    return {
      id: nguoi_dung.id,
      ho_ten: nguoi_dung.ho_ten,
      email: nguoi_dung.email,
      so_dien_thoai: nguoi_dung.so_dien_thoai,
      vai_tro: nguoi_dung.vai_tro,
      trang_thai: nguoi_dung.trang_thai,
      created_at: nguoi_dung.created_at,
    };
  });

  return ket_qua;
}

// ============================================================
// LOGIN
// Mục đích: Xác thực và đăng nhập
// ============================================================
async function login({ email, mat_khau }) {
  // Tìm user theo email
  const danh_sach_nguoi_dung = await prisma.$queryRaw`
    SELECT
      id,
      ho_ten,
      email,
      so_dien_thoai,
      mat_khau_hash,
      vai_tro,
      trang_thai,
      da_xoa_luc,
      created_at
    FROM nguoi_dung
    WHERE email = ${email}
    LIMIT 1
  `;

  // Kiểm tra user tồn tại
  if (!danh_sach_nguoi_dung || danh_sach_nguoi_dung.length === 0) {
    const error = new Error("Email hoặc mật khẩu không đúng");
    error.statusCode = 401;
    throw error;
  }

  const nguoi_dung = danh_sach_nguoi_dung[0];

  // Kiểm tra tài khoản chưa bị xóa
  if (nguoi_dung.da_xoa_luc) {
    const error = new Error("Tài khoản đã bị vô hiệu hóa");
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra tài khoản hoạt động
  if (nguoi_dung.trang_thai !== "HOAT_DONG") {
    const error = new Error("Tài khoản đã bị vô hiệu hóa");
    error.statusCode = 403;
    throw error;
  }

  // So sánh password
  const mat_khau_hop_le = await bcrypt.compare(mat_khau, nguoi_dung.mat_khau_hash);
  if (!mat_khau_hop_le) {
    const error = new Error("Email hoặc mật khẩu không đúng");
    error.statusCode = 401;
    throw error;
  }

  // Tạo JWT token - dùng vai_tro tiếng Việt
  const token = jwt.sign(
    {
      id: nguoi_dung.id,
      email: nguoi_dung.email,
      vai_tro: nguoi_dung.vai_tro,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  // Response - dùng field DB tiếng Việt
  return {
    nguoi_dung: {
      id: nguoi_dung.id,
      ho_ten: nguoi_dung.ho_ten,
      email: nguoi_dung.email,
      so_dien_thoai: nguoi_dung.so_dien_thoai,
      vai_tro: nguoi_dung.vai_tro,
      trang_thai: nguoi_dung.trang_thai,
      created_at: nguoi_dung.created_at,
    },
    token,
  };
}

module.exports = {
  register,
  login,
};
