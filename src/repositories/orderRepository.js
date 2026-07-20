const prisma = require("../config/prisma");

const TRANG_THAI_DA_GIU_CHO = 1102;
const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_QUA_HAN = 1105;

const TRANG_THAI_THIET_BI_SAN_SANG = 501;
const TRANG_THAI_THIET_BI_DANG_THUE = 502;

const LOAI_TIEN_COC = 2301;
const LOAI_TIEN_THUE = 2302;

async function demDonThue(trangThai, tuKhoa = "") {
  const tuKhoaTim = `%${tuKhoa}%`;

  if (trangThai && tuKhoa) {
    const ketQua = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      WHERE dt.trang_thai = ${trangThai}
        AND (
          LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
          OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
          OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
        )
    `;

    return ketQua[0]?.total || 0;
  }

  if (trangThai) {
    const ketQua = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM don_thue
      WHERE trang_thai = ${trangThai}
    `;

    return ketQua[0]?.total || 0;
  }

  if (tuKhoa) {
    const ketQua = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      WHERE LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
         OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
         OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
    `;

    return ketQua[0]?.total || 0;
  }

  const ketQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM don_thue
  `;

  return ketQua[0]?.total || 0;
}

async function layDanhSachDonThue({ trangThai, tuKhoa = "", limit, offset }) {
  const tuKhoaTim = `%${tuKhoa}%`;

  if (trangThai && tuKhoa) {
    return await prisma.$queryRaw`
      SELECT
        dt.id,
        dt.ma_don,
        dt.khach_hang_id,
        nd.ho_ten AS ten_khach_hang,
        nd.email AS email_khach_hang,
        nd.so_dien_thoai AS sdt_khach_hang,
        dt.ngay_nhan,
        dt.ngay_tra,
        dt.so_ngay_thue,
        dt.tong_tien_thue::text AS tong_tien_thue,
        dt.tong_tien_coc::text AS tong_tien_coc,
        dt.trang_thai,
        tt.ten_trang_thai,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        (
          SELECT mtb.anh_url
          FROM chi_tiet_don_thue ctdt
          JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
          WHERE ctdt.don_thue_id = dt.id
          ORDER BY ctdt.created_at ASC
          LIMIT 1
        ) AS anh_url_mau_thiet_bi,
        dt.created_at,
        dt.updated_at
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
      WHERE dt.trang_thai = ${trangThai}
        AND (
          LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
          OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
          OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
        )
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (trangThai) {
    return await prisma.$queryRaw`
      SELECT
        dt.id,
        dt.ma_don,
        dt.khach_hang_id,
        nd.ho_ten AS ten_khach_hang,
        nd.email AS email_khach_hang,
        nd.so_dien_thoai AS sdt_khach_hang,
        dt.ngay_nhan,
        dt.ngay_tra,
        dt.so_ngay_thue,
        dt.tong_tien_thue::text AS tong_tien_thue,
        dt.tong_tien_coc::text AS tong_tien_coc,
        dt.trang_thai,
        tt.ten_trang_thai,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        (
          SELECT mtb.anh_url
          FROM chi_tiet_don_thue ctdt
          JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
          WHERE ctdt.don_thue_id = dt.id
          ORDER BY ctdt.created_at ASC
          LIMIT 1
        ) AS anh_url_mau_thiet_bi,
        dt.created_at,
        dt.updated_at
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
      WHERE dt.trang_thai = ${trangThai}
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  if (tuKhoa) {
    return await prisma.$queryRaw`
      SELECT
        dt.id,
        dt.ma_don,
        dt.khach_hang_id,
        nd.ho_ten AS ten_khach_hang,
        nd.email AS email_khach_hang,
        nd.so_dien_thoai AS sdt_khach_hang,
        dt.ngay_nhan,
        dt.ngay_tra,
        dt.so_ngay_thue,
        dt.tong_tien_thue::text AS tong_tien_thue,
        dt.tong_tien_coc::text AS tong_tien_coc,
        dt.trang_thai,
        tt.ten_trang_thai,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        (
          SELECT mtb.anh_url
          FROM chi_tiet_don_thue ctdt
          JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
          WHERE ctdt.don_thue_id = dt.id
          ORDER BY ctdt.created_at ASC
          LIMIT 1
        ) AS anh_url_mau_thiet_bi,
        dt.created_at,
        dt.updated_at
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
      WHERE LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
         OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
         OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      nd.ho_ten AS ten_khach_hang,
      nd.email AS email_khach_hang,
      nd.so_dien_thoai AS sdt_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.huy_luc,
      (
        SELECT mtb.anh_url
        FROM chi_tiet_don_thue ctdt
        JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
        WHERE ctdt.don_thue_id = dt.id
        ORDER BY ctdt.created_at ASC
        LIMIT 1
      ) AS anh_url_mau_thiet_bi,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
    ORDER BY dt.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

async function layDonThueTheoId(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      nd.ho_ten AS ten_khach_hang,
      nd.email AS email_khach_hang,
      nd.so_dien_thoai AS sdt_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_THUE}
      ) AS tien_thue_da_thanh_toan,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,
      dt.ban_giao_luc,
      dt.nguoi_ban_giao_id,
      nv_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,
      dt.tra_luc,
      dt.nguoi_nhan_tra_id,
      nv_tra.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
    LEFT JOIN nguoi_dung nv_bg ON nv_bg.id = dt.nguoi_ban_giao_id
    LEFT JOIN nguoi_dung nv_tra ON nv_tra.id = dt.nguoi_nhan_tra_id
    WHERE dt.id = ${donThueId}::uuid
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function layChiTietDonThue(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      ctdt.id,
      ctdt.mau_thiet_bi_id,
      h.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dmtb.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc
    FROM chi_tiet_don_thue ctdt
    JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = mtb.hang_id
    LEFT JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    ORDER BY ctdt.created_at ASC
  `;
}

async function layVatPhamBanGiao(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      bgvp.id,
      bgvp.chi_tiet_don_thue_id,
      bgvp.bo_di_kem_id,
      bgvp.thiet_bi_id,
      tbvl.so_serial,
      vt.ten_vi_tri AS ten_vi_tri_kho,
      bgvp.phu_kien_id,
      pk.ten_phu_kien,
      bgvp.ten_vat_pham_snapshot,
      bgvp.ma_tai_san_snapshot,
      bgvp.so_serial_snapshot,
      bgvp.so_luong_giao,
      bgvp.ghi_chu_ban_giao,
      bgvp.created_at
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    LEFT JOIN thiet_bi_vat_ly tbvl ON tbvl.id = bgvp.thiet_bi_id
    LEFT JOIN vi_tri_kho vt ON vt.id = tbvl.vi_tri_kho_id
    LEFT JOIN phu_kien pk ON pk.id = bgvp.phu_kien_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    ORDER BY bgvp.created_at ASC
  `;
}

async function layThanhToanCuaDon(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dm.ten_danh_muc AS ten_loai_dong_tien,
      COALESCE(nd_tt.ho_ten, nd_kh.ho_ten) AS ten_nguoi_thanh_toan,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at
    FROM thanh_toan tt
    JOIN don_thue dt ON dt.id = tt.don_thue_id
    JOIN nguoi_dung nd_kh ON nd_kh.id = dt.khach_hang_id
    LEFT JOIN nguoi_dung nd_tt ON nd_tt.id = tt.nguoi_thuc_hien_id
    LEFT JOIN danh_muc_he_thong dm ON dm.id = tt.loai_dong_tien_id
    WHERE tt.don_thue_id = ${donThueId}::uuid
    ORDER BY tt.created_at ASC
  `;
}

async function layTepDonThue(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      tdt.id,
      tdt.muc_dich_id,
      dm.ten_danh_muc AS ten_muc_dich,
      tdt.ten_file_goc,
      tdt.file_url,
      tdt.loai_file,
      tdt.kich_thuoc_file::text AS kich_thuoc_file,
      nd.ho_ten AS ten_nguoi_upload,
      tdt.uploaded_at
    FROM tep_don_thue tdt
    LEFT JOIN danh_muc_he_thong dm ON dm.id = tdt.muc_dich_id
    LEFT JOIN nguoi_dung nd ON nd.id = tdt.uploaded_by
    WHERE tdt.don_thue_id = ${donThueId}::uuid
    ORDER BY tdt.uploaded_at DESC
  `;
}

async function layThietBiSanSang({ mauThietBiId, ngayNhan, ngayTra }) {
  if (ngayNhan && ngayTra) {
    return await prisma.$queryRaw`
      SELECT
        tbvl.id,
        tbvl.mau_thiet_bi_id,
        tbvl.ma_tai_san,
        tbvl.so_serial,
        tbvl.vi_tri_kho_id,
        vt.ten_vi_tri AS ten_vi_tri_kho,
        tbvl.trang_thai,
        tt.ten_trang_thai
      FROM thiet_bi_vat_ly tbvl
      LEFT JOIN vi_tri_kho vt ON vt.id = tbvl.vi_tri_kho_id
      LEFT JOIN trang_thai_he_thong tt ON tt.id = tbvl.trang_thai
      WHERE tbvl.mau_thiet_bi_id = ${mauThietBiId}::uuid
        AND tbvl.da_xoa_luc IS NULL
        AND tbvl.trang_thai = ${TRANG_THAI_THIET_BI_SAN_SANG}
        AND tbvl.id NOT IN (
          SELECT bgvp.thiet_bi_id
          FROM ban_giao_vat_pham bgvp
          JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
          JOIN don_thue dt ON dt.id = ctdt.don_thue_id
          WHERE bgvp.thiet_bi_id IS NOT NULL
            AND dt.trang_thai IN (${TRANG_THAI_DANG_THUE}, ${TRANG_THAI_QUA_HAN})
            AND dt.ngay_nhan < ${ngayTra}::timestamptz
            AND dt.ngay_tra > ${ngayNhan}::timestamptz
        )
      ORDER BY tbvl.so_serial ASC
    `;
  }

  return await prisma.$queryRaw`
    SELECT
      tbvl.id,
      tbvl.mau_thiet_bi_id,
      tbvl.ma_tai_san,
      tbvl.so_serial,
      tbvl.vi_tri_kho_id,
      vt.ten_vi_tri AS ten_vi_tri_kho,
      tbvl.trang_thai,
      tt.ten_trang_thai
    FROM thiet_bi_vat_ly tbvl
    LEFT JOIN vi_tri_kho vt ON vt.id = tbvl.vi_tri_kho_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = tbvl.trang_thai
    WHERE tbvl.mau_thiet_bi_id = ${mauThietBiId}::uuid
      AND tbvl.da_xoa_luc IS NULL
      AND tbvl.trang_thai = ${TRANG_THAI_THIET_BI_SAN_SANG}
    ORDER BY tbvl.so_serial ASC
  `;
}

async function layDonDeBanGiao(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT id, trang_thai, tong_tien_thue::text AS tong_tien_thue
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function kiemTraDonDaCoc(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT id
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id = 2301
    LIMIT 1
  `;

  return ketQua.length > 0;
}

async function layChiTietDonDeBanGiao(donThueId) {
  return await prisma.$queryRaw`
    SELECT id, mau_thiet_bi_id, so_luong
    FROM chi_tiet_don_thue
    WHERE don_thue_id = ${donThueId}::uuid
  `;
}

async function layBoDiKemTheoMauIds(mauIds) {
  if (!mauIds || mauIds.length === 0) {
    return [];
  }

  return await prisma.$queryRaw`
    SELECT
      id,
      mau_thiet_bi_chinh_id,
      mau_thiet_bi_phu_id,
      phu_kien_id,
      so_luong
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ANY(${mauIds}::uuid[])
  `;
}

async function layThietBiVatLyTheoId(thietBiId) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      tb.id,
      tb.mau_thiet_bi_id,
      tb.ma_tai_san,
      tb.so_serial,
      tb.vi_tri_kho_id,
      vt.ten_vi_tri AS ten_vi_tri_kho,
      tb.trang_thai,
      h.ten_hang,
      mtb.ten_mau
    FROM thiet_bi_vat_ly tb
    JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = mtb.hang_id
    LEFT JOIN vi_tri_kho vt ON vt.id = tb.vi_tri_kho_id
    WHERE tb.id = ${thietBiId}::uuid
      AND tb.da_xoa_luc IS NULL
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function layPhuKienTheoId(phuKienId) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      id,
      ten_phu_kien,
      tong_so_luong
    FROM phu_kien
    WHERE id = ${phuKienId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function demSoLuongPhuKienDangGiao(phuKienId) {
  const ketQua = await prisma.$queryRaw`
    SELECT COALESCE(SUM(bgvp.so_luong_giao), 0)::int AS so_luong_dang_giao
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    JOIN don_thue dt ON dt.id = ctdt.don_thue_id
    WHERE bgvp.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (${TRANG_THAI_DANG_THUE}, ${TRANG_THAI_QUA_HAN})
  `;

  return ketQua[0]?.so_luong_dang_giao || 0;
}

async function luuPhieuBanGiao({
  donThueId,
  nhanVienId,
  ghiChuBanGiao,
  vatPham,
  tepHopDong,
  tepAnhBanGiao,
  thietBiCanCapNhat,
  tongTienThue,
}) {
  await prisma.$transaction(async (tx) => {
    for (const item of vatPham) {
      await tx.$executeRaw`
        INSERT INTO ban_giao_vat_pham (
          id,
          chi_tiet_don_thue_id,
          bo_di_kem_id,
          thiet_bi_id,
          phu_kien_id,
          ten_vat_pham_snapshot,
          ma_tai_san_snapshot,
          so_serial_snapshot,
          so_luong_giao,
          ghi_chu_ban_giao,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${item.chi_tiet_don_thue_id}::uuid,
          ${item.bo_di_kem_id}::uuid,
          ${item.thiet_bi_id}::uuid,
          ${item.phu_kien_id}::uuid,
          ${item.ten_vat_pham_snapshot},
          ${item.ma_tai_san_snapshot},
          ${item.so_serial_snapshot},
          ${item.so_luong_giao},
          ${ghiChuBanGiao || null},
          NOW()
        )
      `;
    }

    for (const file of tepHopDong) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          id,
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${donThueId}::uuid,
          2601,
          ${file.ten_file_goc},
          ${file.file_url},
          ${file.loai_file},
          ${file.kich_thuoc_file},
          ${nhanVienId}::uuid,
          NOW(),
          NOW()
        )
      `;
    }

    for (const file of tepAnhBanGiao) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          id,
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${donThueId}::uuid,
          2602,
          ${file.ten_file_goc},
          ${file.file_url},
          ${file.loai_file},
          ${file.kich_thuoc_file},
          ${nhanVienId}::uuid,
          NOW(),
          NOW()
        )
      `;
    }

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        trang_thai = ${TRANG_THAI_DANG_THUE},
        ban_giao_luc = NOW(),
        nguoi_ban_giao_id = ${nhanVienId}::uuid,
        ghi_chu_ban_giao = ${ghiChuBanGiao || null},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    for (const thietBiId of thietBiCanCapNhat) {
      await tx.$executeRaw`
        UPDATE thiet_bi_vat_ly
        SET
          trang_thai = ${TRANG_THAI_THIET_BI_DANG_THUE},
          updated_at = NOW()
        WHERE id = ${thietBiId}::uuid
      `;
    }

    await tx.$executeRaw`
      INSERT INTO thanh_toan (
        id,
        don_thue_id,
        so_tien,
        loai_dong_tien_id,
        nguoi_thuc_hien_id,
        ghi_chu,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${donThueId}::uuid,
        ${Number(tongTienThue || 0)},
        2302,
        ${nhanVienId}::uuid,
        'Ghi nhận tiền thuê khi bàn giao thiết bị',
        NOW()
      )
    `;
  });
}

module.exports = {
  TRANG_THAI_DA_GIU_CHO,
  TRANG_THAI_THIET_BI_SAN_SANG,

  demDonThue,
  layDanhSachDonThue,
  layDonThueTheoId,
  layChiTietDonThue,
  layVatPhamBanGiao,
  layThanhToanCuaDon,
  layTepDonThue,
  layThietBiSanSang,

  layDonDeBanGiao,
  kiemTraDonDaCoc,
  layChiTietDonDeBanGiao,
  layBoDiKemTheoMauIds,
  layThietBiVatLyTheoId,
  layPhuKienTheoId,
  demSoLuongPhuKienDangGiao,
  luuPhieuBanGiao,
};
