const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const TRANG_THAI_DA_HUY = 1101;
const TRANG_THAI_DA_GIU_CHO = 1102;
const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_HOAN_THANH = 1104;
const TRANG_THAI_QUA_HAN = 1105;

const TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY = 1701;
const TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN = 1702;
const TRANG_THAI_YEU_CAU_HUY_TU_CHOI = 1703;

const MUC_DICH_HOP_DONG_GIAY = 2601;
const MUC_DICH_ANH_BAN_GIAO = 2602;
const MUC_DICH_ANH_KHI_TRA = 2603;
const MUC_DICH_ANH_BIEN_BAN_BAN_GIAO = 2604;

async function capNhatDonQuaHanCuaKhach(nguoiDungId) {
  await prisma.$executeRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_QUA_HAN},
      updated_at = NOW()
    WHERE khach_hang_id = ${nguoiDungId}::uuid
      AND trang_thai = ${TRANG_THAI_DANG_THUE}
      AND ngay_tra < NOW()
      AND tra_luc IS NULL
  `;
}

async function layDanhSachDonCuaKhach(nguoiDungId) {
  return await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,

      ychd.id AS yeu_cau_huy_id,
      ychd.ly_do_huy AS ly_do_yeu_cau_huy,
      ychd.trang_thai_id AS trang_thai_yeu_cau_huy_id,
      ttychd.ten_trang_thai AS ten_trang_thai_yeu_cau_huy,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_yeu_cau,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_yeu_cau,
      ychd.phi_huy::text AS phi_huy_yeu_cau,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai_yeu_cau,
      ychd.gui_luc AS gui_luc_yeu_cau,

      dt.ban_giao_luc,
      dt.tra_luc,
      EXISTS (
        SELECT 1
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        WHERE ctdt.don_thue_id = dt.id
      ) AS da_xuat_bien_ban,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = dt.trang_thai
    LEFT JOIN yeu_cau_huy_don ychd
      ON ychd.don_thue_id = dt.id
    LEFT JOIN trang_thai_he_thong ttychd
      ON ttychd.id = ychd.trang_thai_id
    WHERE dt.khach_hang_id = ${nguoiDungId}::uuid
    ORDER BY dt.created_at DESC
  `;
}

async function layDonThuocKhachHang(donThueId, nguoiDungId) {
  const rows = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      dt.phien_thanh_toan_id,

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
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,

      ychd.id AS yeu_cau_huy_id,
      ychd.ly_do_huy AS ly_do_yeu_cau_huy,
      ychd.trang_thai_id AS trang_thai_yeu_cau_huy_id,
      ttychd.ten_trang_thai AS ten_trang_thai_yeu_cau_huy,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_yeu_cau,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_yeu_cau,
      ychd.phi_huy::text AS phi_huy_yeu_cau,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai_yeu_cau,
      ychd.gui_luc AS gui_luc_yeu_cau,

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
    JOIN nguoi_dung nd
      ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = dt.trang_thai
    LEFT JOIN yeu_cau_huy_don ychd
      ON ychd.don_thue_id = dt.id
    LEFT JOIN trang_thai_he_thong ttychd
      ON ttychd.id = ychd.trang_thai_id
    LEFT JOIN nguoi_dung nv_bg
      ON nv_bg.id = dt.nguoi_ban_giao_id
    LEFT JOIN nguoi_dung nv_tra
      ON nv_tra.id = dt.nguoi_nhan_tra_id
    WHERE dt.id = ${donThueId}::uuid
      AND dt.khach_hang_id = ${nguoiDungId}::uuid
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
      dmtb.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.gia_tri_thiet_bi_snapshot::text AS gia_tri_thiet_bi_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc,
      ctdt.created_at,
      ctdt.updated_at
    FROM chi_tiet_don_thue ctdt
    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id
    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    ORDER BY ctdt.created_at ASC
  `;
}

async function layThanhToanCuaDon(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dm.ma_danh_muc AS ma_loai_dong_tien,
      dm.ten_danh_muc AS ten_loai_dong_tien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at
    FROM thanh_toan tt
    LEFT JOIN danh_muc_he_thong dm
      ON dm.id = tt.loai_dong_tien_id
    WHERE tt.don_thue_id = ${donThueId}::uuid
    ORDER BY tt.created_at ASC
  `;
}

