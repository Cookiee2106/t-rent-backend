class AdminOrderModel {
  constructor({
    id,
    ma_don,
    khach_hang_id,
    ten_khach_hang,
    email_khach_hang,
    sdt_khach_hang,

    ngay_nhan,
    ngay_tra,
    so_ngay_thue,

    tong_tien_thue,
    tong_tien_coc,
    tien_coc_da_thanh_toan,
    tien_thue_da_thanh_toan,

    trang_thai,
    ten_trang_thai,

    huy_luc,
    ly_do_huy,

    ban_giao_luc,
    nguoi_ban_giao_id,
    ten_nguoi_ban_giao,
    ghi_chu_ban_giao,

    tra_luc,
    nguoi_nhan_tra_id,
    ten_nguoi_nhan_tra,
    ghi_chu_thanh_ly,

    phi_phat_sinh_tien,

    anh_url_mau_thiet_bi,
    ten_nguoi_thanh_toan,

    created_at,
    updated_at,

    chi_tiet = [],
    vat_pham_ban_giao = [],
    thanh_toan = [],
    tep_don_thue = [],
  } = {}) {
    this.id = id;
    this.ma_don = ma_don || "";
    this.khach_hang_id = khach_hang_id || null;

    this.ten_khach_hang = ten_khach_hang || "";
    this.email_khach_hang = email_khach_hang || "";
    this.sdt_khach_hang = sdt_khach_hang || "";

    this.ngay_nhan = ngay_nhan || null;
    this.ngay_tra = ngay_tra || null;
    this.so_ngay_thue = Number(so_ngay_thue || 0);

    this.tong_tien_thue = Number(tong_tien_thue || 0);
    this.tong_tien_coc = Number(tong_tien_coc || 0);
    this.tien_coc_da_thanh_toan = Number(tien_coc_da_thanh_toan || 0);
    this.tien_thue_da_thanh_toan = Number(tien_thue_da_thanh_toan || 0);

    this.trang_thai = Number(trang_thai || 0);
    this.ten_trang_thai = ten_trang_thai || null;

    this.huy_luc = huy_luc || null;
    this.ly_do_huy = ly_do_huy || null;

    this.ban_giao_luc = ban_giao_luc || null;
    this.nguoi_ban_giao_id = nguoi_ban_giao_id || null;
    this.ten_nguoi_ban_giao = ten_nguoi_ban_giao || null;
    this.ghi_chu_ban_giao = ghi_chu_ban_giao || null;

    this.tra_luc = tra_luc || null;
    this.nguoi_nhan_tra_id = nguoi_nhan_tra_id || null;
    this.ten_nguoi_nhan_tra = ten_nguoi_nhan_tra || null;
    this.ghi_chu_thanh_ly = ghi_chu_thanh_ly || null;

    this.phi_phat_sinh_tien = Number(phi_phat_sinh_tien || 0);

    this.anh_url_mau_thiet_bi = anh_url_mau_thiet_bi || null;
    this.ten_nguoi_thanh_toan = ten_nguoi_thanh_toan || null;

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;

    this.chi_tiet = chi_tiet.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,
      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      ten_danh_muc: item.ten_danh_muc || "",
      anh_url: item.anh_url || "",
      so_luong: Number(item.so_luong || 0),
      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),
      tien_thue: Number(item.tien_thue || 0),
      tien_coc: Number(item.tien_coc || 0),
    }));

    this.vat_pham_ban_giao = vat_pham_ban_giao.map((item) => ({
      id: item.id,
      chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
      bo_di_kem_id: item.bo_di_kem_id || null,
      thiet_bi_id: item.thiet_bi_id || null,
      phu_kien_id: item.phu_kien_id || null,
      ten_phu_kien: item.ten_phu_kien || "",
      ten_vat_pham_snapshot: item.ten_vat_pham_snapshot || "",
      so_serial: item.so_serial || "",
      so_serial_snapshot: item.so_serial_snapshot || "",
      ten_vi_tri_kho: item.ten_vi_tri_kho || "",
      so_luong_giao: Number(item.so_luong_giao || 0),
      ghi_chu_ban_giao: item.ghi_chu_ban_giao || null,
      created_at: item.created_at || null,
    }));

    this.thanh_toan = thanh_toan.map((item) => ({
      id: item.id,
      so_tien: Number(item.so_tien || 0),
      loai_dong_tien_id: item.loai_dong_tien_id || null,
      ten_loai_dong_tien: item.ten_loai_dong_tien || "",
      ten_nguoi_thanh_toan: item.ten_nguoi_thanh_toan || "",
      ma_giao_dich: item.ma_giao_dich || "",
      ghi_chu: item.ghi_chu || "",
      created_at: item.created_at || null,
    }));

    this.tep_don_thue = tep_don_thue.map((item) => ({
      id: item.id,
      muc_dich_id: item.muc_dich_id || null,
      ten_muc_dich: item.ten_muc_dich || "",
      ten_file_goc: item.ten_file_goc || "",
      file_url: item.file_url || "",
      loai_file: item.loai_file || "",
      kich_thuoc_file: item.kich_thuoc_file
        ? Number(item.kich_thuoc_file)
        : null,
      ten_nguoi_upload: item.ten_nguoi_upload || "",
      uploaded_at: item.uploaded_at || null,
    }));
  }
}

module.exports = AdminOrderModel;
