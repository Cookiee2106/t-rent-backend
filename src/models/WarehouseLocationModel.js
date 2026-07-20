class WarehouseLocationModel {
  constructor({
    id,
    ten_vi_tri,
    suc_chua_toi_da,
    so_luong_dang_chua,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_vi_tri = ten_vi_tri;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);
    this.so_luong_dang_chua = Number(so_luong_dang_chua || 0);
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = WarehouseLocationModel;