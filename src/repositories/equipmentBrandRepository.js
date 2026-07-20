const prisma = require("../config/prisma");

function chuanHoaTenDeSoSanh(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

async function layHangTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      h.id,
      h.ten_hang,
      h.trang_thai,
      tt.ten_trang_thai,
      h.created_at,
      h.updated_at
    FROM hang_thiet_bi h

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = h.trang_thai

    WHERE h.id = ${id}::uuid
      AND h.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layDanhSachHangThietBi() {
  return await prisma.$queryRaw`
    SELECT
      h.id,
      h.ten_hang,
      h.trang_thai,
      tt.ten_trang_thai,
      h.created_at,
      h.updated_at
    FROM hang_thiet_bi h

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = h.trang_thai

    WHERE h.da_xoa_luc IS NULL

    ORDER BY h.ten_hang ASC
  `;
}

async function layDanhSachHangDangHienThi() {
  return await prisma.$queryRaw`
    SELECT
      id,
      ten_hang
    FROM hang_thiet_bi
    WHERE da_xoa_luc IS NULL
      AND trang_thai = 601
    ORDER BY ten_hang ASC
  `;
}

async function timHangTrungTen(tenHang, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_hang
    FROM hang_thiet_bi
    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenHang);

  const hangTrung = rows.find((item) => {
    if (idBoQua && String(item.id) === String(idBoQua)) {
      return false;
    }

    return chuanHoaTenDeSoSanh(item.ten_hang) === tenMoi;
  });

  return hangTrung || null;
}

async function taoHangThietBi({ tenHang }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO hang_thiet_bi (
      id,
      ten_hang,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenHang},
      601,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatHangThietBi(id, { tenHang }) {
  const rows = await prisma.$queryRaw`
    UPDATE hang_thiet_bi
    SET
      ten_hang = ${tenHang},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiHangThietBi(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE hang_thiet_bi
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function timMauThietBiTheoHang(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM mau_thiet_bi
    WHERE hang_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timPhuKienTheoHang(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM phu_kien
    WHERE hang_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function xoaMemHangThietBi(id) {
  const rows = await prisma.$queryRaw`
    UPDATE hang_thiet_bi
    SET
      da_xoa_luc = NOW(),
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

module.exports = {
  layHangTheoId,
  layDanhSachHangThietBi,
  layDanhSachHangDangHienThi,
  timHangTrungTen,
  taoHangThietBi,
  capNhatHangThietBi,
  capNhatTrangThaiHangThietBi,
  timMauThietBiTheoHang,
  timPhuKienTheoHang,
  xoaMemHangThietBi,
};