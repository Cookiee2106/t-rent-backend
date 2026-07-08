const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/prisma");

async function dangKyService(duLieu) {

  const { ho_ten, email, so_dien_thoai, mat_khau } = duLieu;

  const emailTonTai = await prisma.$queryRaw`
    SELECT id
    FROM nguoi_dung
    WHERE email = ${email}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (emailTonTai.length > 0) {
    throw new Error("Email đã được sử dụng");
  }

  const soDienThoaiTonTai = await prisma.$queryRaw`
    SELECT id
    FROM nguoi_dung
    WHERE so_dien_thoai = ${so_dien_thoai}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (soDienThoaiTonTai.length > 0) {
    throw new Error("Số điện thoại đã được sử dụng");
  }

  const matKhauHash = await bcrypt.hash(mat_khau, 10);

  const danhSachNguoiDung = await prisma.$queryRaw`
    INSERT INTO nguoi_dung (
      ho_ten,
      email,
      so_dien_thoai,
      mat_khau_hash,
      vai_tro,
      trang_thai,
      trang_thai_xac_minh
    )
    VALUES (
      ${ho_ten},
      ${email},
      ${so_dien_thoai},
      ${matKhauHash},
      'KHACH_HANG',
      101,
      201
    )
    RETURNING
      id,
      ho_ten,
      email,
      so_dien_thoai,
      vai_tro,
      trang_thai,
      trang_thai_xac_minh
  `;

  return danhSachNguoiDung[0];
}
async function dangNhapService(email, mat_khau) {
  const danhSachNguoiDung = await prisma.$queryRaw`
    SELECT
      id,
      ho_ten,
      email,
      so_dien_thoai,
      mat_khau_hash,
      vai_tro,
      trang_thai,
      dia_chi,
      trang_thai_xac_minh
    FROM nguoi_dung
    WHERE email = ${email}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSachNguoiDung.length === 0) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const nguoiDung = danhSachNguoiDung[0];

  if (nguoiDung.trang_thai !== 101) {
    throw new Error("Tài khoản đang bị khóa hoặc ngưng hoạt động");
  }

  const matKhauDung = await bcrypt.compare(mat_khau, nguoiDung.mat_khau_hash);

  if (!matKhauDung) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const token = jwt.sign(
    {
      id: nguoiDung.id,
      email: nguoiDung.email,
      vai_tro: nguoiDung.vai_tro,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  delete nguoiDung.mat_khau_hash;

  return {
    token,
    nguoiDung,
  };
}

async function layThongTinCuaToiService(nguoiDungId) {
  const danhSachNguoiDung = await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.vai_tro,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,
      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh
    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh

    WHERE nd.id = ${nguoiDungId}::uuid
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (danhSachNguoiDung.length === 0) {
    throw new Error("Không tìm thấy người dùng");
  }

  return danhSachNguoiDung[0];
}

module.exports = {
  dangKyService,
  dangNhapService,
  layThongTinCuaToiService,
};