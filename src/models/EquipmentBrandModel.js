class EquipmentBrandModel {
  constructor({
    id,
    ten_hang,
    trang_thai,
    ten_trang_thai,
    so_mau_thiet_bi,
    so_phu_kien,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_hang = ten_hang;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.so_mau_thiet_bi = Number(so_mau_thiet_bi || 0);
    this.so_phu_kien = Number(so_phu_kien || 0);
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = EquipmentBrandModel;