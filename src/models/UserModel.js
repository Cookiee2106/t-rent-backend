const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
  timNguoiDungTheoEmail,
  timNguoiDungTheoSoDienThoai,
  taoKhachHang,
  layNguoiDungTheoId,
} = require("../repositories/userRepository");

const JWT_SECRET = process.env.JWT_SECRET || "123456";

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function kiemTraEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function kiemTraSoDienThoai(soDienThoai) {
  return /^0[0-9]{9}$/.test(soDienThoai);
}

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

  // Đăng ký tài khoản khách hàng.
  static async dangKy(duLieu = {}) {
    const hoTen = chuanHoaChuoi(duLieu.ho_ten);
    const email = chuanHoaChuoi(duLieu.email).toLowerCase();
    const soDienThoai = chuanHoaChuoi(duLieu.so_dien_thoai);
    const matKhau = chuanHoaChuoi(duLieu.mat_khau);
    const xacNhanMatKhau = chuanHoaChuoi(duLieu.xac_nhan_mat_khau);

    if (!hoTen || !email || !soDienThoai || !matKhau || !xacNhanMatKhau) {
      throw new Error("Vui lòng nhập đầy đủ thông tin");
    }

    if (!kiemTraEmail(email)) {
      throw new Error("Email không hợp lệ");
    }

    if (!kiemTraSoDienThoai(soDienThoai)) {
      throw new Error("Số điện thoại không hợp lệ");
    }

    if (matKhau.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    if (matKhau !== xacNhanMatKhau) {
      throw new Error("Xác nhận mật khẩu không khớp");
    }

    const emailTonTai = await timNguoiDungTheoEmail(email);

    if (emailTonTai) {
      throw new Error("Email đã được sử dụng");
    }

    const soDienThoaiTonTai =
      await timNguoiDungTheoSoDienThoai(soDienThoai);

    if (soDienThoaiTonTai) {
      throw new Error("Số điện thoại đã được sử dụng");
    }

    const matKhauHash = await bcrypt.hash(matKhau, 10);

    const row = await taoKhachHang({
      hoTen,
      email,
      soDienThoai,
      matKhauHash,
    });

    return new UserModel(row);
  }

  // Đăng nhập và tạo token.
  static async dangNhap(duLieu = {}) {
    const email = chuanHoaChuoi(duLieu.email).toLowerCase();
    const matKhau = chuanHoaChuoi(duLieu.mat_khau);

    if (!email || !matKhau) {
      throw new Error("Vui lòng nhập email và mật khẩu");
    }

    const row = await timNguoiDungTheoEmail(email);

    if (!row) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    if (Number(row.trang_thai) !== 101) {
      throw new Error("Tài khoản đang bị khóa hoặc ngưng hoạt động");
    }

    const matKhauDung = await bcrypt.compare(matKhau, row.mat_khau_hash);

    if (!matKhauDung) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }

    const token = jwt.sign(
      {
        id: row.id,
        email: row.email,
        vai_tro: row.vai_tro,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return {
      token,
      nguoiDung: new UserModel(row),
    };
  }

  // Lấy thông tin tài khoản đang đăng nhập.
  static async layThongTinCuaToi(nguoiDungId) {
    const row = await layNguoiDungTheoId(nguoiDungId);

    if (!row) {
      throw new Error("Không tìm thấy người dùng");
    }

    return new UserModel(row);
  }
}

module.exports = UserModel;
