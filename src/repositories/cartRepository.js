const prisma = require("../config/prisma");

async function layGioHangTheoKhachHangId(khachHangId) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM gio_hang
    WHERE khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function taoGioHang(khachHangId) {
  const rows = await prisma.$queryRaw`
    INSERT INTO gio_hang (
      id,
      khach_hang_id,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${khachHangId}::uuid,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function layDanhSachItemTheoGioHang(gioHangId) {
  return await prisma.$queryRaw`
    SELECT
      ctgh.id,
      ctgh.mau_thiet_bi_id,
      ctgh.so_luong,
      ctgh.ngay_nhan,
      ctgh.ngay_tra,
      ctgh.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctgh.gia_tri_thiet_bi_snapshot::text AS gia_tri_thiet_bi_snapshot,
      ctgh.ty_le_coc_snapshot::text AS ty_le_coc_snapshot,
      ctgh.tien_coc_snapshot::text AS tien_coc_snapshot,

      h.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dmtb.ten_danh_muc

    FROM chi_tiet_gio_hang ctgh

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctgh.mau_thiet_bi_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE ctgh.gio_hang_id = ${gioHangId}::uuid

    ORDER BY ctgh.created_at DESC
  `;
}

async function layMauThietBiDangHienThi(mauThietBiId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_mau,
      gia_thue_ngay,
      gia_tri_thiet_bi,
      ty_le_coc,
      tien_coc
    FROM mau_thiet_bi
    WHERE id = ${mauThietBiId}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = 601
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layItemCungMauTrongGio(gioHangId, mauThietBiId) {
  return await prisma.$queryRaw`
    SELECT
      id,
      so_luong,
      created_at
    FROM chi_tiet_gio_hang
    WHERE gio_hang_id = ${gioHangId}::uuid
      AND mau_thiet_bi_id = ${mauThietBiId}::uuid
    ORDER BY created_at ASC
  `;
}

async function themItemVaoGioHang({
  gioHangId,
  mauThietBiId,
  soLuong,
  ngayNhan,
  ngayTra,
  giaThueNgay,
  giaTriThietBi,
  tyLeCoc,
  tienCoc,
}) {
  await prisma.$executeRaw`
    INSERT INTO chi_tiet_gio_hang (
      id,
      gio_hang_id,
      mau_thiet_bi_id,
      so_luong,
      ngay_nhan,
      ngay_tra,
      gia_thue_ngay_snapshot,
      gia_tri_thiet_bi_snapshot,
      ty_le_coc_snapshot,
      tien_coc_snapshot,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${gioHangId}::uuid,
      ${mauThietBiId}::uuid,
      ${soLuong},
      ${ngayNhan}::timestamptz,
      ${ngayTra}::timestamptz,
      ${giaThueNgay},
      ${giaTriThietBi},
      ${tyLeCoc},
      ${tienCoc},
      NOW(),
      NOW()
    )
  `;
}

async function capNhatItemTrongGio({
  itemId,
  soLuong,
  ngayNhan,
  ngayTra,
  giaThueNgay = null,
  giaTriThietBi = null,
  tyLeCoc = null,
  tienCoc = null,
}) {
  if (
    giaThueNgay !== null &&
    giaTriThietBi !== null &&
    tyLeCoc !== null &&
    tienCoc !== null
  ) {
    await prisma.$executeRaw`
      UPDATE chi_tiet_gio_hang
      SET
        so_luong = ${soLuong},
        ngay_nhan = ${ngayNhan}::timestamptz,
        ngay_tra = ${ngayTra}::timestamptz,
        gia_thue_ngay_snapshot = ${giaThueNgay},
        gia_tri_thiet_bi_snapshot = ${giaTriThietBi},
        ty_le_coc_snapshot = ${tyLeCoc},
        tien_coc_snapshot = ${tienCoc},
        updated_at = NOW()
      WHERE id = ${itemId}::uuid
    `;

    return;
  }

  await prisma.$executeRaw`
    UPDATE chi_tiet_gio_hang
    SET
      so_luong = ${soLuong},
      ngay_nhan = ${ngayNhan}::timestamptz,
      ngay_tra = ${ngayTra}::timestamptz,
      updated_at = NOW()
    WHERE id = ${itemId}::uuid
  `;
}

async function xoaItemTheoId(itemId) {
  await prisma.$executeRaw`
    DELETE FROM chi_tiet_gio_hang
    WHERE id = ${itemId}::uuid
  `;
}

async function layItemThuocKhachHang(khachHangId, itemId) {
  const rows = await prisma.$queryRaw`
    SELECT
      ctgh.id,
      ctgh.mau_thiet_bi_id,
      ctgh.so_luong,
      ctgh.ngay_nhan,
      ctgh.ngay_tra,
      mtb.ten_mau
    FROM chi_tiet_gio_hang ctgh

    JOIN gio_hang gh
      ON gh.id = ctgh.gio_hang_id

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctgh.mau_thiet_bi_id

    WHERE ctgh.id = ${itemId}::uuid
      AND gh.khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function demThietBiSanSangCuaMau(mauThietBiId) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS tong
    FROM thiet_bi_vat_ly
    WHERE mau_thiet_bi_id = ${mauThietBiId}::uuid
      AND trang_thai = 501
      AND da_xoa_luc IS NULL
  `;

  return Number(rows[0]?.tong || 0);
}

async function tinhSoLuongDaDatCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        WHERE ctdt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          -- Giữ nguyên logic mẫu: chỉ đơn 1102 cần trừ thêm ngoài thiết bị 501.
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
      )
      +
      (
        -- Phiên 901 còn hạn được tính như giữ chỗ tạm cho mẫu chính.
        SELECT COALESCE(SUM(ctpt.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt

        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id

        WHERE ctpt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          AND ptt.trang_thai = 901
          AND ptt.het_han_luc > NOW()
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      )
      +
      (
        -- Giữ tạm cả mẫu thiết bị phụ trong bộ đi kèm.
        SELECT COALESCE(SUM(ctpt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt

        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id

        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctpt.mau_thiet_bi_id

        WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
          AND ptt.trang_thai = 901
          AND ptt.het_han_luc > NOW()
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS da_dat
  `;

  return Number(rows[0]?.da_dat || 0);
}

