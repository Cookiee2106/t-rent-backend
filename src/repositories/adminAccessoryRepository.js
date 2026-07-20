const prisma = require("../config/prisma");

const TRANG_THAI_HIEN_THI = 601;
const TINH_CHAT_PHU_KIEN = 2503;

const DON_DA_GIU_CHO = 1102;
const DON_DANG_THUE = 1103;
const DON_QUA_HAN = 1105;

function chuanHoaTenDeSoSanh(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

async function layDanhSachPhuKien() {
  return await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,

      pk.hang_id,
      h.ten_hang,

      pk.danh_muc_id,
      dmtb.ten_danh_muc,

      pk.vi_tri_kho_id,
      vtk.ten_vi_tri,
      vtk.suc_chua_toi_da,

      pk.tong_so_luong::int AS tong_so_luong,

      COALESCE((
        SELECT SUM(ctdt.so_luong * bdk.so_luong)::int
        FROM bo_di_kem bdk
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.mau_thiet_bi_id = bdk.mau_thiet_bi_chinh_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bdk.phu_kien_id = pk.id
          AND dt.trang_thai IN (${DON_DA_GIU_CHO}, ${DON_DANG_THUE}, ${DON_QUA_HAN})
      ), 0)::int AS so_luong_dang_su_dung,

      pk.mo_ta,
      pk.created_at,
      pk.updated_at

    FROM phu_kien pk

    LEFT JOIN hang_thiet_bi h
      ON h.id = pk.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    LEFT JOIN vi_tri_kho vtk
      ON vtk.id = pk.vi_tri_kho_id

    WHERE pk.da_xoa_luc IS NULL

    ORDER BY pk.created_at DESC
  `;
}

async function layPhuKienTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,

      pk.hang_id,
      h.ten_hang,

      pk.danh_muc_id,
      dmtb.ten_danh_muc,

      pk.vi_tri_kho_id,
      vtk.ten_vi_tri,
      vtk.suc_chua_toi_da,

      pk.tong_so_luong::int AS tong_so_luong,

      COALESCE((
        SELECT SUM(ctdt.so_luong * bdk.so_luong)::int
        FROM bo_di_kem bdk
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.mau_thiet_bi_id = bdk.mau_thiet_bi_chinh_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bdk.phu_kien_id = pk.id
          AND dt.trang_thai IN (${DON_DA_GIU_CHO}, ${DON_DANG_THUE}, ${DON_QUA_HAN})
      ), 0)::int AS so_luong_dang_su_dung,

      pk.mo_ta,
      pk.created_at,
      pk.updated_at

    FROM phu_kien pk

    LEFT JOIN hang_thiet_bi h
      ON h.id = pk.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    LEFT JOIN vi_tri_kho vtk
      ON vtk.id = pk.vi_tri_kho_id

    WHERE pk.id = ${id}::uuid
      AND pk.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function timPhuKienTrungTen(tenPhuKien, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_phu_kien
    FROM phu_kien
    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenPhuKien);

  const phuKienTrung = rows.find((item) => {
    if (idBoQua && String(item.id) === String(idBoQua)) {
      return false;
    }

    return chuanHoaTenDeSoSanh(item.ten_phu_kien) === tenMoi;
  });

  return phuKienTrung || null;
}

async function layHangDangHienThiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_hang
    FROM hang_thiet_bi
    WHERE id = ${id}::uuid
      AND trang_thai = ${TRANG_THAI_HIEN_THI}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layDanhMucPhuKienDangHienThiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_danh_muc
    FROM danh_muc_thiet_bi
    WHERE id = ${id}::uuid
      AND tinh_chat_id = ${TINH_CHAT_PHU_KIEN}
      AND trang_thai = ${TRANG_THAI_HIEN_THI}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layViTriKhoDangHienThiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_vi_tri, suc_chua_toi_da
    FROM vi_tri_kho
    WHERE id = ${id}::uuid
      AND trang_thai = ${TRANG_THAI_HIEN_THI}
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function tinhSoLuongDangChuaTaiViTri(viTriKhoId, phuKienIdBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.vi_tri_kho_id = ${viTriKhoId}::uuid
          AND tbvl.da_xoa_luc IS NULL
      )
      +
      (
        SELECT COALESCE(SUM(pk.tong_so_luong), 0)::int
        FROM phu_kien pk
        WHERE pk.vi_tri_kho_id = ${viTriKhoId}::uuid
          AND pk.da_xoa_luc IS NULL
          AND (${phuKienIdBoQua}::uuid IS NULL OR pk.id <> ${phuKienIdBoQua}::uuid)
      ) AS so_luong_dang_chua
  `;

  return Number(rows[0]?.so_luong_dang_chua || 0);
}

async function tinhSoLuongDangSuDungCuaPhuKien(phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS so_luong_dang_su_dung
    FROM bo_di_kem bdk
    JOIN chi_tiet_don_thue ctdt
      ON ctdt.mau_thiet_bi_id = bdk.mau_thiet_bi_chinh_id
    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id
    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (${DON_DA_GIU_CHO}, ${DON_DANG_THUE}, ${DON_QUA_HAN})
  `;

  return Number(rows[0]?.so_luong_dang_su_dung || 0);
}

async function timBoDiKemTheoPhuKien(phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM bo_di_kem
    WHERE phu_kien_id = ${phuKienId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function taoPhuKien({
  tenPhuKien,
  hangId,
  danhMucId,
  viTriKhoId,
  tongSoLuong,
  moTa,
}) {
  const rows = await prisma.$queryRaw`
    INSERT INTO phu_kien (
      id,
      ten_phu_kien,
      hang_id,
      danh_muc_id,
      vi_tri_kho_id,
      tong_so_luong,
      mo_ta,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenPhuKien},
      ${hangId}::uuid,
      ${danhMucId}::uuid,
      ${viTriKhoId}::uuid,
      ${tongSoLuong},
      ${moTa},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatPhuKien(
  id,
  {
    tenPhuKien,
    hangId,
    danhMucId,
    viTriKhoId,
    tongSoLuong,
    moTa,
  }
) {
  const rows = await prisma.$queryRaw`
    UPDATE phu_kien
    SET
      ten_phu_kien = ${tenPhuKien},
      hang_id = ${hangId}::uuid,
      danh_muc_id = ${danhMucId}::uuid,
      vi_tri_kho_id = ${viTriKhoId}::uuid,
      tong_so_luong = ${tongSoLuong},
      mo_ta = ${moTa},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function xoaMemPhuKien(id) {
  const rows = await prisma.$queryRaw`
    UPDATE phu_kien
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
  layDanhSachPhuKien,
  layPhuKienTheoId,
  timPhuKienTrungTen,
  layHangDangHienThiTheoId,
  layDanhMucPhuKienDangHienThiTheoId,
  layViTriKhoDangHienThiTheoId,
  tinhSoLuongDangChuaTaiViTri,
  tinhSoLuongDangSuDungCuaPhuKien,
  timBoDiKemTheoPhuKien,
  taoPhuKien,
  capNhatPhuKien,
  xoaMemPhuKien,
};
