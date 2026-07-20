class EquipmentCategoryModel {
  constructor({
    id,
    ten_danh_muc,
    tinh_chat_id,
    ten_tinh_chat,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_danh_muc = ten_danh_muc;
    this.tinh_chat_id = tinh_chat_id;
    this.ten_tinh_chat = ten_tinh_chat || null;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = EquipmentCategoryModel;