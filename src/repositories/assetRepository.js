const prisma = require("../config/prisma");

const TRANG_THAI_SAN_SANG = 501;
const TRANG_THAI_DANG_THUE = 502;
const TRANG_THAI_BAO_TRI = 503;
const TRANG_THAI_DA_AN = 504;
const TRANG_THAI_BI_MAT = 505;
const TRANG_THAI_HU_HONG = 506;

const TRANG_THAI_HIEN_THI = 601;

async function layDanhSachThietBiVatLy() {
  return await prisma.$queryRaw`
    SELECT
      tb.id,
      tb.mau_thiet_bi_id,
      tb.ma_tai_san,
      tb.so_serial,
      tb.vi_tri_kho_id,
      vtk.ten_vi_tri,
      vtk.suc_chua_toi_da,
      tb.trang_thai,
      tt.ten_trang_thai,
      mtb.hang_id,
      h.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      tb.created_at,
      tb.updated_at
    FROM thiet_bi_vat_ly tb

    JOIN mau_thiet_bi mtb
      ON mtb.id = tb.mau_thiet_bi_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN vi_tri_kho vtk
      ON vtk.id = tb.vi_tri_kho_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = tb.trang_thai

    WHERE tb.da_xoa_luc IS NULL

    ORDER BY tb.created_at DESC
  `;
}

async function layThietBiVatLyTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      tb.id,
      tb.mau_thiet_bi_id,
      tb.ma_tai_san,
      tb.so_serial,
      tb.vi_tri_kho_id,
      vtk.ten_vi_tri,
      vtk.suc_chua_toi_da,
      tb.trang_thai,
      tt.ten_trang_thai,
      mtb.hang_id,
      h.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      tb.created_at,
      tb.updated_at
    FROM thiet_bi_vat_ly tb

    JOIN mau_thiet_bi mtb
      ON mtb.id = tb.mau_thiet_bi_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN vi_tri_kho vtk
      ON vtk.id = tb.vi_tri_kho_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = tb.trang_thai

    WHERE tb.id = ${id}::uuid
      AND tb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layMauThietBiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      h.ten_hang,
      mtb.ten_mau
    FROM mau_thiet_bi mtb

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layViTriKhoTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_vi_tri,
      suc_chua_toi_da,
      trang_thai
    FROM vi_tri_kho
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function demSoLuongDangChuaCuaViTri(viTriKhoId, thietBiIdBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tb
        WHERE tb.vi_tri_kho_id = ${viTriKhoId}::uuid
          AND tb.da_xoa_luc IS NULL
          AND (${thietBiIdBoQua}::uuid IS NULL OR tb.id <> ${thietBiIdBoQua}::uuid)
      )
      +
      (
        SELECT COALESCE(SUM(pk.tong_so_luong), 0)::int
        FROM phu_kien pk
        WHERE pk.vi_tri_kho_id = ${viTriKhoId}::uuid
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua
  `;

  return Number(rows[0]?.so_luong_dang_chua || 0);
}

async function timTrungSoSerial(soSerial, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM thiet_bi_vat_ly
    WHERE da_xoa_luc IS NULL
      AND LOWER(so_serial) = LOWER(${soSerial})
      AND (${idBoQua}::uuid IS NULL OR id <> ${idBoQua}::uuid)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timTrungMaTaiSan(maTaiSan, idBoQua = null) {
  if (!maTaiSan) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT id
    FROM thiet_bi_vat_ly
    WHERE da_xoa_luc IS NULL
      AND LOWER(ma_tai_san) = LOWER(${maTaiSan})
      AND (${idBoQua}::uuid IS NULL OR id <> ${idBoQua}::uuid)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function themThietBiVatLy({
  mauThietBiId,
  maTaiSan,
  soSerial,
  viTriKhoId,
}) {
  const rows = await prisma.$queryRaw`
    INSERT INTO thiet_bi_vat_ly (
      id,
      mau_thiet_bi_id,
      ma_tai_san,
      so_serial,
      vi_tri_kho_id,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${mauThietBiId}::uuid,
      ${maTaiSan},
      ${soSerial},
      ${viTriKhoId}::uuid,
      ${TRANG_THAI_SAN_SANG},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatThietBiVatLy(
  id,
  {
    mauThietBiId,
    maTaiSan,
    soSerial,
    viTriKhoId,
  }
) {
  const rows = await prisma.$queryRaw`
    UPDATE thiet_bi_vat_ly
    SET
      mau_thiet_bi_id = ${mauThietBiId}::uuid,
      ma_tai_san = ${maTaiSan},
      so_serial = ${soSerial},
      vi_tri_kho_id = ${viTriKhoId}::uuid,
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiThietBiVatLy(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE thiet_bi_vat_ly
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function xoaMemThietBiVatLy(id) {
  const rows = await prisma.$queryRaw`
    UPDATE thiet_bi_vat_ly
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
  TRANG_THAI_SAN_SANG,
  TRANG_THAI_DANG_THUE,
  TRANG_THAI_BAO_TRI,
  TRANG_THAI_DA_AN,
  TRANG_THAI_BI_MAT,
  TRANG_THAI_HU_HONG,
  TRANG_THAI_HIEN_THI,

  layDanhSachThietBiVatLy,
  layThietBiVatLyTheoId,
  layMauThietBiTheoId,
  layViTriKhoTheoId,
  demSoLuongDangChuaCuaViTri,
  timTrungSoSerial,
  timTrungMaTaiSan,
  themThietBiVatLy,
  capNhatThietBiVatLy,
  capNhatTrangThaiThietBiVatLy,
  xoaMemThietBiVatLy,
};
