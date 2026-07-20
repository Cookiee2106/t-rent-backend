const prisma = require("../config/prisma");

async function tinhSoLuongDaDatCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        WHERE ctdt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          AND dt.trang_thai = 1102
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      +
      (
        SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

        WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
          AND dt.trang_thai = 1102
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS da_dat
  `;

  return Number(rows[0]?.da_dat || 0);
}

async function tinhTongThietBiSanSangCuaMau(mauThietBiId) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS tong
    FROM thiet_bi_vat_ly
    WHERE mau_thiet_bi_id = ${mauThietBiId}::uuid
      AND trang_thai = 501
      AND da_xoa_luc IS NULL
  `;

  return Number(rows[0]?.tong || 0);
}

async function tinhSoLuongDaDatCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS da_dat
    FROM chi_tiet_don_thue ctdt

    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id

    JOIN bo_di_kem bdk
      ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (1102, 1103, 1105)
      AND dt.ngay_nhan < ${ngayTra}::timestamptz
      AND dt.ngay_tra > ${ngayNhan}::timestamptz
  `;

  return Number(rows[0]?.da_dat || 0);
}

async function layTongSoLuongPhuKien(phuKienId) {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(tong_so_luong, 0)::int AS tong
    FROM phu_kien
    WHERE id = ${phuKienId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return Number(rows[0]?.tong || 0);
}

async function layBoDiKemCuaMau(mauThietBiId) {
  return await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.so_luong,

      mtb_phu.id AS mau_thiet_bi_phu_id,
      h_phu.ten_hang AS ten_hang_phu,
      mtb_phu.ten_mau AS ten_mau_phu,
      dmtb_phu.ten_danh_muc AS ten_danh_muc_phu,

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

    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid

    ORDER BY bdk.created_at ASC
  `;
}

async function layDanhSachMauThietBi({ hangId, danhMucId }) {
  const coLocHang = !!hangId;
  const coLocDanhMuc = !!danhMucId;

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

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.trang_thai = 501
          AND tbvl.da_xoa_luc IS NULL
      ) AS so_luong_san_sang

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601
      AND (${coLocHang} = false OR mtb.hang_id = ${hangId || null}::uuid)
      AND (${coLocDanhMuc} = false OR mtb.danh_muc_id = ${danhMucId || null}::uuid)

    ORDER BY mtb.created_at DESC
  `;
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
      mtb.tien_coc::text AS tien_coc

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
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

async function laySanPhamTuongTu(mauId, danhMucId) {
  return await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,

      mtb.hang_id,
      h.ten_hang,

      mtb.ten_mau,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.id <> ${mauId}::uuid
      AND mtb.danh_muc_id = ${danhMucId}::uuid
      AND mtb.trang_thai = 601

    ORDER BY mtb.created_at DESC
  `;
}

module.exports = {
  tinhSoLuongDaDatCuaMau,
  tinhTongThietBiSanSangCuaMau,
  tinhSoLuongDaDatCuaPhuKien,
  layTongSoLuongPhuKien,
  layBoDiKemCuaMau,
  layDanhSachMauThietBi,
  layMauThietBiTheoId,
  laySanPhamTuongTu,
};
