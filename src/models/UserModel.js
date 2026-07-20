class UserModel {
  constructor({
    id,
    ho_ten,
    email,
    so_dien_thoai,
    vai_tro,
    trang_thai,
    dia_chi,
    trang_thai_xac_minh,
    ten_trang_thai_tai_khoan,
    ten_trang_thai_xac_minh,
  } = {}) {
    this.id = id;
    this.ho_ten = ho_ten;
    this.email = email;
    this.so_dien_thoai = so_dien_thoai;
    this.vai_tro = vai_tro;
    this.trang_thai = trang_thai;
    this.dia_chi = dia_chi ?? null;
    this.trang_thai_xac_minh = trang_thai_xac_minh ?? null;
    this.ten_trang_thai_tai_khoan = ten_trang_thai_tai_khoan ?? null;
    this.ten_trang_thai_xac_minh = ten_trang_thai_xac_minh ?? null;
  }
}

module.exports = UserModel;