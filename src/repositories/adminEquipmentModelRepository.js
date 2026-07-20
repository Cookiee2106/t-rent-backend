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

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      mtb.trang_thai,
      tt.ten_trang_thai,
      mtb.created_at,
      mtb.updated_at,

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

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      mtb.trang_thai,
      tt.ten_trang_thai,
      mtb.created_at,
      mtb.updated_at,

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

async function taoMauThietBi({
  danhMucId,
  hangId,
  tenMau,
  moTa,
  anhUrl,
  giaThueNgay,
  tienCoc,
  trangThai,
}) {
  const rows = await prisma.$queryRaw`
    INSERT INTO mau_thiet_bi (
      id,
      danh_muc_id,
      hang_id,
      ten_mau,
      mo_ta,
      anh_url,
      gia_thue_ngay,
      tien_coc,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${danhMucId}::uuid,
      ${hangId}::uuid,
      ${tenMau},
      ${moTa},
      ${anhUrl},
      ${giaThueNgay},
      ${tienCoc},
      ${trangThai},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatMauThietBi(id, {
  danhMucId,
  hangId,
  tenMau,
  moTa,
  anhUrl,
  giaThueNgay,
  tienCoc,
}) {
  const rows = await prisma.$queryRaw`
    UPDATE mau_thiet_bi
    SET
      danh_muc_id = ${danhMucId}::uuid,
      hang_id = ${hangId}::uuid,
      ten_mau = ${tenMau},
      mo_ta = ${moTa},
      anh_url = ${anhUrl},
      gia_thue_ngay = ${giaThueNgay},
      tien_coc = ${tienCoc},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
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

async function layThongTinMauThietBiChinh(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.hang_id,
      h.ten_hang,
      mtb.ten_mau,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

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
      h_pk.ten_hang AS ten_hang_phu_kien,
      dmtb_pk.ten_danh_muc AS ten_danh_muc_phu_kien

    FROM bo_di_kem bdk

    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id

    LEFT JOIN hang_thiet_bi h_phu
      ON h_phu.id = mtb_phu.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb_phu
      ON dmtb_phu.id = mtb_phu.danh_muc_id

    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id

    LEFT JOIN hang_thiet_bi h_pk
      ON h_pk.id = pk.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb_pk
      ON dmtb_pk.id = pk.danh_muc_id

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
        (dmtb.tinh_chat_id = 2502 AND mtb.hang_id = ${mauChinh.hang_id}::uuid)
        OR dmtb.ten_danh_muc = ${"Thẻ nhớ"}
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

async function layGoiYPhuKien(mauThietBiChinhId, khoaTim) {
  return await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,
      pk.hang_id,
      h.ten_hang,
      pk.danh_muc_id,
      dmtb.ten_danh_muc

    FROM phu_kien pk

    LEFT JOIN hang_thiet_bi h
      ON h.id = pk.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id

    WHERE pk.da_xoa_luc IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM bo_di_kem bdk
        WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
          AND bdk.phu_kien_id = pk.id
      )
      AND (
        ${khoaTim} = ''
        OR pk.ten_phu_kien ILIKE ${khoaTim}
        OR COALESCE(h.ten_hang, '') ILIKE ${khoaTim}
        OR COALESCE(dmtb.ten_danh_muc, '') ILIKE ${khoaTim}
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
    SELECT id, ten_phu_kien, tong_so_luong
    FROM phu_kien
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
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
    SELECT id
    FROM bo_di_kem
    WHERE id = ${bundleId}::uuid
      AND mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
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
  xoaBoDiKem,
};
