class AccessoryModel {
  constructor({
    id,
    ten_phu_kien,

    hang_id,
    ten_hang,

    danh_muc_id,
    ten_danh_muc,

    vi_tri_kho_id,
    ten_vi_tri,
    suc_chua_toi_da,

    tong_so_luong,
    so_luong_dang_su_dung,

    mo_ta,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_phu_kien = ten_phu_kien;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;

    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;

    this.vi_tri_kho_id = vi_tri_kho_id || null;
    this.ten_vi_tri = ten_vi_tri || null;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);

    this.tong_so_luong = Number(tong_so_luong || 0);
    this.so_luong_dang_su_dung = Number(so_luong_dang_su_dung || 0);
    this.so_luong_kha_dung = this.tong_so_luong - this.so_luong_dang_su_dung;

    this.mo_ta = mo_ta || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = AccessoryModel;
