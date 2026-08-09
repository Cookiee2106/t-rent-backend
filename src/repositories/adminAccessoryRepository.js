const prisma = require("../config/prisma");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;
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
      pk.trang_thai,

      pk.ngam_id,
      n.ten_ngam,

      pk.danh_muc_id,
      dmtb.ten_danh_muc,

      pk.vi_tri_kho_id,
      (
        SELECT vt.ten_vi_tri
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
        ORDER BY pkvt.created_at ASC
        LIMIT 1
      ) AS ten_vi_tri,
      (
        SELECT vt.suc_chua_toi_da
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
        ORDER BY pkvt.created_at ASC
        LIMIT 1
      ) AS suc_chua_toi_da,

      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pkvt.id,
            'vi_tri_kho_id', pkvt.vi_tri_kho_id,
            'ten_vi_tri', vt.ten_vi_tri,
            'suc_chua_toi_da', vt.suc_chua_toi_da,
            'so_luong', pkvt.so_luong
          )
          ORDER BY vt.ten_vi_tri ASC
        )
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
      ), '[]'::jsonb) AS vi_tri_kho,

      pk.tong_so_luong::int AS tong_so_luong,
      pk.so_luong_mat_hu_hong::int AS so_luong_mat_hu_hong,

      -- Chỉ đơn đã bàn giao và đơn quá hạn mới được tính là đang dùng.
      COALESCE((
        SELECT SUM(bgvp.so_luong_giao)::int
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_id = pk.id
          AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
      ), 0)::int AS so_luong_dang_su_dung,

      pk.mo_ta,
      pk.created_at,
      pk.updated_at

    FROM phu_kien pk

    LEFT JOIN ngam_thiet_bi n
      ON n.id = pk.ngam_id
      AND n.da_xoa_luc IS NULL

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    WHERE pk.da_xoa_luc IS NULL

    ORDER BY pk.created_at DESC
  `;
}

async function layPhuKienTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,
      pk.trang_thai,

      pk.ngam_id,
      n.ten_ngam,

      pk.danh_muc_id,
      dmtb.ten_danh_muc,

      pk.vi_tri_kho_id,
      (
        SELECT vt.ten_vi_tri
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
        ORDER BY pkvt.created_at ASC
        LIMIT 1
      ) AS ten_vi_tri,
      (
        SELECT vt.suc_chua_toi_da
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
        ORDER BY pkvt.created_at ASC
        LIMIT 1
      ) AS suc_chua_toi_da,

      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pkvt.id,
            'vi_tri_kho_id', pkvt.vi_tri_kho_id,
            'ten_vi_tri', vt.ten_vi_tri,
            'suc_chua_toi_da', vt.suc_chua_toi_da,
            'so_luong', pkvt.so_luong
          )
          ORDER BY vt.ten_vi_tri ASC
        )
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.phu_kien_id = pk.id
          AND pkvt.dang_su_dung = TRUE
      ), '[]'::jsonb) AS vi_tri_kho,

      pk.tong_so_luong::int AS tong_so_luong,
      pk.so_luong_mat_hu_hong::int AS so_luong_mat_hu_hong,

      -- Chỉ đơn đã bàn giao và đơn quá hạn mới được tính là đang dùng.
      COALESCE((
        SELECT SUM(bgvp.so_luong_giao)::int
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_id = pk.id
          AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
      ), 0)::int AS so_luong_dang_su_dung,

      pk.mo_ta,
      pk.created_at,
      pk.updated_at

    FROM phu_kien pk

    LEFT JOIN ngam_thiet_bi n
      ON n.id = pk.ngam_id
      AND n.da_xoa_luc IS NULL

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    WHERE pk.id = ${id}::uuid
      AND pk.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layPhanBoViTriCuaPhuKien(phuKienId) {
  return await prisma.$queryRaw`
    SELECT
      pkvt.id,
      pkvt.phu_kien_id,
      pkvt.vi_tri_kho_id,
      pkvt.so_luong::int AS so_luong,
      pkvt.dang_su_dung,
      vt.ten_vi_tri,
      vt.suc_chua_toi_da,
      vt.trang_thai,
      vt.da_xoa_luc
    FROM phu_kien_vi_tri_kho pkvt
    JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
    WHERE pkvt.phu_kien_id = ${phuKienId}::uuid
      AND pkvt.dang_su_dung = TRUE
    ORDER BY vt.ten_vi_tri ASC
  `;
}

async function tinhSoLuongDangThueTaiPhanBo(phuKienViTriKhoId) {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(bgvp.so_luong_giao), 0)::int AS so_luong_dang_thue
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id
    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id
    WHERE bgvp.phu_kien_vi_tri_kho_id = ${phuKienViTriKhoId}::uuid
      AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
  `;

  return Number(rows[0]?.so_luong_dang_thue || 0);
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

