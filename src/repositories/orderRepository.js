const prisma = require("../config/prisma");

const TRANG_THAI_DA_HUY = 1101;
const TRANG_THAI_DA_GIU_CHO = 1102;
const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_QUA_HAN = 1105;

const TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY = 1701;
const TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN = 1702;
const TRANG_THAI_YEU_CAU_HUY_TU_CHOI = 1703;

const TRANG_THAI_THIET_BI_SAN_SANG = 501;
const TRANG_THAI_THIET_BI_DANG_THUE = 502;

const LOAI_TIEN_COC = 2301;
const LOAI_TIEN_THUE = 2302;
const LOAI_HOAN_COC = 2303;
const LOAI_PHI_HUY_DON = 2306;

const MUC_DICH_ANH_BIEN_BAN_BAN_GIAO = 2604;

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

      ychd.id AS yeu_cau_huy_id,
      ychd.ly_do_huy AS ly_do_yeu_cau_huy,
      ychd.trang_thai_id AS trang_thai_yeu_cau_huy_id,
      ttychd.ten_trang_thai AS ten_trang_thai_yeu_cau_huy,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_yeu_cau,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_yeu_cau,
      ychd.phi_huy::text AS phi_huy_yeu_cau,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai_yeu_cau,
      ychd.gui_luc AS gui_luc_yeu_cau,
      ychd.xu_ly_luc AS xu_ly_luc_yeu_cau,
      ychd.ghi_chu_xu_ly AS ghi_chu_xu_ly_yeu_cau,

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
    LEFT JOIN yeu_cau_huy_don ychd ON ychd.don_thue_id = dt.id
    LEFT JOIN trang_thai_he_thong ttychd ON ttychd.id = ychd.trang_thai_id
    WHERE (
      ${trangThai}::int IS NULL
      OR dt.trang_thai = ${trangThai}
    )
      AND (
        ${tuKhoa} = ''
        OR LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
        OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
      )
    ORDER BY
      CASE
        WHEN ychd.trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY} THEN 0
        ELSE 1
      END,
      dt.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}


