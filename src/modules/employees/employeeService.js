const bcrypt = require("bcryptjs");
const EmployeeModel = require("../../models/EmployeeModel");

const employeeRepository = require("../../repositories/employeeRepository");

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

async function kiemTraTrungEmailHoacSoDienThoai(email, soDienThoai, idBoQua = null) {
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

async function layDanhSachNhanVienService() {
  const rows = await employeeRepository.layDanhSachNhanVien();

  return rows.map((item) => new EmployeeModel(item));
}

async function layChiTietNhanVienService(id) {
  const row = await employeeRepository.layChiTietNhanVien(id);

  if (!row) {
    throw new Error("Không tìm thấy nhân viên");
  }

  return new EmployeeModel(row);
}

async function themNhanVienService(body = {}) {
  const hoTen = chuanHoaChuoi(body.ho_ten);
  const email = chuanHoaChuoi(body.email);
  const soDienThoai = chuanHoaChuoi(body.so_dien_thoai);
  const diaChi = chuanHoaChuoi(body.dia_chi);
  const matKhau = chuanHoaChuoi(body.mat_khau);

  if (!hoTen) {
    throw new Error("Vui lòng nhập họ tên");
  }

  if (!email) {
    throw new Error("Vui lòng nhập email");
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

  const matKhauHash = await bcrypt.hash(matKhau, 10);

  const row = await employeeRepository.themNhanVien({
    hoTen,
    email,
    soDienThoai,
    diaChi,
    matKhauHash,
    trangThai: TRANG_THAI_HOAT_DONG,
  });

  return new EmployeeModel(row);
}

async function capNhatNhanVienService(id, body = {}) {
  await layChiTietNhanVienService(id);

  const hoTen = chuanHoaChuoi(body.ho_ten);
  const soDienThoai = chuanHoaChuoi(body.so_dien_thoai);
  const diaChi = chuanHoaChuoi(body.dia_chi);

  if (!hoTen) {
    throw new Error("Vui lòng nhập họ tên");
  }

  if (!kiemTraSoDienThoai(soDienThoai)) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  await kiemTraTrungEmailHoacSoDienThoai(null, soDienThoai, id);

  const ketQua = await employeeRepository.capNhatNhanVien(id, {
    hoTen,
    soDienThoai,
    diaChi,
  });

  if (!ketQua) {
    throw new Error("Không tìm thấy nhân viên");
  }

  return await layChiTietNhanVienService(id);
}

async function capNhatTrangThaiNhanVienService(id, trangThaiMoi) {
  const trangThai = Number(trangThaiMoi);

  if (
    trangThai !== TRANG_THAI_HOAT_DONG &&
    trangThai !== TRANG_THAI_BI_KHOA
  ) {
    throw new Error("Trạng thái nhân viên không hợp lệ");
  }

  await layChiTietNhanVienService(id);

  const ketQua = await employeeRepository.capNhatTrangThaiNhanVien(
    id,
    trangThai
  );

  if (!ketQua) {
    throw new Error("Không tìm thấy nhân viên");
  }

  return await layChiTietNhanVienService(id);
}

async function xoaMemNhanVienService(id) {
  await layChiTietNhanVienService(id);

  const ketQua = await employeeRepository.xoaMemNhanVien(id);

  if (!ketQua) {
    throw new Error("Không tìm thấy nhân viên");
  }

  return ketQua;
}

module.exports = {
  layDanhSachNhanVienService,
  layChiTietNhanVienService,
  themNhanVienService,
  capNhatNhanVienService,
  capNhatTrangThaiNhanVienService,
  xoaMemNhanVienService,
};