async function layBoDiKemCuaMau(mauThietBiId) {
  return await prisma.$queryRaw`
    SELECT
      id,
      so_luong,
      mau_thiet_bi_phu_id,
      phu_kien_id
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid
  `;
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

async function tinhSoLuongDaDatCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const rows = await prisma.$queryRaw`
    SELECT
      (
        SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

        WHERE bdk.phu_kien_id = ${phuKienId}::uuid
          -- Phụ kiện phải trừ đủ: Đã giữ chỗ, Đang thuê, Quá hạn.
          AND dt.trang_thai IN (1102, 1103, 1105)
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      +
      (
        -- Phiên 901 còn hạn cũng giữ tạm phụ kiện.
        SELECT COALESCE(SUM(ctpt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt

        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id

        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctpt.mau_thiet_bi_id

        WHERE bdk.phu_kien_id = ${phuKienId}::uuid
          AND ptt.trang_thai = 901
          AND ptt.het_han_luc > NOW()
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS da_dat
  `;

  return Number(rows[0]?.da_dat || 0);
}

module.exports = {
  layGioHangTheoKhachHangId,
  taoGioHang,
  layDanhSachItemTheoGioHang,
  layMauThietBiDangHienThi,
  layItemCungMauTrongGio,
  themItemVaoGioHang,
  capNhatItemTrongGio,
  xoaItemTheoId,
  layItemThuocKhachHang,

  demThietBiSanSangCuaMau,
  tinhSoLuongDaDatCuaMau,
  layBoDiKemCuaMau,
  layTongSoLuongPhuKien,
  tinhSoLuongDaDatCuaPhuKien,
};
