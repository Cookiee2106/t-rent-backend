const warehouseLocationRepository = require("../repositories/warehouseLocationRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function docSoLuong(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so <= 0) {
    throw new Error("Sức chứa tối đa phải là số nguyên lớn hơn 0");
  }

  return so;
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (trangThai !== 601 && trangThai !== 602) {
    throw new Error("Trạng thái vị trí kho không hợp lệ");
  }

  return trangThai;
}

async function layViTriBatBuocTonTai(id) {
  const viTri = await warehouseLocationRepository.layViTriTheoId(id);

  if (!viTri) {
    throw new Error("Không tìm thấy vị trí kho");
  }

  return viTri;
}

class WarehouseLocationModel {
  constructor({
    id,
    ten_vi_tri,
    suc_chua_toi_da,
    so_luong_dang_chua,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_vi_tri = ten_vi_tri;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);
    this.so_luong_dang_chua = Number(so_luong_dang_chua || 0);
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachViTriKhoService() {
    const rows = await warehouseLocationRepository.layDanhSachViTriKho();

    return rows.map((item) => new WarehouseLocationModel(item));
  }

  static async layDanhSachViTriKhoDangHienThiService() {
    return await warehouseLocationRepository.layDanhSachViTriKhoDangHienThi();
  }

  static async layDanhSachViTriPhuKienKhaDungService(phuKienId) {
    if (!phuKienId) {
      throw new Error("Thiếu phụ kiện cần lấy vị trí kho");
    }

    return await warehouseLocationRepository.layDanhSachViTriKhaDungCuaPhuKien(
      phuKienId
    );
  }

  static async taoViTriKhoService(body = {}) {
    const tenViTri = chuanHoaChuoi(body.ten_vi_tri);
    const sucChuaToiDa = docSoLuong(body.suc_chua_toi_da);

    if (!tenViTri) {
      throw new Error("Vui lòng nhập tên vị trí kho");
    }

    const tenTrung = await warehouseLocationRepository.timViTriTrungTen(tenViTri);

    if (tenTrung) {
      throw new Error("Tên vị trí kho đã tồn tại");
    }

    const ketQua = await warehouseLocationRepository.taoViTriKho({
      tenViTri,
      sucChuaToiDa,
    });

    const viTriMoi = await warehouseLocationRepository.layViTriTheoId(ketQua.id);

    return new WarehouseLocationModel(viTriMoi);
  }

  static async capNhatViTriKhoService(id, body = {}) {
    const viTriHienTai = await layViTriBatBuocTonTai(id);

    const tenViTri =
      body.ten_vi_tri !== undefined
        ? chuanHoaChuoi(body.ten_vi_tri)
        : viTriHienTai.ten_vi_tri;

    const sucChuaToiDa =
      body.suc_chua_toi_da !== undefined
        ? docSoLuong(body.suc_chua_toi_da)
        : Number(viTriHienTai.suc_chua_toi_da);

    if (!tenViTri) {
      throw new Error("Vui lòng nhập tên vị trí kho");
    }

    const soLuongDangChua = await warehouseLocationRepository.tinhSoLuongDangChua(
      id
    );

    if (sucChuaToiDa < soLuongDangChua) {
      throw new Error(
        `Sức chứa không được nhỏ hơn số lượng đang chứa hiện tại (${soLuongDangChua})`
      );
    }

    const tenTrung = await warehouseLocationRepository.timViTriTrungTen(
      tenViTri,
      id
    );

    if (tenTrung) {
      throw new Error("Tên vị trí kho đã tồn tại");
    }

    const ketQua = await warehouseLocationRepository.capNhatViTriKho(id, {
      tenViTri,
      sucChuaToiDa,
    });

    if (!ketQua) {
      throw new Error("Không tìm thấy vị trí kho");
    }

    const viTriSauCapNhat = await warehouseLocationRepository.layViTriTheoId(id);

    return new WarehouseLocationModel(viTriSauCapNhat);
  }

  static async capNhatTrangThaiViTriKhoService(id, body = {}) {
    await layViTriBatBuocTonTai(id);

    const trangThai = docTrangThai(body.trang_thai);

    const ketQua = await warehouseLocationRepository.capNhatTrangThaiViTriKho(
      id,
      trangThai
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy vị trí kho");
    }

    const viTriSauCapNhat = await warehouseLocationRepository.layViTriTheoId(id);

    return new WarehouseLocationModel(viTriSauCapNhat);
  }

  static async xoaMemViTriKhoService(id) {
    await layViTriBatBuocTonTai(id);

    const thietBiDangDung = await warehouseLocationRepository.timThietBiTheoViTri(
      id
    );

    if (thietBiDangDung) {
      throw new Error("Vị trí kho đang được thiết bị sử dụng, không thể xóa");
    }

    const phuKienDangDung = await warehouseLocationRepository.timPhuKienTheoViTri(
      id
    );

    if (phuKienDangDung) {
      throw new Error("Vị trí kho đang được phụ kiện sử dụng, không thể xóa");
    }

    const ketQua = await warehouseLocationRepository.xoaMemViTriKho(id);

    if (!ketQua) {
      throw new Error("Không tìm thấy vị trí kho");
    }

    return {
      message: "Xóa mềm vị trí kho thành công",
    };
  }
}

module.exports = WarehouseLocationModel;