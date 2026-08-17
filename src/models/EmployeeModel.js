const bcrypt = require("bcryptjs");
const employeeRepository = require("../repositories/employeeRepository");

const TRANG_THAI_HOAT_DONG = 101;
const TRANG_THAI_BI_KHOA = 102;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null || giaTri === "") {
    return null;
  }

  return String(giaTri).trim();
}

function kiemTraSoDienThoai(soDienThoai) {
  if (!soDienThoai) {
    return true;
  }

  return /^0[0-9]{9,10}$/.test(soDienThoai);
}

// CCCD nhân viên bắt buộc đủ đúng 12 chữ số.
function kiemTraSoCccd(soCccd) {
  return /^[0-9]{12}$/.test(String(soCccd || ""));
}

async function kiemTraTrungEmailHoacSoDienThoai(
  email,
  soDienThoai,
  idBoQua = null
) {
  const trung = await employeeRepository.timTrungEmailHoacSoDienThoai(
    email,
    soDienThoai,
    idBoQua
  );

  if (!trung) {
    return;
  }

  if (email && trung.email === email) {
    throw new Error("Email đã tồn tại");
  }

  if (soDienThoai && trung.so_dien_thoai === soDienThoai) {
    throw new Error("Số điện thoại đã tồn tại");
  }
}

class EmployeeModel {
  constructor({
    id,
    ho_ten,
    email,
    so_dien_thoai,
    so_cccd,
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
    this.so_cccd = so_cccd ?? null;
    this.dia_chi = dia_chi ?? null;
    this.vai_tro = vai_tro;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai ?? null;
    this.created_at = created_at ?? null;
    this.updated_at = updated_at ?? null;
  }

  // Lấy danh sách nhân viên.
  static async layDanhSachNhanVienService() {
    const rows = await employeeRepository.layDanhSachNhanVien();

    return rows.map((item) => new EmployeeModel(item));
  }

  // Lấy chi tiết nhân viên.
  static async layChiTietNhanVienService(id) {
    const row = await employeeRepository.layChiTietNhanVien(id);

    if (!row) {
      throw new Error("Không tìm thấy nhân viên");
    }

    return new EmployeeModel(row);
  }

  // Thêm nhân viên.
  static async themNhanVienService(body = {}) {
    const hoTen = chuanHoaChuoi(body.ho_ten);
    const email = chuanHoaChuoi(body.email);
    const soDienThoai = chuanHoaChuoi(body.so_dien_thoai);
    const soCccd = chuanHoaChuoi(body.so_cccd);
    const diaChi = chuanHoaChuoi(body.dia_chi);
    const matKhau = chuanHoaChuoi(body.mat_khau);

    if (!hoTen) {
      throw new Error("Vui lòng nhập họ tên");
    }

    if (!email) {
      throw new Error("Vui lòng nhập email");
    }

    if (!soCccd) {
      throw new Error("Vui lòng nhập số CCCD");
    }

    if (!kiemTraSoCccd(soCccd)) {
      throw new Error("Số CCCD phải gồm đúng 12 chữ số");
    }

    if (!matKhau) {
      throw new Error("Vui lòng nhập mật khẩu");
    }

    if (matKhau.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }

    if (!kiemTraSoDienThoai(soDienThoai)) {
      throw new Error("Số điện thoại không hợp lệ");
    }

    await kiemTraTrungEmailHoacSoDienThoai(email, soDienThoai);

    const trungCccd = await employeeRepository.timTrungCccd(soCccd);

    if (trungCccd) {
      throw new Error("Số CCCD đã tồn tại");
    }

    const matKhauHash = await bcrypt.hash(matKhau, 10);

    const row = await employeeRepository.themNhanVien({
      hoTen,
      email,
      soDienThoai,
      soCccd,
      diaChi,
      matKhauHash,
      trangThai: TRANG_THAI_HOAT_DONG,
    });

    return new EmployeeModel(row);
  }

  // Cập nhật thông tin nhân viên.
  static async capNhatNhanVienService(id, body = {}) {
    await EmployeeModel.layChiTietNhanVienService(id);

    const hoTen = chuanHoaChuoi(body.ho_ten);
    const soDienThoai = chuanHoaChuoi(body.so_dien_thoai);
    const soCccd = chuanHoaChuoi(body.so_cccd);
    const diaChi = chuanHoaChuoi(body.dia_chi);

    if (!hoTen) {
      throw new Error("Vui lòng nhập họ tên");
    }

    if (!soCccd) {
      throw new Error("Vui lòng nhập số CCCD");
    }

    if (!kiemTraSoCccd(soCccd)) {
      throw new Error("Số CCCD phải gồm đúng 12 chữ số");
    }

    if (!kiemTraSoDienThoai(soDienThoai)) {
      throw new Error("Số điện thoại không hợp lệ");
    }

    await kiemTraTrungEmailHoacSoDienThoai(null, soDienThoai, id);

    const trungCccd = await employeeRepository.timTrungCccd(soCccd, id);

    if (trungCccd) {
      throw new Error("Số CCCD đã tồn tại");
    }

    const ketQua = await employeeRepository.capNhatNhanVien(id, {
      hoTen,
      soDienThoai,
      soCccd,
      diaChi,
    });

    if (!ketQua) {
      throw new Error("Không tìm thấy nhân viên");
    }

    return await EmployeeModel.layChiTietNhanVienService(id);
  }

  // Khóa hoặc mở khóa nhân viên.
  static async capNhatTrangThaiNhanVienService(id, trangThaiMoi) {
    const trangThai = Number(trangThaiMoi);

    if (
      trangThai !== TRANG_THAI_HOAT_DONG &&
      trangThai !== TRANG_THAI_BI_KHOA
    ) {
      throw new Error("Trạng thái nhân viên không hợp lệ");
    }

    await EmployeeModel.layChiTietNhanVienService(id);

    const ketQua = await employeeRepository.capNhatTrangThaiNhanVien(
      id,
      trangThai
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy nhân viên");
    }

    return await EmployeeModel.layChiTietNhanVienService(id);
  }

  // Xóa mềm nhân viên.
  static async xoaMemNhanVienService(id) {
    await EmployeeModel.layChiTietNhanVienService(id);

    const ketQua = await employeeRepository.xoaMemNhanVien(id);

    if (!ketQua) {
      throw new Error("Không tìm thấy nhân viên");
    }

    return ketQua;
  }
}

module.exports = EmployeeModel;