async function layTepDonThueTheoMucDich(donThueId, danhSachMucDichId) {
  if (!danhSachMucDichId || danhSachMucDichId.length === 0) {
    return [];
  }

  return await prisma.$queryRaw`
    SELECT
      tdt.id,
      tdt.muc_dich_id,
      dm.ma_danh_muc AS ma_muc_dich,
      dm.ten_danh_muc AS ten_muc_dich,
      tdt.ten_file_goc,
      tdt.loai_file,
      tdt.kich_thuoc_file::text AS kich_thuoc_file,
      tdt.uploaded_at,
      nd.ho_ten AS nguoi_upload
    FROM tep_don_thue tdt
    LEFT JOIN danh_muc_he_thong dm
      ON dm.id = tdt.muc_dich_id
    LEFT JOIN nguoi_dung nd
      ON nd.id = tdt.uploaded_by
    WHERE tdt.don_thue_id = ${donThueId}::uuid
      AND tdt.muc_dich_id IN (${Prisma.join(danhSachMucDichId)})
    ORDER BY tdt.muc_dich_id ASC, tdt.uploaded_at ASC
  `;
}

async function daCoVatPhamBanGiao(donThueId) {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    LIMIT 1
  `;

  return rows.length > 0;
}

async function layYeuCauHuyDonTheoDon(donThueId) {
  const rows = await prisma.$queryRaw`
    SELECT
      ychd.id,
      ychd.don_thue_id,
      ychd.ly_do_huy,
      ychd.trang_thai_id,
      tt.ten_trang_thai,
      ychd.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
      ychd.tong_tien_coc_snapshot::text AS tong_tien_coc_snapshot,
      ychd.phi_huy::text AS phi_huy,
      ychd.tien_coc_hoan_lai::text AS tien_coc_hoan_lai,
      ychd.gui_luc,
      ychd.xu_ly_luc,
      ychd.ghi_chu_xu_ly,
      ychd.created_at,
      ychd.updated_at
    FROM yeu_cau_huy_don ychd
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = ychd.trang_thai_id
    WHERE ychd.don_thue_id = ${donThueId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function guiYeuCauHuyDon({
  donThueId,
  lyDoHuy,
  tyLePhiHuySnapshot,
  tongTienCocSnapshot,
  phiHuy,
  tienCocHoanLai,
}) {
  const rows = await prisma.$queryRaw`
    INSERT INTO yeu_cau_huy_don (
      don_thue_id,
      ly_do_huy,
      trang_thai_id,
      ty_le_phi_huy_snapshot,
      tong_tien_coc_snapshot,
      phi_huy,
      tien_coc_hoan_lai,
      gui_luc,
      created_at,
      updated_at
    )
    VALUES (
      ${donThueId}::uuid,
      ${lyDoHuy},
      ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY},
      ${tyLePhiHuySnapshot},
      ${tongTienCocSnapshot},
      ${phiHuy},
      ${tienCocHoanLai},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (don_thue_id)
    DO UPDATE SET
      ly_do_huy = EXCLUDED.ly_do_huy,
      trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY},
      ty_le_phi_huy_snapshot = EXCLUDED.ty_le_phi_huy_snapshot,
      tong_tien_coc_snapshot = EXCLUDED.tong_tien_coc_snapshot,
      phi_huy = EXCLUDED.phi_huy,
      tien_coc_hoan_lai = EXCLUDED.tien_coc_hoan_lai,
      gui_luc = NOW(),
      nguoi_xu_ly_id = NULL,
      xu_ly_luc = NULL,
      ghi_chu_xu_ly = NULL,
      updated_at = NOW()
    WHERE yeu_cau_huy_don.trang_thai_id = ${TRANG_THAI_YEU_CAU_HUY_TU_CHOI}
    RETURNING
      id,
      don_thue_id,
      ly_do_huy,
      trang_thai_id,
      ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
      tong_tien_coc_snapshot::text AS tong_tien_coc_snapshot,
      phi_huy::text AS phi_huy,
      tien_coc_hoan_lai::text AS tien_coc_hoan_lai,
      gui_luc,
      updated_at
  `;

  return rows[0] || null;
}

module.exports = {
  TRANG_THAI_DA_HUY,
  TRANG_THAI_DA_GIU_CHO,
  TRANG_THAI_DANG_THUE,
  TRANG_THAI_HOAN_THANH,
  TRANG_THAI_QUA_HAN,
  TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY,
  TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN,
  TRANG_THAI_YEU_CAU_HUY_TU_CHOI,
  MUC_DICH_HOP_DONG_GIAY,
  MUC_DICH_ANH_BAN_GIAO,
  MUC_DICH_ANH_KHI_TRA,
  MUC_DICH_ANH_BIEN_BAN_BAN_GIAO,
  capNhatDonQuaHanCuaKhach,
  layDanhSachDonCuaKhach,
  layDonThuocKhachHang,
  layChiTietDonThue,
  layThanhToanCuaDon,
  layTepDonThueTheoMucDich,
  daCoVatPhamBanGiao,
  layYeuCauHuyDonTheoDon,
  guiYeuCauHuyDon,
};
