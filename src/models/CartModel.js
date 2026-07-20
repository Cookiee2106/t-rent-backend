class CartModel {
  constructor({
    gio_hang_id,
    items = [],
  } = {}) {
    this.gio_hang_id = gio_hang_id || null;

    this.items = items.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,

      so_luong: Number(item.so_luong || 0),

      ngay_nhan: item.ngay_nhan || null,
      ngay_tra: item.ngay_tra || null,

      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),

      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      anh_url: item.anh_url || "",
      ten_danh_muc: item.ten_danh_muc || "",
    }));
  }
}

module.exports = CartModel;