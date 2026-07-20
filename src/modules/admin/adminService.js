const AdminCustomerModel = require("../../models/AdminCustomerModel");

const adminCustomerRepository = require("../../repositories/adminCustomerRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

async function layDanhSachKhachHangService(query = {}) {
  const tuKhoa = chuanHoaChuoi(query.tu_khoa);
  const trangThai = Number(query.trang_thai) || 0;

  const rows = await adminCustomerRepository.layDanhSachKhachHang({
    tuKhoa,
    mauTimKiem: `%${tuKhoa}%`,
    trangThai,
  });

  return rows.map((item) => new AdminCustomerModel(item));
}

async function layChiTietKhachHangService(khachHangId) {
  const row = await adminCustomerRepository.layChiTietKhachHang(khachHangId);

  if (!row) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return new AdminCustomerModel(row);
}

async function capNhatTrangThaiKhachHangService(khachHangId, trangThaiMoi) {
  const TRANG_THAI_HOAT_DONG = 101;
  const TRANG_THAI_BI_KHOA = 102;

  const trangThai = Number(trangThaiMoi);

  if (
    trangThai !== TRANG_THAI_HOAT_DONG &&
    trangThai !== TRANG_THAI_BI_KHOA
  ) {
    throw new Error("Trạng thái tài khoản không hợp lệ");
  }

  const ketQua = await adminCustomerRepository.capNhatTrangThaiKhachHang(
    khachHangId,
    trangThai
  );

  if (!ketQua) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return await layChiTietKhachHangService(khachHangId);
}

async function duyetHoSoXacMinhService(hoSoId, nguoiDuyetId) {
  const hoSo = await adminCustomerRepository.layHoSoXacMinhTheoId(hoSoId);

  if (!hoSo) {
    throw new Error("Không tìm thấy hồ sơ xác minh");
  }

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể duyệt hồ sơ đang chờ duyệt");
  }

  await adminCustomerRepository.duyetHoSoXacMinh(
    hoSoId,
    hoSo.khach_hang_id,
    nguoiDuyetId
  );

  return await layChiTietKhachHangService(hoSo.khach_hang_id);
}

async function tuChoiHoSoXacMinhService(hoSoId, nguoiDuyetId, lyDoTuChoi) {
  const lyDo = chuanHoaChuoi(lyDoTuChoi);

  if (!lyDo) {
    throw new Error("Vui lòng nhập lý do từ chối");
  }

  const hoSo = await adminCustomerRepository.layHoSoXacMinhTheoId(hoSoId);

  if (!hoSo) {
    throw new Error("Không tìm thấy hồ sơ xác minh");
  }

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể từ chối hồ sơ đang chờ duyệt");
  }

  await adminCustomerRepository.tuChoiHoSoXacMinh(
    hoSoId,
    hoSo.khach_hang_id,
    nguoiDuyetId,
    lyDo
  );

  return await layChiTietKhachHangService(hoSo.khach_hang_id);
}

module.exports = {
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
  capNhatTrangThaiKhachHangService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
};