async function layDanhSachYeuCauHuy({ tuKhoa = "" }) {
  const tuKhoaTim = `%${tuKhoa}%`;

  return await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      nd.ho_ten AS ten_khach_hang,
      nd.so_dien_thoai AS sdt_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.created_at,

      ychd.id AS yeu_cau_huy_id,
      ychd.ly_do_huy AS ly_do_yeu_cau_huy,
      ychd.trang_thai_id AS trang_thai_yeu_cau_huy_id,
      ttychd.ten_trang_thai AS ten_trang_thai_yeu_cau_huy,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_yeu_cau,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_yeu_cau,
      ychd.phi_huy::text AS phi_huy_yeu_cau,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai_yeu_cau,
      ychd.gui_luc AS gui_luc_yeu_cau,
      ychd.xu_ly_luc AS xu_ly_luc_yeu_cau,
      ychd.ghi_chu_xu_ly AS ghi_chu_xu_ly_yeu_cau
    FROM yeu_cau_huy_don ychd
    JOIN don_thue dt ON dt.id = ychd.don_thue_id
    JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
    LEFT JOIN trang_thai_he_thong ttychd ON ttychd.id = ychd.trang_thai_id
    WHERE (
      ${tuKhoa} = ''
      OR LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
      OR LOWER(nd.ho_ten) LIKE LOWER(${tuKhoaTim})
      OR LOWER(COALESCE(nd.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
    )
    ORDER BY
      CASE
        WHEN ychd.trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY} THEN 0
        ELSE 1
      END,
      COALESCE(ychd.gui_luc, ychd.created_at) DESC
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
      nd.dia_chi AS dia_chi_khach_hang,
      (
        SELECT hsxm.so_cccd
        FROM ho_so_xac_minh hsxm
        WHERE hsxm.khach_hang_id = nd.id
          AND hsxm.trang_thai = 203
        ORDER BY COALESCE(hsxm.duyet_luc, hsxm.created_at) DESC
        LIMIT 1
      ) AS so_cccd_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,

      ychd.id AS yeu_cau_huy_id,
      ychd.ly_do_huy AS ly_do_yeu_cau_huy,
      ychd.trang_thai_id AS trang_thai_yeu_cau_huy_id,
      ttychd.ten_trang_thai AS ten_trang_thai_yeu_cau_huy,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_yeu_cau,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_yeu_cau,
      ychd.phi_huy::text AS phi_huy_yeu_cau,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai_yeu_cau,
      ychd.gui_luc AS gui_luc_yeu_cau,
      ychd.xu_ly_luc AS xu_ly_luc_yeu_cau,
      ychd.ghi_chu_xu_ly AS ghi_chu_xu_ly_yeu_cau,

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
      nv_bg.email AS email_nguoi_ban_giao,
      nv_bg.so_dien_thoai AS sdt_nguoi_ban_giao,
      nv_bg.so_cccd AS so_cccd_nguoi_ban_giao,
      nv_bg.vai_tro AS vai_tro_nguoi_ban_giao,
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
    LEFT JOIN yeu_cau_huy_don ychd ON ychd.don_thue_id = dt.id
    LEFT JOIN trang_thai_he_thong ttychd ON ttychd.id = ychd.trang_thai_id
    LEFT JOIN nguoi_dung nv_bg ON nv_bg.id = dt.nguoi_ban_giao_id
    LEFT JOIN nguoi_dung nv_tra ON nv_tra.id = dt.nguoi_nhan_tra_id
    WHERE dt.id = ${donThueId}::uuid
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function layNguoiDungNoiBoTheoId(nguoiDungId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ho_ten,
      email,
      so_dien_thoai,
      so_cccd,
      vai_tro
    FROM nguoi_dung
    WHERE id = ${nguoiDungId}::uuid
      AND vai_tro IN ('NHAN_VIEN', 'QUAN_TRI', 'QUAN_TRI_VIEN')
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
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
      ctdt.gia_tri_thiet_bi_snapshot::text AS gia_tri_thiet_bi_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc,
      ctdt.bo_di_kem_snapshot
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
      bgvp.phu_kien_id,
      bgvp.phu_kien_vi_tri_kho_id,
      pk.ten_phu_kien,
      COALESCE(vt_tb.ten_vi_tri, vt_pk.ten_vi_tri, vt_legacy.ten_vi_tri) AS ten_vi_tri_kho,
      bgvp.ten_vat_pham_snapshot,
      bgvp.ma_tai_san_snapshot,
      bgvp.so_serial_snapshot,
      bgvp.so_luong_giao,
      bgvp.ghi_chu_ban_giao,
      bgvp.created_at
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    LEFT JOIN thiet_bi_vat_ly tbvl ON tbvl.id = bgvp.thiet_bi_id
    LEFT JOIN vi_tri_kho vt_tb ON vt_tb.id = tbvl.vi_tri_kho_id
    LEFT JOIN phu_kien pk ON pk.id = bgvp.phu_kien_id
    LEFT JOIN phu_kien_vi_tri_kho pkvt
      ON pkvt.id = bgvp.phu_kien_vi_tri_kho_id
    LEFT JOIN vi_tri_kho vt_pk ON vt_pk.id = pkvt.vi_tri_kho_id
    LEFT JOIN vi_tri_kho vt_legacy ON vt_legacy.id = pk.vi_tri_kho_id
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
            AND dt.trang_thai IN (${TRANG_THAI_DA_GIU_CHO}, ${TRANG_THAI_DANG_THUE}, ${TRANG_THAI_QUA_HAN})
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
      AND tbvl.id NOT IN (
        SELECT bgvp.thiet_bi_id
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.thiet_bi_id IS NOT NULL
          AND dt.trang_thai IN (
            ${TRANG_THAI_DA_GIU_CHO},
            ${TRANG_THAI_DANG_THUE},
            ${TRANG_THAI_QUA_HAN}
          )
      )
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

async function coYeuCauHuyChoXuLy(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT id
    FROM yeu_cau_huy_don
    WHERE don_thue_id = ${donThueId}::uuid
      AND trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY}
    LIMIT 1
  `;

  return ketQua.length > 0;
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

async function layPhuKienViTriKhoTheoId(phuKienViTriKhoId) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      pkvt.id,
      pkvt.phu_kien_id,
      pkvt.vi_tri_kho_id,
      pkvt.so_luong::int AS so_luong,
      pkvt.dang_su_dung,
      vt.ten_vi_tri,
      vt.trang_thai AS trang_thai_vi_tri,
      vt.da_xoa_luc AS vi_tri_da_xoa_luc
    FROM phu_kien_vi_tri_kho pkvt
    JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
    WHERE pkvt.id = ${phuKienViTriKhoId}::uuid
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
      AND dt.trang_thai IN (${TRANG_THAI_DA_GIU_CHO}, ${TRANG_THAI_DANG_THUE}, ${TRANG_THAI_QUA_HAN})
  `;

  return ketQua[0]?.so_luong_dang_giao || 0;
}

async function xacNhanYeuCauHuyDon({
  yeuCauHuyId,
  nhanVienId,
  ghiChuXuLy,
}) {
  return await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT
        ychd.id,
        ychd.don_thue_id,
        ychd.ly_do_huy,
        ychd.trang_thai_id,
        ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
        ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_snapshot,
        dt.trang_thai AS trang_thai_don,
        dt.ban_giao_luc
      FROM yeu_cau_huy_don ychd
      JOIN don_thue dt ON dt.id = ychd.don_thue_id
      WHERE ychd.id = ${yeuCauHuyId}::uuid
      FOR UPDATE OF ychd, dt
    `;

    const yeuCau = rows[0];

    if (!yeuCau) {
      throw new Error("Không tìm thấy yêu cầu hủy đơn");
    }

    if (
      Number(yeuCau.trang_thai_id) !==
      TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY
    ) {
      throw new Error("Chỉ xử lý được yêu cầu hủy đang ở trạng thái Chờ xử lý");
    }

    if (
      Number(yeuCau.trang_thai_don) !== TRANG_THAI_DA_GIU_CHO ||
      yeuCau.ban_giao_luc
    ) {
      throw new Error("Đơn thuê không còn đủ điều kiện để xác nhận hủy");
    }

    const tyLePhiHuy = Number(yeuCau.ty_le_phi_huy_snapshot);
    const tongTienCoc = Number(yeuCau.tong_tien_coc_snapshot);

    if (
      !Number.isFinite(tyLePhiHuy) ||
      tyLePhiHuy < 0 ||
      tyLePhiHuy > 100 ||
      !Number.isFinite(tongTienCoc) ||
      tongTienCoc < 0
    ) {
      throw new Error("Snapshot phí hủy của yêu cầu không hợp lệ");
    }

    const phiHuy = Math.round((tongTienCoc * tyLePhiHuy) / 100);
    const tienCocHoanLai = Math.max(0, tongTienCoc - phiHuy);

    await tx.$executeRaw`
      UPDATE yeu_cau_huy_don
      SET
        trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN},
        phi_huy = ${phiHuy},
        tien_coc_hoan_lai = ${tienCocHoanLai},
        nguoi_xu_ly_id = ${nhanVienId}::uuid,
        xu_ly_luc = NOW(),
        ghi_chu_xu_ly = ${ghiChuXuLy || null},
        updated_at = NOW()
      WHERE id = ${yeuCauHuyId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        trang_thai = ${TRANG_THAI_DA_HUY},
        huy_luc = NOW(),
        ly_do_huy = ${yeuCau.ly_do_huy},
        updated_at = NOW()
      WHERE id = ${yeuCau.don_thue_id}::uuid
    `;

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
        ${yeuCau.don_thue_id}::uuid,
        ${phiHuy},
        ${LOAI_PHI_HUY_DON},
        ${nhanVienId}::uuid,
        'Ghi nhận phí hủy đơn khi xác nhận yêu cầu hủy',
        NOW()
      )
    `;

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
        ${yeuCau.don_thue_id}::uuid,
        ${tienCocHoanLai},
        ${LOAI_HOAN_COC},
        ${nhanVienId}::uuid,
        'Ghi nhận số tiền cọc cần hoàn lại sau khi hủy đơn',
        NOW()
      )
    `;

    return {
      id: yeuCauHuyId,
      don_thue_id: yeuCau.don_thue_id,
      trang_thai_id: TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN,
      ty_le_phi_huy_snapshot: tyLePhiHuy,
      tong_tien_coc_snapshot: tongTienCoc,
      phi_huy: phiHuy,
      tien_coc_hoan_lai: tienCocHoanLai,
    };
  });
}

async function tuChoiYeuCauHuyDon({
  yeuCauHuyId,
  nhanVienId,
  ghiChuXuLy,
}) {
  return await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT
        ychd.id,
        ychd.don_thue_id,
        ychd.trang_thai_id,
        dt.trang_thai AS trang_thai_don,
        dt.ban_giao_luc
      FROM yeu_cau_huy_don ychd
      JOIN don_thue dt ON dt.id = ychd.don_thue_id
      WHERE ychd.id = ${yeuCauHuyId}::uuid
      FOR UPDATE OF ychd, dt
    `;

    const yeuCau = rows[0];

    if (!yeuCau) {
      throw new Error("Không tìm thấy yêu cầu hủy đơn");
    }

    if (
      Number(yeuCau.trang_thai_id) !==
      TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY
    ) {
      throw new Error("Chỉ xử lý được yêu cầu hủy đang ở trạng thái Chờ xử lý");
    }

    if (
      Number(yeuCau.trang_thai_don) !== TRANG_THAI_DA_GIU_CHO ||
      yeuCau.ban_giao_luc
    ) {
      throw new Error("Đơn thuê không còn đủ điều kiện để từ chối yêu cầu hủy");
    }

    await tx.$executeRaw`
      UPDATE yeu_cau_huy_don
      SET
        trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_TU_CHOI},
        nguoi_xu_ly_id = ${nhanVienId}::uuid,
        xu_ly_luc = NOW(),
        ghi_chu_xu_ly = ${ghiChuXuLy || null},
        updated_at = NOW()
      WHERE id = ${yeuCauHuyId}::uuid
    `;

    return {
      id: yeuCauHuyId,
      don_thue_id: yeuCau.don_thue_id,
      trang_thai_id: TRANG_THAI_YEU_CAU_HUY_TU_CHOI,
    };
  });
}

