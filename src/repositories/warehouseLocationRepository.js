const prisma = require("../config/prisma");

const TRANG_THAI_HIEN_THI = 601;
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

// Tính tổng số lượng đang chiếm chỗ tại một vị trí.
// Thiết bị vật lý tính theo từng thiết bị, phụ kiện tính theo số lượng phân bổ.
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
        SELECT COALESCE(SUM(pkvt.so_luong), 0)::int
        FROM phu_kien_vi_tri_kho pkvt
        JOIN phu_kien pk ON pk.id = pkvt.phu_kien_id
        WHERE pkvt.vi_tri_kho_id = ${viTriId}::uuid
          AND pkvt.dang_su_dung = TRUE
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua
  `;

  return Number(rows[0]?.so_luong_dang_chua || 0);
}

// Lấy một danh mục còn hiển thị để dùng khi thêm/cập nhật vị trí kho.
async function layDanhMucDangHienThiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc,
      tinh_chat_id,
      trang_thai
    FROM danh_muc_thiet_bi
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = ${TRANG_THAI_HIEN_THI}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layViTriTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      vt.id,
      vt.ten_vi_tri,
      vt.danh_muc_id,
      dm.ten_danh_muc,
      vt.suc_chua_toi_da,
      vt.trang_thai,
      tt.ten_trang_thai,
      vt.created_at,
      vt.updated_at
    FROM vi_tri_kho vt

    JOIN danh_muc_thiet_bi dm
      ON dm.id = vt.danh_muc_id

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

// Danh sách quản lý: sắp theo danh mục trước, sau đó theo tên vị trí.
async function layDanhSachViTriKho() {
  return await prisma.$queryRaw`
    SELECT
      vt.id,
      vt.ten_vi_tri,
      vt.danh_muc_id,
      dm.ten_danh_muc,
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
        SELECT COALESCE(SUM(pkvt.so_luong), 0)::int
        FROM phu_kien_vi_tri_kho pkvt
        JOIN phu_kien pk ON pk.id = pkvt.phu_kien_id
        WHERE pkvt.vi_tri_kho_id = vt.id
          AND pkvt.dang_su_dung = TRUE
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua

    FROM vi_tri_kho vt

    JOIN danh_muc_thiet_bi dm
      ON dm.id = vt.danh_muc_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = vt.trang_thai

    WHERE vt.da_xoa_luc IS NULL

    ORDER BY dm.ten_danh_muc ASC, vt.ten_vi_tri ASC
  `;
}

// API options dùng chung.
// Nếu truyền danh_muc_id thì chỉ trả vị trí thuộc đúng danh mục đó.
async function layDanhSachViTriKhoDangHienThi(danhMucId = null) {
  return await prisma.$queryRaw`
    SELECT
      vt.id,
      vt.ten_vi_tri,
      vt.danh_muc_id,
      dm.ten_danh_muc,
      vt.suc_chua_toi_da,
      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tb
        WHERE tb.vi_tri_kho_id = vt.id
          AND tb.da_xoa_luc IS NULL
      )
      +
      (
        SELECT COALESCE(SUM(pkvt.so_luong), 0)::int
        FROM phu_kien_vi_tri_kho pkvt
        JOIN phu_kien pk ON pk.id = pkvt.phu_kien_id
        WHERE pkvt.vi_tri_kho_id = vt.id
          AND pkvt.dang_su_dung = TRUE
          AND pk.da_xoa_luc IS NULL
      ) AS so_luong_dang_chua
    FROM vi_tri_kho vt

    JOIN danh_muc_thiet_bi dm
      ON dm.id = vt.danh_muc_id

    WHERE vt.da_xoa_luc IS NULL
      AND vt.trang_thai = ${TRANG_THAI_HIEN_THI}
      AND (${danhMucId}::uuid IS NULL OR vt.danh_muc_id = ${danhMucId}::uuid)

    ORDER BY dm.ten_danh_muc ASC, vt.ten_vi_tri ASC
  `;
}

// Giữ nguyên API lấy vị trí còn phụ kiện để phục vụ bàn giao.
async function layDanhSachViTriKhaDungCuaPhuKien(phuKienId) {
  return await prisma.$queryRaw`
    SELECT
      pkvt.id AS phu_kien_vi_tri_kho_id,
      pkvt.phu_kien_id,
      pkvt.vi_tri_kho_id,
      vt.ten_vi_tri,
      vt.danh_muc_id,
      dm.ten_danh_muc,
      vt.suc_chua_toi_da,
      pkvt.so_luong::int AS so_luong,
      COALESCE((
        SELECT SUM(bgvp.so_luong_giao)::int
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_vi_tri_kho_id = pkvt.id
          AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
      ), 0)::int AS so_luong_dang_thue,
      GREATEST(
        pkvt.so_luong - COALESCE((
          SELECT SUM(bgvp.so_luong_giao)::int
          FROM ban_giao_vat_pham bgvp
          JOIN chi_tiet_don_thue ctdt
            ON ctdt.id = bgvp.chi_tiet_don_thue_id
          JOIN don_thue dt
            ON dt.id = ctdt.don_thue_id
          WHERE bgvp.phu_kien_vi_tri_kho_id = pkvt.id
            AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
        ), 0),
        0
      )::int AS so_luong_kha_dung
    FROM phu_kien_vi_tri_kho pkvt

    JOIN phu_kien pk
      ON pk.id = pkvt.phu_kien_id

    JOIN vi_tri_kho vt
      ON vt.id = pkvt.vi_tri_kho_id

    JOIN danh_muc_thiet_bi dm
      ON dm.id = vt.danh_muc_id

    WHERE pkvt.phu_kien_id = ${phuKienId}::uuid
      AND pkvt.dang_su_dung = TRUE
      AND pk.da_xoa_luc IS NULL
      AND pk.trang_thai = ${TRANG_THAI_HIEN_THI}
      AND vt.da_xoa_luc IS NULL
      AND vt.trang_thai = ${TRANG_THAI_HIEN_THI}
      AND GREATEST(
        pkvt.so_luong - COALESCE((
          SELECT SUM(bgvp.so_luong_giao)::int
          FROM ban_giao_vat_pham bgvp
          JOIN chi_tiet_don_thue ctdt
            ON ctdt.id = bgvp.chi_tiet_don_thue_id
          JOIN don_thue dt
            ON dt.id = ctdt.don_thue_id
          WHERE bgvp.phu_kien_vi_tri_kho_id = pkvt.id
            AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
        ), 0),
        0
      ) > 0

    ORDER BY vt.ten_vi_tri ASC
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

