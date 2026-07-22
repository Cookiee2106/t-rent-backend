const equipmentBrandRepository = require("../repositories/equipmentBrandRepository");

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

  static async layDanhSachHangThietBiService() {
    const rows = await equipmentBrandRepository.layDanhSachHangThietBi();

    return rows.map((item) => new EquipmentBrandModel(item));
  }

  static async layDanhSachHangDangHienThiService() {
    return await equipmentBrandRepository.layDanhSachHangDangHienThi();
  }

  static async taoHangThietBiService(body = {}) {
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

  static async capNhatHangThietBiService(id, body = {}) {
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

  static async capNhatTrangThaiHangThietBiService(id, body = {}) {
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

  static async xoaMemHangThietBiService(id) {
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
}

module.exports = EquipmentBrandModel;