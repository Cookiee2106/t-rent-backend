class PaymentSessionModel {
  constructor({
    id,
    khach_hang_id,

    trang_thai,
    ten_trang_thai,

    tong_tien_coc,
    tong_tien_thue,

    ma_tham_chieu,
    checkout_url,

    het_han_luc,
    da_thanh_toan_luc,
    that_bai_luc,

    don_thue_id,
    ma_don,

    chi_tiet = [],
  } = {}) {
    this.id = id;
    this.khach_hang_id = khach_hang_id || null;

    this.trang_thai = Number(trang_thai || 0);
    this.ten_trang_thai = ten_trang_thai || null;

    this.tong_tien_coc = Number(tong_tien_coc || 0);
    this.tong_tien_thue = Number(tong_tien_thue || 0);

    this.ma_tham_chieu = ma_tham_chieu || "";
    this.checkout_url = checkout_url || "";

    this.het_han_luc = het_han_luc || null;
    this.da_thanh_toan_luc = da_thanh_toan_luc || null;
    this.that_bai_luc = that_bai_luc || null;

    this.don_thue_id = don_thue_id || null;
    this.ma_don = ma_don || null;

    this.chi_tiet = chi_tiet.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,

      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",

      so_luong: Number(item.so_luong || 0),

      ngay_nhan: item.ngay_nhan || null,
      ngay_tra: item.ngay_tra || null,

      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),

      tien_thue: Number(item.tien_thue || 0),
      tien_coc: Number(item.tien_coc || 0),
    }));
  }
}

module.exports = PaymentSessionModel;