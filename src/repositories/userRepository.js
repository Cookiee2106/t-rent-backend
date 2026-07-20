const prisma = require("../config/prisma");

async function timNguoiDungTheoEmail(email) {
  const rows = await prisma.$queryRaw`
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
    WHERE LOWER(email) = LOWER(${email})
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timNguoiDungTheoSoDienThoai(soDienThoai) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM nguoi_dung
    WHERE so_dien_thoai = ${soDienThoai}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function taoKhachHang({ hoTen, email, soDienThoai, matKhauHash }) {
  const rows = await prisma.$queryRaw`
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
      ${hoTen},
      ${email},
      ${soDienThoai},
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

  return rows[0];
}

async function layNguoiDungTheoId(id) {
  const rows = await prisma.$queryRaw`
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

    WHERE nd.id = ${id}::uuid
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function timNguoiDungKhacTheoSoDienThoai(nguoiDungId, soDienThoai) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM nguoi_dung
    WHERE so_dien_thoai = ${soDienThoai}
      AND id <> ${nguoiDungId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function capNhatThongTinCaNhan(nguoiDungId, { hoTen, soDienThoai, diaChi }) {
  const rows = await prisma.$queryRaw`
    WITH nguoi_dung_cap_nhat AS (
      UPDATE nguoi_dung
      SET
        ho_ten = ${hoTen},
        so_dien_thoai = ${soDienThoai},
        dia_chi = ${diaChi},
        updated_at = NOW()
      WHERE id = ${nguoiDungId}::uuid
        AND da_xoa_luc IS NULL
      RETURNING
        id,
        ho_ten,
        email,
        so_dien_thoai,
        dia_chi,
        vai_tro,
        trang_thai,
        trang_thai_xac_minh
    )
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
    FROM nguoi_dung_cap_nhat nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh
  `;

  return rows[0] || null;
}

module.exports = {
  timNguoiDungTheoEmail,
  timNguoiDungTheoSoDienThoai,
  taoKhachHang,
  layNguoiDungTheoId,
  timNguoiDungKhacTheoSoDienThoai,
  capNhatThongTinCaNhan,
};