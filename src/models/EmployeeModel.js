class EmployeeModel {
  constructor({
    id,
    ho_ten,
    email,
    so_dien_thoai,
    dia_chi,
    vai_tro,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ho_ten = ho_ten;
    this.email = email;
    this.so_dien_thoai = so_dien_thoai ?? null;
    this.dia_chi = dia_chi ?? null;
    this.vai_tro = vai_tro;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai ?? null;
    this.created_at = created_at ?? null;
    this.updated_at = updated_at ?? null;
  }
}

module.exports = EmployeeModel;