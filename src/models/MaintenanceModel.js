class MaintenanceModel {
  constructor({
    id,
    ma_phieu_bao_tri,
    thiet_bi_id,
    don_thue_id,

    ly_do,
    ket_qua,

    nguoi_tao_id,
    ten_nguoi_tao,

    trang_thai_bao_tri,
    ten_trang_thai_bao_tri,

    bat_dau_luc,
    hoan_thanh_luc,

    so_serial,
    ten_mau,
    ma_don,
  } = {}) {
    this.id = id;
    this.ma_phieu_bao_tri = ma_phieu_bao_tri || "";
    this.thiet_bi_id = thiet_bi_id || null;
    this.don_thue_id = don_thue_id || null;

    this.ly_do = ly_do || "";
    this.ket_qua = ket_qua || "";

    this.nguoi_tao_id = nguoi_tao_id || null;
    this.ten_nguoi_tao = ten_nguoi_tao || "";

    this.trang_thai_bao_tri = hoan_thanh_luc
      ? 1302
      : Number(trang_thai_bao_tri || 1301);
    this.ten_trang_thai_bao_tri =
      this.trang_thai_bao_tri === 1302
        ? "Hoàn thành"
        : ten_trang_thai_bao_tri || "Đang bảo trì";

    this.bat_dau_luc = bat_dau_luc || null;
    this.hoan_thanh_luc = hoan_thanh_luc || null;

    this.so_serial = so_serial || "";
    this.ten_mau = ten_mau || "";
    this.ma_don = ma_don || "";
  }
}

module.exports = MaintenanceModel;