async function layNgamDangHienThiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      n.id,
      n.ten_ngam,
      n.hang_so_huu_id
    FROM ngam_thiet_bi n
    JOIN hang_thiet_bi h
      ON h.id = n.hang_so_huu_id
    WHERE n.id = ${id}::uuid
      AND n.trang_thai = ${TRANG_THAI_HIEN_THI}
      AND n.da_xoa_luc IS NULL
      AND h.trang_thai = ${TRANG_THAI_HIEN_THI}
      AND h.da_xoa_luc IS NULL
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
        SELECT COALESCE(SUM(pkvt.so_luong), 0)::int
        FROM phu_kien_vi_tri_kho pkvt
        JOIN phu_kien pk ON pk.id = pkvt.phu_kien_id
        WHERE pkvt.vi_tri_kho_id = ${viTriKhoId}::uuid
          AND pkvt.dang_su_dung = TRUE
          AND pk.da_xoa_luc IS NULL
          AND (${phuKienIdBoQua}::uuid IS NULL OR pk.id <> ${phuKienIdBoQua}::uuid)
      ) AS so_luong_dang_chua
  `;

  return Number(rows[0]?.so_luong_dang_chua || 0);
}

// Chỉ tính phụ kiện của đơn Đang thuê hoặc Quá hạn.
// Đơn Đã giữ chỗ chưa bàn giao không được tính là đang dùng.
async function tinhSoLuongDangSuDungCuaPhuKien(phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(bgvp.so_luong_giao), 0)::int AS so_luong_dang_su_dung
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id
    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id
    WHERE bgvp.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (${DON_DANG_THUE}, ${DON_QUA_HAN})
  `;

  return Number(rows[0]?.so_luong_dang_su_dung || 0);
}

// Dùng cho các nghiệp vụ thay đổi/xóa/ẩn phụ kiện.
// Đơn Đã giữ chỗ vẫn phải được bảo vệ vì cửa hàng đã cam kết giao cho khách.
async function tinhSoLuongDangCamKetCuaPhuKien(phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(
        SUM(ctdt.so_luong * bdk.so_luong),
        0
      )::int AS so_luong_dang_cam_ket

    FROM bo_di_kem bdk

    JOIN chi_tiet_don_thue ctdt
      ON ctdt.mau_thiet_bi_id = bdk.mau_thiet_bi_chinh_id

    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id

    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (
        ${DON_DA_GIU_CHO},
        ${DON_DANG_THUE},
        ${DON_QUA_HAN}
      )
  `;

  return Number(rows[0]?.so_luong_dang_cam_ket || 0);
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

async function layDanhSachMauDangDungPhuKien(phuKienId) {
  return await prisma.$queryRaw`
    SELECT
      bdk.id AS bo_di_kem_id,
      mtb.id AS mau_thiet_bi_id,
      mtb.ten_mau
    FROM bo_di_kem bdk
    JOIN mau_thiet_bi mtb
      ON mtb.id = bdk.mau_thiet_bi_chinh_id
    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
    ORDER BY mtb.ten_mau ASC
  `;
}

async function taoPhuKien({
  tenPhuKien,
  ngamId,
  danhMucId,
  danhSachViTri,
  tongSoLuong,
  moTa,
}) {
  return await prisma.$transaction(async (tx) => {
    const viTriDauTien = danhSachViTri[0]?.viTriKhoId || null;

    const rows = await tx.$queryRaw`
      INSERT INTO phu_kien (
        id,
        ten_phu_kien,
        ngam_id,
        danh_muc_id,
        vi_tri_kho_id,
        tong_so_luong,
        trang_thai,
        mo_ta,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${tenPhuKien},
        ${ngamId}::uuid,
        ${danhMucId}::uuid,
        ${viTriDauTien}::uuid,
        ${tongSoLuong},
        ${TRANG_THAI_HIEN_THI},
        ${moTa},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const phuKienMoi = rows[0];

    for (const viTri of danhSachViTri) {
      await tx.$executeRaw`
        INSERT INTO phu_kien_vi_tri_kho (
          id,
          phu_kien_id,
          vi_tri_kho_id,
          so_luong,
          dang_su_dung,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${phuKienMoi.id}::uuid,
          ${viTri.viTriKhoId}::uuid,
          ${viTri.soLuong},
          TRUE,
          NOW(),
          NOW()
        )
      `;
    }

    return phuKienMoi;
  });
}