async function demTepDonThueTheoMucDich(donThueId, mucDichId) {
  const ketQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM tep_don_thue
    WHERE don_thue_id = ${donThueId}::uuid
      AND muc_dich_id = ${Number(mucDichId)}
  `;

  return Number(ketQua[0]?.total || 0);
}

async function daCoVatPhamBanGiao(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT 1
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    LIMIT 1
  `;

  return ketQua.length > 0;
}

// Lưu vật phẩm ngay khi bấm "Xuất biên bản bàn giao".
// Đây là bước khóa lựa chọn nhưng CHƯA chuyển đơn sang Đang thuê.
async function luuVatPhamBanGiaoDaChon({
  donThueId,
  nhanVienId,
  ghiChuBanGiao,
  vatPham,
}) {
  const ghiChuChung = String(ghiChuBanGiao || "").trim();

  if (!ghiChuChung) {
    throw new Error("Vui lòng nhập ghi chú bàn giao trước khi xuất biên bản");
  }

  return await prisma.$transaction(async (tx) => {
    const donRows = await tx.$queryRaw`
      SELECT id, trang_thai, ban_giao_luc
      FROM don_thue
      WHERE id = ${donThueId}::uuid
      FOR UPDATE
    `;

    const don = donRows[0];

    if (!don) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (
      Number(don.trang_thai) !== TRANG_THAI_DA_GIU_CHO ||
      don.ban_giao_luc
    ) {
      throw new Error("Đơn thuê không còn ở trạng thái Đã giữ chỗ");
    }

    const yeuCauHuyRows = await tx.$queryRaw`
      SELECT id
      FROM yeu_cau_huy_don
      WHERE don_thue_id = ${donThueId}::uuid
        AND trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY}
      LIMIT 1
    `;

    if (yeuCauHuyRows.length > 0) {
      throw new Error("Đơn đang có yêu cầu hủy Chờ xử lý, không thể bàn giao");
    }

    const daCoRows = await tx.$queryRaw`
      SELECT 1
      FROM ban_giao_vat_pham bgvp
      JOIN chi_tiet_don_thue ctdt
        ON ctdt.id = bgvp.chi_tiet_don_thue_id
      WHERE ctdt.don_thue_id = ${donThueId}::uuid
      LIMIT 1
    `;

    if (daCoRows.length > 0) {
      throw new Error("Biên bản bàn giao đã được xuất, không thể thay đổi vật phẩm");
    }

    // Khóa từng thiết bị vật lý để tránh hai nhân viên xuất biên bản cùng lúc.
    const thietBiDaKiemTra = new Set();

    for (const item of vatPham) {
      if (!item.thiet_bi_id) continue;

      const thietBiId = String(item.thiet_bi_id);

      if (thietBiDaKiemTra.has(thietBiId)) {
        throw new Error("Một thiết bị vật lý bị chọn trùng");
      }

      thietBiDaKiemTra.add(thietBiId);

      const thietBiRows = await tx.$queryRaw`
        SELECT id, so_serial, trang_thai
        FROM thiet_bi_vat_ly
        WHERE id = ${thietBiId}::uuid
          AND da_xoa_luc IS NULL
        FOR UPDATE
      `;

      const thietBi = thietBiRows[0];

      if (!thietBi || Number(thietBi.trang_thai) !== TRANG_THAI_THIET_BI_SAN_SANG) {
        throw new Error(
          `Thiết bị ${thietBi?.so_serial || thietBiId} không còn sẵn sàng`
        );
      }

      const daDuocGiuRows = await tx.$queryRaw`
        SELECT 1
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.thiet_bi_id = ${thietBiId}::uuid
          AND dt.id <> ${donThueId}::uuid
          AND dt.trang_thai IN (
            ${TRANG_THAI_DA_GIU_CHO},
            ${TRANG_THAI_DANG_THUE},
            ${TRANG_THAI_QUA_HAN}
          )
        LIMIT 1
      `;

      if (daDuocGiuRows.length > 0) {
        throw new Error(`Thiết bị serial ${thietBi.so_serial} đã được giữ cho đơn khác`);
      }
    }

    // Gom số lượng phụ kiện theo đúng vị trí kho đã chọn.
    const phanBoCanGiao = new Map();

    for (const item of vatPham) {
      if (!item.phu_kien_id) continue;

      if (!item.phu_kien_vi_tri_kho_id) {
        throw new Error("Vui lòng chọn vị trí kho cho phụ kiện");
      }

      const key = String(item.phu_kien_vi_tri_kho_id);
      const hienTai = phanBoCanGiao.get(key);

      if (hienTai && String(hienTai.phu_kien_id) !== String(item.phu_kien_id)) {
        throw new Error("Vị trí phụ kiện không khớp với phụ kiện bàn giao");
      }

      phanBoCanGiao.set(key, {
        phu_kien_id: item.phu_kien_id,
        so_luong_giao:
          Number(hienTai?.so_luong_giao || 0) + Number(item.so_luong_giao || 0),
      });
    }

    for (const [phanBoId, thongTin] of phanBoCanGiao.entries()) {
      const phanBoRows = await tx.$queryRaw`
        SELECT
          pkvt.id,
          pkvt.phu_kien_id,
          pkvt.so_luong::int AS so_luong,
          pkvt.dang_su_dung,
          vt.ten_vi_tri,
          vt.trang_thai,
          vt.da_xoa_luc
        FROM phu_kien_vi_tri_kho pkvt
        JOIN vi_tri_kho vt ON vt.id = pkvt.vi_tri_kho_id
        WHERE pkvt.id = ${phanBoId}::uuid
        FOR UPDATE OF pkvt
      `;

      const phanBo = phanBoRows[0];

      if (!phanBo || String(phanBo.phu_kien_id) !== String(thongTin.phu_kien_id)) {
        throw new Error("Vị trí kho không thuộc phụ kiện đang bàn giao");
      }

      if (
        !phanBo.dang_su_dung ||
        Number(phanBo.trang_thai) !== 601 ||
        phanBo.da_xoa_luc
      ) {
        throw new Error(`Vị trí "${phanBo.ten_vi_tri}" không còn khả dụng`);
      }

      const dangGiuRows = await tx.$queryRaw`
        SELECT COALESCE(SUM(bgvp.so_luong_giao), 0)::int AS so_luong_dang_giu
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_vi_tri_kho_id = ${phanBoId}::uuid
          AND dt.trang_thai IN (
            ${TRANG_THAI_DA_GIU_CHO},
            ${TRANG_THAI_DANG_THUE},
            ${TRANG_THAI_QUA_HAN}
          )
      `;

      const soLuongDangGiu = Number(dangGiuRows[0]?.so_luong_dang_giu || 0);
      const soLuongKhaDung = Math.max(
        Number(phanBo.so_luong || 0) - soLuongDangGiu,
        0
      );

      if (Number(thongTin.so_luong_giao || 0) > soLuongKhaDung) {
        throw new Error(
          `Vị trí "${phanBo.ten_vi_tri}" chỉ còn ${soLuongKhaDung} phụ kiện, không đủ để bàn giao`
        );
      }
    }

    // Ghi chú bàn giao chỉ lưu MỘT LẦN ở don_thue.ghi_chu_ban_giao.
    for (const item of vatPham) {
      await tx.$executeRaw`
        INSERT INTO ban_giao_vat_pham (
          id,
          chi_tiet_don_thue_id,
          bo_di_kem_id,
          thiet_bi_id,
          phu_kien_id,
          phu_kien_vi_tri_kho_id,
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
          ${item.phu_kien_vi_tri_kho_id}::uuid,
          ${item.ten_vat_pham_snapshot},
          ${item.ma_tai_san_snapshot},
          ${item.so_serial_snapshot},
          ${item.so_luong_giao},
          NULL,
          NOW()
        )
      `;
    }

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        nguoi_ban_giao_id = ${nhanVienId}::uuid,
        ghi_chu_ban_giao = ${ghiChuChung},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    return {
      don_thue_id: donThueId,
      so_vat_pham: vatPham.length,
    };
  });
}

