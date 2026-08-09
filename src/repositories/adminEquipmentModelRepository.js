const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const TRANG_THAI_HIEN_THI = 601;
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

async function layDanhMucHopLe(danhMucId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc,
      tinh_chat_id
    FROM danh_muc_thiet_bi
    WHERE id = ${danhMucId}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = 601
      AND tinh_chat_id IN (2501, 2502)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layHangHopLe(hangId) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_hang
    FROM hang_thiet_bi
    WHERE id = ${hangId}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = 601
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layMauThietBiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,

      mtb.hang_id,
      h.ten_hang,

      mtb.ngam_id,
      n.ten_ngam,
      n.trang_thai AS trang_thai_ngam,

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.gia_tri_thiet_bi::text AS gia_tri_thiet_bi,
      mtb.ty_le_coc::text AS ty_le_coc,
      mtb.tien_coc::text AS tien_coc,
      mtb.trang_thai,
      tt.ten_trang_thai,
      mtb.created_at,
      mtb.updated_at,

      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', nc.id,
              'ten_nhu_cau', nc.ten_nhu_cau,
              'trang_thai', nc.trang_thai
            )
            ORDER BY nc.ten_nhu_cau
          )

          FROM mau_thiet_bi_nhu_cau mnc

          JOIN nhu_cau_su_dung nc
            ON nc.id = mnc.nhu_cau_id

          WHERE mnc.mau_thiet_bi_id = mtb.id
            AND nc.da_xoa_luc IS NULL
        ),
        '[]'::jsonb
      ) AS nhu_cau_su_dung,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.da_xoa_luc IS NULL
      ) AS tong_thiet_bi_vat_ly,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.trang_thai = 501
          AND tbvl.da_xoa_luc IS NULL
      ) AS so_luong_san_sang

    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = mtb.trang_thai

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layDanhSachMauThietBiAdmin() {
  return await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,

      mtb.hang_id,
      h.ten_hang,

      mtb.ngam_id,
      n.ten_ngam,
      n.trang_thai AS trang_thai_ngam,

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.gia_tri_thiet_bi::text AS gia_tri_thiet_bi,
      mtb.ty_le_coc::text AS ty_le_coc,
      mtb.tien_coc::text AS tien_coc,
      mtb.trang_thai,
      tt.ten_trang_thai,
      mtb.created_at,
      mtb.updated_at,

      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', nc.id,
              'ten_nhu_cau', nc.ten_nhu_cau,
              'trang_thai', nc.trang_thai
            )
            ORDER BY nc.ten_nhu_cau
          )

          FROM mau_thiet_bi_nhu_cau mnc

          JOIN nhu_cau_su_dung nc
            ON nc.id = mnc.nhu_cau_id

          WHERE mnc.mau_thiet_bi_id = mtb.id
            AND nc.da_xoa_luc IS NULL
        ),
        '[]'::jsonb
      ) AS nhu_cau_su_dung,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.da_xoa_luc IS NULL
      ) AS tong_thiet_bi_vat_ly,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.trang_thai = 501
          AND tbvl.da_xoa_luc IS NULL
      ) AS so_luong_san_sang

    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = mtb.trang_thai

    WHERE mtb.da_xoa_luc IS NULL

    ORDER BY mtb.created_at DESC
  `;
}

async function timMauTrungTen(tenMau, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_mau
    FROM mau_thiet_bi
    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenMau);

  const mauTrung = rows.find((item) => {
    if (idBoQua && String(item.id) === String(idBoQua)) {
      return false;
    }

    return chuanHoaTenDeSoSanh(item.ten_mau) === tenMoi;
  });

  return mauTrung || null;
}


async function themLienKetNhuCau(
  ketNoi,
  mauThietBiId,
  danhSachNhuCauId = []
) {
  const danhSachId = [
    ...new Set(
      danhSachNhuCauId
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (danhSachId.length === 0) {
    return;
  }

  const values = Prisma.join(
    danhSachId.map(
      (nhuCauId) =>
        Prisma.sql`(
          ${mauThietBiId}::uuid,
          ${nhuCauId}::uuid,
          NOW()
        )`
    )
  );

  await ketNoi.$executeRaw`
    INSERT INTO mau_thiet_bi_nhu_cau (
      mau_thiet_bi_id,
      nhu_cau_id,
      created_at
    )
    VALUES ${values}
  `;
}

async function taoMauThietBi({
  danhMucId,
  hangId,
  ngamId,
  nhuCauIds = [],
  tenMau,
  moTa,
  anhUrl,
  giaThueNgay,
  giaTriThietBi,
  tyLeCoc,
  tienCoc,
  trangThai,
}) {
  return await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      INSERT INTO mau_thiet_bi (
        id,
        danh_muc_id,
        hang_id,
        ngam_id,
        ten_mau,
        mo_ta,
        anh_url,
        gia_thue_ngay,
        gia_tri_thiet_bi,
        ty_le_coc,
        tien_coc,
        trang_thai,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${danhMucId}::uuid,
        ${hangId}::uuid,
        ${ngamId || null}::uuid,
        ${tenMau},
        ${moTa},
        ${anhUrl},
        ${giaThueNgay},
        ${giaTriThietBi},
        ${tyLeCoc},
        ${tienCoc},
        ${trangThai},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const mauMoi = rows[0];

    await themLienKetNhuCau(
      tx,
      mauMoi.id,
      nhuCauIds
    );

    return mauMoi;
  });
}

async function capNhatMauThietBi(id, {
  danhMucId,
  hangId,
  ngamId,
  nhuCauIds = [],
  capNhatNhuCau = false,
  tenMau,
  moTa,
  anhUrl,
  giaThueNgay,
  giaTriThietBi,
  tyLeCoc,
  tienCoc,
}) {
  return await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      UPDATE mau_thiet_bi
      SET
        danh_muc_id = ${danhMucId}::uuid,
        hang_id = ${hangId}::uuid,
        ngam_id = ${ngamId || null}::uuid,
        ten_mau = ${tenMau},
        mo_ta = ${moTa},
        anh_url = ${anhUrl},
        gia_thue_ngay = ${giaThueNgay},
        gia_tri_thiet_bi = ${giaTriThietBi},
        ty_le_coc = ${tyLeCoc},
        tien_coc = ${tienCoc},
        updated_at = NOW()
      WHERE id = ${id}::uuid
        AND da_xoa_luc IS NULL
      RETURNING id
    `;

    const mauSauCapNhat = rows[0] || null;

    if (!mauSauCapNhat) {
      return null;
    }

    if (capNhatNhuCau) {
      await tx.$executeRaw`
        DELETE FROM mau_thiet_bi_nhu_cau
        WHERE mau_thiet_bi_id = ${id}::uuid
      `;

      await themLienKetNhuCau(
        tx,
        id,
        nhuCauIds
      );
    }

    return mauSauCapNhat;
  });
}

