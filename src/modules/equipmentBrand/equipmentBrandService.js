const EquipmentBrandModel = require("../../models/EquipmentBrandModel");
const equipmentBrandRepository = require("../../repositories/equipmentBrandRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (trangThai !== 601 && trangThai !== 602) {
    throw new Error("Trạng thái hãng thiết bị không hợp lệ");
  }

  return trangThai;
}

async function layHangBatBuocTonTai(id) {
  const hang = await equipmentBrandRepository.layHangTheoId(id);

  if (!hang) {
    throw new Error("Không tìm thấy hãng thiết bị");
  }

  return hang;
}

async function kiemTraTenHangTrung(tenHang, idBoQua = null) {
  const hangTrung = await equipmentBrandRepository.timHangTrungTen(
    tenHang,
    idBoQua
  );

  if (hangTrung) {
    throw new Error("Tên hãng thiết bị đã tồn tại");
  }
}

async function layDanhSachHangThietBiService() {
  const rows = await equipmentBrandRepository.layDanhSachHangThietBi();

  return rows.map((item) => new EquipmentBrandModel(item));
}

async function layDanhSachHangDangHienThiService() {
  return await equipmentBrandRepository.layDanhSachHangDangHienThi();
}

async function taoHangThietBiService(body = {}) {
  const tenHang = chuanHoaChuoi(body.ten_hang);

  if (!tenHang) {
    throw new Error("Vui lòng nhập tên hãng");
  }

  await kiemTraTenHangTrung(tenHang);

  const ketQua = await equipmentBrandRepository.taoHangThietBi({
    tenHang,
  });

  const hangMoi = await equipmentBrandRepository.layHangTheoId(ketQua.id);

  return new EquipmentBrandModel(hangMoi);
}

async function capNhatHangThietBiService(id, body = {}) {
  await layHangBatBuocTonTai(id);

  if (body.ten_hang === undefined) {
    throw new Error("Không có dữ liệu để cập nhật");
  }

  const tenHang = chuanHoaChuoi(body.ten_hang);

  if (!tenHang) {
    throw new Error("Vui lòng nhập tên hãng");
  }

  await kiemTraTenHangTrung(tenHang, id);

  const ketQua = await equipmentBrandRepository.capNhatHangThietBi(id, {
    tenHang,
  });

  if (!ketQua) {
    throw new Error("Không tìm thấy hãng thiết bị");
  }

  const hangSauCapNhat = await equipmentBrandRepository.layHangTheoId(id);

  return new EquipmentBrandModel(hangSauCapNhat);
}

async function capNhatTrangThaiHangThietBiService(id, body = {}) {
  await layHangBatBuocTonTai(id);

  const trangThai = docTrangThai(body.trang_thai);

  const ketQua = await equipmentBrandRepository.capNhatTrangThaiHangThietBi(
    id,
    trangThai
  );

  if (!ketQua) {
    throw new Error("Không tìm thấy hãng thiết bị");
  }

  const hangSauCapNhat = await equipmentBrandRepository.layHangTheoId(id);

  return new EquipmentBrandModel(hangSauCapNhat);
}

async function xoaMemHangThietBiService(id) {
  await layHangBatBuocTonTai(id);

  const mauDangDung = await equipmentBrandRepository.timMauThietBiTheoHang(id);

  if (mauDangDung) {
    throw new Error("Hãng thiết bị đang được mẫu thiết bị sử dụng, không thể xóa");
  }

  const phuKienDangDung = await equipmentBrandRepository.timPhuKienTheoHang(id);

  if (phuKienDangDung) {
    throw new Error("Hãng thiết bị đang được phụ kiện sử dụng, không thể xóa");
  }

  const ketQua = await equipmentBrandRepository.xoaMemHangThietBi(id);

  if (!ketQua) {
    throw new Error("Không tìm thấy hãng thiết bị");
  }

  return {
    message: "Xóa mềm hãng thiết bị thành công",
  };
}

module.exports = {
  layDanhSachHangThietBiService,
  layDanhSachHangDangHienThiService,
  taoHangThietBiService,
  capNhatHangThietBiService,
  capNhatTrangThaiHangThietBiService,
  xoaMemHangThietBiService,
};