async function xacNhanPhieuBanGiaoDaChot({
  donThueId,
  nhanVienId,
  tepHopDong,
  tepAnhBanGiao,
  tepAnhBienBan = [],
}) {
  await prisma.$transaction(async (tx) => {
    const donRows = await tx.$queryRaw`
      SELECT
        id,
        trang_thai,
        ban_giao_luc,
        nguoi_ban_giao_id,
        tong_tien_thue::text AS tong_tien_thue
      FROM don_thue
      WHERE id = ${donThueId}::uuid
      FOR UPDATE
    `;

    const don = donRows[0];

    if (!don) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (
      Number(don.trang_thai) !== TRANG_THAI_DA_GIU_CHO ||
      don.ban_giao_luc
    ) {
      throw new Error("Đơn thuê không còn ở trạng thái Đã giữ chỗ");
    }

    const yeuCauHuyRows = await tx.$queryRaw`
      SELECT id
      FROM yeu_cau_huy_don
      WHERE don_thue_id = ${donThueId}::uuid
        AND trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY}
      LIMIT 1
    `;

    if (yeuCauHuyRows.length > 0) {
      throw new Error("Đơn đang có yêu cầu hủy Chờ xử lý, không thể bàn giao");
    }

    const vatPhamRows = await tx.$queryRaw`
      SELECT
        bgvp.id,
        bgvp.thiet_bi_id
      FROM ban_giao_vat_pham bgvp
      JOIN chi_tiet_don_thue ctdt
        ON ctdt.id = bgvp.chi_tiet_don_thue_id
      WHERE ctdt.don_thue_id = ${donThueId}::uuid
      FOR UPDATE OF bgvp
    `;

    if (vatPhamRows.length === 0) {
      throw new Error("Vui lòng xuất biên bản bàn giao trước khi xác nhận bàn giao");
    }

    const anhBienBanRows = await tx.$queryRaw`
      SELECT COUNT(*)::int AS total
      FROM tep_don_thue
      WHERE don_thue_id = ${donThueId}::uuid
        AND muc_dich_id = ${MUC_DICH_ANH_BIEN_BAN_BAN_GIAO}
    `;

    const soAnhBienBanDaCo = Number(anhBienBanRows[0]?.total || 0);

    if (soAnhBienBanDaCo + tepAnhBienBan.length === 0) {
      throw new Error(
        "Vui lòng chọn ít nhất 1 ảnh biên bản bàn giao đã ký trước khi xác nhận bàn giao"
      );
    }

    if (soAnhBienBanDaCo + tepAnhBienBan.length > 5) {
      throw new Error("Tổng số ảnh biên bản bàn giao không được vượt quá 5");
    }

    // Ảnh biên bản 2604 được lưu cùng lần xác nhận, không cần API Upload riêng.
    for (const file of tepAnhBienBan) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          id,
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          cloudinary_public_id,
          cloudinary_resource_type,
          cloudinary_delivery_type,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${donThueId}::uuid,
          ${MUC_DICH_ANH_BIEN_BAN_BAN_GIAO},
          ${file.ten_file_goc},
          ${file.file_url},
          ${file.cloudinary_public_id},
          ${file.cloudinary_resource_type},
          ${file.cloudinary_delivery_type},
          ${file.loai_file},
          ${file.kich_thuoc_file},
          ${nhanVienId}::uuid,
          NOW(),
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
          cloudinary_public_id,
          cloudinary_resource_type,
          cloudinary_delivery_type,
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
          ${file.cloudinary_public_id},
          ${file.cloudinary_resource_type},
          ${file.cloudinary_delivery_type},
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
          cloudinary_public_id,
          cloudinary_resource_type,
          cloudinary_delivery_type,
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
          ${file.cloudinary_public_id},
          ${file.cloudinary_resource_type},
          ${file.cloudinary_delivery_type},
          ${file.loai_file},
          ${file.kich_thuoc_file},
          ${nhanVienId}::uuid,
          NOW(),
          NOW()
        )
      `;
    }

    const thietBiIds = [
      ...new Set(
        vatPhamRows
          .filter((item) => item.thiet_bi_id)
          .map((item) => String(item.thiet_bi_id))
      ),
    ];

    for (const thietBiId of thietBiIds) {
      const thietBiRows = await tx.$queryRaw`
        SELECT id, so_serial, trang_thai
        FROM thiet_bi_vat_ly
        WHERE id = ${thietBiId}::uuid
        FOR UPDATE
      `;

      const thietBi = thietBiRows[0];

      if (!thietBi || Number(thietBi.trang_thai) !== TRANG_THAI_THIET_BI_SAN_SANG) {
        throw new Error(
          `Thiết bị ${thietBi?.so_serial || thietBiId} không còn sẵn sàng để xác nhận bàn giao`
        );
      }

      await tx.$executeRaw`
        UPDATE thiet_bi_vat_ly
        SET
          trang_thai = ${TRANG_THAI_THIET_BI_DANG_THUE},
          updated_at = NOW()
        WHERE id = ${thietBiId}::uuid
      `;
    }

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        trang_thai = ${TRANG_THAI_DANG_THUE},
        ban_giao_luc = NOW(),
        nguoi_ban_giao_id = COALESCE(nguoi_ban_giao_id, ${nhanVienId}::uuid),
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

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
        ${Number(don.tong_tien_thue || 0)},
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
  TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY,
  TRANG_THAI_THIET_BI_SAN_SANG,

  demDonThue,
  layDanhSachDonThue,
  layDanhSachYeuCauHuy,
  layDonThueTheoId,
  layNguoiDungNoiBoTheoId,
  layChiTietDonThue,
  layVatPhamBanGiao,
  layThanhToanCuaDon,
  layTepDonThue,
  layThietBiSanSang,

  layDonDeBanGiao,
  coYeuCauHuyChoXuLy,
  kiemTraDonDaCoc,
  layChiTietDonDeBanGiao,
  layBoDiKemTheoMauIds,
  layThietBiVatLyTheoId,
  layPhuKienTheoId,
  layPhuKienViTriKhoTheoId,
  demSoLuongPhuKienDangGiao,
  demTepDonThueTheoMucDich,
  daCoVatPhamBanGiao,
  luuVatPhamBanGiaoDaChon,
  xacNhanYeuCauHuyDon,
  tuChoiYeuCauHuyDon,
  xacNhanPhieuBanGiaoDaChot,
};