async function taoViTriKho({ tenViTri, danhMucId, sucChuaToiDa }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO vi_tri_kho (
      id,
      ten_vi_tri,
      danh_muc_id,
      suc_chua_toi_da,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenViTri},
      ${danhMucId}::uuid,
      ${sucChuaToiDa},
      ${TRANG_THAI_HIEN_THI},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatViTriKho(
  id,
  { tenViTri, danhMucId, sucChuaToiDa }
) {
  const rows = await prisma.$queryRaw`
    UPDATE vi_tri_kho
    SET
      ten_vi_tri = ${tenViTri},
      danh_muc_id = ${danhMucId}::uuid,
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
    SELECT pk.id
    FROM phu_kien_vi_tri_kho pkvt
    JOIN phu_kien pk ON pk.id = pkvt.phu_kien_id
    WHERE pkvt.vi_tri_kho_id = ${id}::uuid
      AND pkvt.dang_su_dung = TRUE
      AND pkvt.so_luong > 0
      AND pk.da_xoa_luc IS NULL
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
  TRANG_THAI_HIEN_THI,

  tinhSoLuongDangChua,
  layDanhMucDangHienThiTheoId,
  layViTriTheoId,
  layDanhSachViTriKho,
  layDanhSachViTriKhoDangHienThi,
  layDanhSachViTriKhaDungCuaPhuKien,
  timViTriTrungTen,
  taoViTriKho,
  capNhatViTriKho,
  capNhatTrangThaiViTriKho,
  timThietBiTheoViTri,
  timPhuKienTheoViTri,
  xoaMemViTriKho,
};
