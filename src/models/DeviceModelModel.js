class DeviceModelModel {
  constructor({
    id,
    danh_muc_id,
    ten_danh_muc,
    tinh_chat_id,
    hang_id,
    ten_hang,
    ten_mau,
    mo_ta,
    anh_url,
    gia_thue_ngay,
    tien_coc,
    so_luong_san_sang,
    bo_di_kem,
    co_the_thue,
    ly_do_khong_the_thue,
    chi_tiet_kha_dung,
    san_pham_tuong_tu,
  } = {}) {
    this.id = id;
    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;
    this.tinh_chat_id = tinh_chat_id || null;
    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;
    this.ten_mau = ten_mau;
    this.mo_ta = mo_ta || "";
    this.anh_url = anh_url || null;
    this.gia_thue_ngay = gia_thue_ngay || "0";
    this.tien_coc = tien_coc || "0";
    this.so_luong_san_sang =
      so_luong_san_sang === undefined ? null : Number(so_luong_san_sang || 0);
    this.bo_di_kem = bo_di_kem || [];
    this.co_the_thue = co_the_thue ?? null;
    this.ly_do_khong_the_thue = ly_do_khong_the_thue || "";
    this.chi_tiet_kha_dung = chi_tiet_kha_dung || [];
    this.san_pham_tuong_tu = san_pham_tuong_tu || [];
  }
}

module.exports = DeviceModelModel;