async function capNhatTrangThaiMauThietBi(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE mau_thiet_bi
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}


// ============================================================
// NGÀM THIẾT BỊ
// ============================================================

async function layThongTinMauThietBiChinh(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.hang_id,
      h.ten_hang,
      mtb.ngam_id,
      n.ten_ngam,
      mtb.ten_mau,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layDanhSachBoDiKem(mauThietBiChinhId) {
  return await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.so_luong,
      bdk.created_at,

      mtb_phu.id AS mau_thiet_bi_phu_id,
      h_phu.ten_hang AS ten_hang_thiet_bi_phu,
      mtb_phu.ten_mau AS ten_mau_thiet_bi_phu,
      dmtb_phu.ten_danh_muc AS ten_danh_muc_thiet_bi_phu,

      pk.id AS phu_kien_id,
      pk.ten_phu_kien,
      pk.trang_thai AS trang_thai_phu_kien,
      pk.tong_so_luong::int AS tong_so_luong,
      pk.danh_muc_id AS danh_muc_id_phu_kien,
      dmtb_pk.ten_danh_muc AS ten_danh_muc_phu_kien,
      pk.ngam_id AS ngam_id_phu_kien,
      n_pk.ten_ngam AS ten_ngam_phu_kien

    FROM bo_di_kem bdk

    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id

    LEFT JOIN hang_thiet_bi h_phu
      ON h_phu.id = mtb_phu.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb_phu
      ON dmtb_phu.id = mtb_phu.danh_muc_id

    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id

    LEFT JOIN danh_muc_thiet_bi dmtb_pk
      ON dmtb_pk.id = pk.danh_muc_id

    LEFT JOIN ngam_thiet_bi n_pk
      ON n_pk.id = pk.ngam_id
      AND n_pk.da_xoa_luc IS NULL

    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid

    ORDER BY bdk.created_at ASC
  `;
}

async function layGoiYThietBiPhu(mauThietBiChinhId, mauChinh, khoaTim) {
  return await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_mau,
      mtb.hang_id,
      h.ten_hang,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.id <> ${mauThietBiChinhId}::uuid
      AND mtb.trang_thai = 601
      AND (
        -- Riêng danh mục Thẻ nhớ: lấy tất cả, không phân biệt hãng.
        dmtb.ten_danh_muc ILIKE ${"Thẻ nhớ"}

        OR (
          -- Các thiết bị phụ khác phải thuộc nhóm thiết bị phụ.
          dmtb.tinh_chat_id = 2502

          AND (
            -- Cùng hãng với mẫu thiết bị chính.
            mtb.hang_id = ${mauChinh.hang_id}::uuid

            -- Thiết bị phụ không gán hãng vẫn được sử dụng.
            OR mtb.hang_id IS NULL
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM bo_di_kem bdk
        WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
          AND bdk.mau_thiet_bi_phu_id = mtb.id
      )
      AND (
        ${khoaTim} = ''
        OR mtb.ten_mau ILIKE ${khoaTim}
        OR COALESCE(h.ten_hang, '') ILIKE ${khoaTim}
        OR dmtb.ten_danh_muc ILIKE ${khoaTim}
      )

    ORDER BY mtb.ten_mau ASC
    LIMIT 20
  `;
}

async function layGoiYPhuKien(
  mauThietBiChinhId,
  mauChinh,
  khoaTim
) {
  const laOngKinh =
    chuanHoaTenDeSoSanh(mauChinh?.ten_danh_muc) ===
    chuanHoaTenDeSoSanh("Ống kính");

  const ngamIdCuaOngKinh =
    laOngKinh && mauChinh?.ngam_id
      ? mauChinh.ngam_id
      : null;

  return await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,
      pk.danh_muc_id,
      dmtb.ten_danh_muc,
      pk.ngam_id,
      n.ten_ngam,
      pk.tong_so_luong::int AS tong_so_luong

    FROM phu_kien pk

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = pk.ngam_id
      AND n.da_xoa_luc IS NULL

    WHERE pk.da_xoa_luc IS NULL
      AND pk.trang_thai = ${TRANG_THAI_HIEN_THI}

      AND (
        COALESCE(dmtb.ten_danh_muc, '') NOT ILIKE ${"Cáp sau"}

        OR (
          ${laOngKinh}
          AND ${ngamIdCuaOngKinh}::uuid IS NOT NULL
          AND pk.ngam_id = ${ngamIdCuaOngKinh}::uuid
        )
      )

      -- Các ghi chú cũ dưới đây được giữ lại để đối chiếu lịch sử:
      -- Riêng danh mục Thẻ nhớ: lấy tất cả, không phân biệt hãng.
      -- Phụ kiện không gán hãng vẫn được sử dụng.
      -- Phụ kiện có hãng phải cùng hãng với mẫu thiết bị chính.
      -- Từ phiên bản này phụ kiện không còn cột hãng.
      -- Chỉ Cáp sau của Ống kính mới được lọc theo ngàm.

      AND NOT EXISTS (
        SELECT 1
        FROM bo_di_kem bdk
        WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
          AND bdk.phu_kien_id = pk.id
      )
      AND (
        ${khoaTim} = ''
        OR pk.ten_phu_kien ILIKE ${khoaTim}
        OR COALESCE(dmtb.ten_danh_muc, '') ILIKE ${khoaTim}
        OR COALESCE(n.ten_ngam, '') ILIKE ${khoaTim}
      )

    ORDER BY pk.ten_phu_kien ASC
    LIMIT 20
  `;
}

async function layMauThietBiPhuTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.hang_id,
      h.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id
    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layPhuKienTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,
      pk.tong_so_luong,
      pk.danh_muc_id,
      dmtb.ten_danh_muc,
      pk.ngam_id,
      n.ten_ngam

    FROM phu_kien pk

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = pk.ngam_id
      AND n.da_xoa_luc IS NULL

    WHERE pk.id = ${id}::uuid
      AND pk.da_xoa_luc IS NULL
      AND pk.trang_thai = ${TRANG_THAI_HIEN_THI}

    LIMIT 1
  `;

  return rows[0] || null;
}

async function timBoDiKemTheoThietBiPhu(mauThietBiChinhId, mauThietBiPhuId) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
      AND mau_thiet_bi_phu_id = ${mauThietBiPhuId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timBoDiKemTheoPhuKien(mauThietBiChinhId, phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
      AND phu_kien_id = ${phuKienId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function themBoDiKemThietBiPhu(mauThietBiChinhId, mauThietBiPhuId, soLuong) {
  await prisma.$executeRaw`
    INSERT INTO bo_di_kem (
      id,
      mau_thiet_bi_chinh_id,
      mau_thiet_bi_phu_id,
      phu_kien_id,
      so_luong,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${mauThietBiChinhId}::uuid,
      ${mauThietBiPhuId}::uuid,
      NULL,
      ${soLuong},
      NOW()
    )
  `;
}

async function themBoDiKemPhuKien(mauThietBiChinhId, phuKienId, soLuong) {
  await prisma.$executeRaw`
    INSERT INTO bo_di_kem (
      id,
      mau_thiet_bi_chinh_id,
      mau_thiet_bi_phu_id,
      phu_kien_id,
      so_luong,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${mauThietBiChinhId}::uuid,
      NULL,
      ${phuKienId}::uuid,
      ${soLuong},
      NOW()
    )
  `;
}

async function layBoDiKemTheoId(mauThietBiChinhId, bundleId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      mau_thiet_bi_chinh_id,
      mau_thiet_bi_phu_id,
      phu_kien_id
    FROM bo_di_kem
    WHERE id = ${bundleId}::uuid
      AND mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function kiemTraBoDiKemDangDuocDonHoatDong(bundleId) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM bo_di_kem bdk
      JOIN chi_tiet_don_thue ctdt
        ON ctdt.mau_thiet_bi_id = bdk.mau_thiet_bi_chinh_id
      JOIN don_thue dt
        ON dt.id = ctdt.don_thue_id
      WHERE bdk.id = ${bundleId}::uuid
        AND dt.trang_thai IN (
          ${DON_DA_GIU_CHO},
          ${DON_DANG_THUE},
          ${DON_QUA_HAN}
        )
    ) AS dang_su_dung
  `;

  return Boolean(rows[0]?.dang_su_dung);
}

async function xoaBoDiKem(bundleId) {
  await prisma.$executeRaw`
    DELETE FROM bo_di_kem
    WHERE id = ${bundleId}::uuid
  `;
}

module.exports = {
  layDanhMucHopLe,
  layHangHopLe,
  layMauThietBiTheoId,
  layDanhSachMauThietBiAdmin,
  timMauTrungTen,
  taoMauThietBi,
  capNhatMauThietBi,
  capNhatTrangThaiMauThietBi,


  layThongTinMauThietBiChinh,
  layDanhSachBoDiKem,
  layGoiYThietBiPhu,
  layGoiYPhuKien,
  layMauThietBiPhuTheoId,
  layPhuKienTheoId,
  timBoDiKemTheoThietBiPhu,
  timBoDiKemTheoPhuKien,
  themBoDiKemThietBiPhu,
  themBoDiKemPhuKien,
  layBoDiKemTheoId,
  kiemTraBoDiKemDangDuocDonHoatDong,
  xoaBoDiKem,
};