async function capNhatPhuKien(
  id,
  {
    tenPhuKien,
    ngamId,
    danhMucId,
    danhSachViTri,
    tongSoLuong,
    moTa,
  }
) {
  return await prisma.$transaction(async (tx) => {
    const viTriDauTien = danhSachViTri[0]?.viTriKhoId || null;

    const rows = await tx.$queryRaw`
      UPDATE phu_kien
      SET
        ten_phu_kien = ${tenPhuKien},
        ngam_id = ${ngamId}::uuid,
        danh_muc_id = ${danhMucId}::uuid,
        vi_tri_kho_id = ${viTriDauTien}::uuid,
        tong_so_luong = ${tongSoLuong},
        mo_ta = ${moTa},
        updated_at = NOW()
      WHERE id = ${id}::uuid
        AND da_xoa_luc IS NULL
      RETURNING id
    `;

    if (!rows[0]) {
      return null;
    }

    await tx.$executeRaw`
      UPDATE phu_kien_vi_tri_kho
      SET
        so_luong = 0,
        dang_su_dung = FALSE,
        updated_at = NOW()
      WHERE phu_kien_id = ${id}::uuid
    `;

    for (const viTri of danhSachViTri) {
      await tx.$executeRaw`
        INSERT INTO phu_kien_vi_tri_kho (
          id,
          phu_kien_id,
          vi_tri_kho_id,
          so_luong,
          dang_su_dung,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${id}::uuid,
          ${viTri.viTriKhoId}::uuid,
          ${viTri.soLuong},
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT (phu_kien_id, vi_tri_kho_id)
        DO UPDATE SET
          so_luong = EXCLUDED.so_luong,
          dang_su_dung = TRUE,
          updated_at = NOW()
      `;
    }

    return rows[0];
  });
}

async function capNhatTrangThaiPhuKien(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE phu_kien
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
      AND ${trangThai} IN (${TRANG_THAI_HIEN_THI}, ${TRANG_THAI_DA_AN})
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
  layPhanBoViTriCuaPhuKien,
  tinhSoLuongDangThueTaiPhanBo,
  timPhuKienTrungTen,
  layNgamDangHienThiTheoId,
  layDanhMucPhuKienDangHienThiTheoId,
  layViTriKhoDangHienThiTheoId,
  tinhSoLuongDangChuaTaiViTri,
  tinhSoLuongDangSuDungCuaPhuKien,
  tinhSoLuongDangCamKetCuaPhuKien,
  timBoDiKemTheoPhuKien,
  layDanhSachMauDangDungPhuKien,
  taoPhuKien,
  capNhatPhuKien,
  capNhatTrangThaiPhuKien,
  xoaMemPhuKien,
};
