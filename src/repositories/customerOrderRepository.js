const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const TRANG_THAI_DA_HUY = 1101;
const TRANG_THAI_DA_GIU_CHO = 1102;
const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_HOAN_THANH = 1104;
const TRANG_THAI_QUA_HAN = 1105;

const MUC_DICH_HOP_DONG_GIAY = 2601;
const MUC_DICH_ANH_BAN_GIAO = 2602;
const MUC_DICH_ANH_KHI_TRA = 2603;

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
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = dt.trang_thai
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
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
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
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = dt.trang_thai
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
      tdt.file_url,
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

async function capNhatHuyDon(donThueId, nguoiDungId, lyDoHuy) {
  const rows = await prisma.$queryRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_DA_HUY},
      huy_luc = NOW(),
      ly_do_huy = ${lyDoHuy},
      updated_at = NOW()
    WHERE id = ${donThueId}::uuid
      AND khach_hang_id = ${nguoiDungId}::uuid
    RETURNING
      id,
      ma_don,
      trang_thai,
      huy_luc,
      ly_do_huy,
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
  MUC_DICH_HOP_DONG_GIAY,
  MUC_DICH_ANH_BAN_GIAO,
  MUC_DICH_ANH_KHI_TRA,
  capNhatDonQuaHanCuaKhach,
  layDanhSachDonCuaKhach,
  layDonThuocKhachHang,
  layChiTietDonThue,
  layThanhToanCuaDon,
  layTepDonThueTheoMucDich,
  capNhatHuyDon,
};
