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

async function tinhSoLuongDangChua(viTriId) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tb
        WHERE tb.vi_tri_kho_id = ${viTriId}::uuid
          AND tb.da_xoa_luc IS NULL
      )
      +
      (
        SELECT COALESCE(SUM(pk.tong_so_luong), 0)::int
        FROM phu_kien pk
        WHERE pk.vi_tri_kho_id = ${viTriId}::uuid
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua
  `;

  return Number(rows[0]?.so_luong_dang_chua || 0);
}

async function layViTriTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      vt.id,
      vt.ten_vi_tri,
      vt.suc_chua_toi_da,
      vt.trang_thai,
      tt.ten_trang_thai,
      vt.created_at,
      vt.updated_at
    FROM vi_tri_kho vt

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = vt.trang_thai

    WHERE vt.id = ${id}::uuid
      AND vt.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (!rows[0]) {
    return null;
  }

  const soLuongDangChua = await tinhSoLuongDangChua(id);

  return {
    ...rows[0],
    so_luong_dang_chua: soLuongDangChua,
  };
}

async function layDanhSachViTriKho() {
  return await prisma.$queryRaw`
    SELECT
      vt.id,
      vt.ten_vi_tri,
      vt.suc_chua_toi_da,
      vt.trang_thai,
      tt.ten_trang_thai,
      vt.created_at,
      vt.updated_at,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tb
        WHERE tb.vi_tri_kho_id = vt.id
          AND tb.da_xoa_luc IS NULL
      )
      +
      (
        SELECT COALESCE(SUM(pk.tong_so_luong), 0)::int
        FROM phu_kien pk
        WHERE pk.vi_tri_kho_id = vt.id
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua

    FROM vi_tri_kho vt

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = vt.trang_thai

    WHERE vt.da_xoa_luc IS NULL

    ORDER BY vt.ten_vi_tri ASC
  `;
}

async function layDanhSachViTriKhoDangHienThi() {
  return await prisma.$queryRaw`
    SELECT
      id,
      ten_vi_tri,
      suc_chua_toi_da
    FROM vi_tri_kho
    WHERE da_xoa_luc IS NULL
      AND trang_thai = 601
    ORDER BY ten_vi_tri ASC
  `;
}

async function timViTriTrungTen(tenViTri, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_vi_tri
    FROM vi_tri_kho
    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenViTri);

  const viTriTrung = rows.find((item) => {
    if (idBoQua && String(item.id) === String(idBoQua)) {
      return false;
    }

    return chuanHoaTenDeSoSanh(item.ten_vi_tri) === tenMoi;
  });

  return viTriTrung || null;
}

async function taoViTriKho({ tenViTri, sucChuaToiDa }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO vi_tri_kho (
      id,
      ten_vi_tri,
      suc_chua_toi_da,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenViTri},
      ${sucChuaToiDa},
      601,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatViTriKho(id, { tenViTri, sucChuaToiDa }) {
  const rows = await prisma.$queryRaw`
    UPDATE vi_tri_kho
    SET
      ten_vi_tri = ${tenViTri},
      suc_chua_toi_da = ${sucChuaToiDa},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiViTriKho(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE vi_tri_kho
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function timThietBiTheoViTri(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM thiet_bi_vat_ly
    WHERE vi_tri_kho_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timPhuKienTheoViTri(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM phu_kien
    WHERE vi_tri_kho_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function xoaMemViTriKho(id) {
  const rows = await prisma.$queryRaw`
    UPDATE vi_tri_kho
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
  tinhSoLuongDangChua,
  layViTriTheoId,
  layDanhSachViTriKho,
  layDanhSachViTriKhoDangHienThi,
  timViTriTrungTen,
  taoViTriKho,
  capNhatViTriKho,
  capNhatTrangThaiViTriKho,
  timThietBiTheoViTri,
  timPhuKienTheoViTri,
  xoaMemViTriKho,
};