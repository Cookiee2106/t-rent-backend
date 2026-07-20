class AdminCustomerModel {
  constructor({
    id,
    khach_hang_id,
    ho_ten,
    email,
    so_dien_thoai,
    dia_chi,

    trang_thai,
    ten_trang_thai_tai_khoan,

    trang_thai_xac_minh,
    ten_trang_thai_xac_minh,

    ho_so_xac_minh_id,
    so_cccd,
    anh_mat_truoc_url,
    anh_mat_sau_url,
    anh_cam_cccd_url,

    trang_thai_ho_so,
    ten_trang_thai_ho_so,

    ly_do_tu_choi,
    nguoi_duyet_id,
    duyet_luc,
    ngay_gui,
    created_at,
  } = {}) {
    this.id = id;
    this.khach_hang_id = khach_hang_id ?? id;

    this.ho_ten = ho_ten;
    this.email = email;
    this.so_dien_thoai = so_dien_thoai;
    this.dia_chi = dia_chi ?? null;

    this.trang_thai = trang_thai;
    this.ten_trang_thai_tai_khoan = ten_trang_thai_tai_khoan ?? null;

    this.trang_thai_xac_minh = trang_thai_xac_minh ?? null;
    this.ten_trang_thai_xac_minh = ten_trang_thai_xac_minh ?? null;

    this.ho_so_xac_minh_id = ho_so_xac_minh_id ?? null;
    this.so_cccd = so_cccd ?? null;
    this.anh_mat_truoc_url = anh_mat_truoc_url ?? null;
    this.anh_mat_sau_url = anh_mat_sau_url ?? null;
    this.anh_cam_cccd_url = anh_cam_cccd_url ?? null;

    this.trang_thai_ho_so = trang_thai_ho_so ?? null;
    this.ten_trang_thai_ho_so = ten_trang_thai_ho_so ?? null;

    this.ly_do_tu_choi = ly_do_tu_choi ?? null;
    this.nguoi_duyet_id = nguoi_duyet_id ?? null;
    this.duyet_luc = duyet_luc ?? null;
    this.ngay_gui = ngay_gui ?? null;
    this.created_at = created_at ?? null;
  }
}

module.exports = AdminCustomerModel;