class BundleItemModel {
  constructor({
    id,
    so_luong,
    created_at,

    mau_thiet_bi_phu_id,
    ten_hang_thiet_bi_phu,
    ten_mau_thiet_bi_phu,
    ten_danh_muc_thiet_bi_phu,

    phu_kien_id,
    ten_phu_kien,
    trang_thai_phu_kien,
    tong_so_luong,
    loai_bo_di_kem,
  } = {}) {
    this.id = id;
    this.so_luong = Number(so_luong || 0);
    this.created_at = created_at || null;

    this.mau_thiet_bi_phu_id = mau_thiet_bi_phu_id || null;
    this.ten_hang_thiet_bi_phu = ten_hang_thiet_bi_phu || null;
    this.ten_mau_thiet_bi_phu = ten_mau_thiet_bi_phu || null;
    this.ten_danh_muc_thiet_bi_phu = ten_danh_muc_thiet_bi_phu || null;

    this.phu_kien_id = phu_kien_id || null;
    this.ten_phu_kien = ten_phu_kien || null;
    this.trang_thai_phu_kien =
      trang_thai_phu_kien === null || trang_thai_phu_kien === undefined
        ? null
        : Number(trang_thai_phu_kien);
    this.phu_kien_dang_hien =
      this.phu_kien_id === null || this.trang_thai_phu_kien === 601;
    this.tong_so_luong =
      tong_so_luong === null || tong_so_luong === undefined
        ? null
        : Number(tong_so_luong);

    this.loai_bo_di_kem =
      loai_bo_di_kem ||
      (this.mau_thiet_bi_phu_id ? "thiet_bi_phu" : "phu_kien");
  }
}

module.exports = BundleItemModel;
