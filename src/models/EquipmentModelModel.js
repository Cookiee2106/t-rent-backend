class EquipmentModelModel {
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
    trang_thai,
    ten_trang_thai,
    tong_thiet_bi_vat_ly,
    so_luong_san_sang,
    bo_di_kem,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.danh_muc_id = danh_muc_id;
    this.ten_danh_muc = ten_danh_muc || null;
    this.tinh_chat_id = tinh_chat_id || null;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;

    this.ten_mau = ten_mau;
    this.mo_ta = mo_ta || null;
    this.anh_url = anh_url || null;

    this.gia_thue_ngay = Number(gia_thue_ngay || 0);
    this.tien_coc = Number(tien_coc || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.tong_thiet_bi_vat_ly = Number(tong_thiet_bi_vat_ly || 0);
    this.so_luong_san_sang = Number(so_luong_san_sang || 0);

    this.bo_di_kem = bo_di_kem || [];
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }
}

module.exports = EquipmentModelModel;
