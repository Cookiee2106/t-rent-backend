class AssetModel {
  constructor({
    id,
    mau_thiet_bi_id,

    ma_tai_san,
    so_serial,

    vi_tri_kho_id,
    ten_vi_tri,
    suc_chua_toi_da,

    trang_thai,
    ten_trang_thai,

    hang_id,
    ten_hang,
    ten_mau,
    ten_danh_muc,

    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.mau_thiet_bi_id = mau_thiet_bi_id;

    this.ma_tai_san = ma_tai_san || null;
    this.so_serial = so_serial || null;

    this.vi_tri_kho_id = vi_tri_kho_id || null;
    this.ten_vi_tri = ten_vi_tri || null;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;
    this.ten_mau = ten_mau || null;
    this.ten_danh_muc = ten_danh_muc || null;

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = AssetModel;
