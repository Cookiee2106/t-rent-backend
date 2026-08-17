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

// Danh mục của vị trí phải còn tồn tại và đang hiển thị.
async function kiemTraDanhMuc(danhMucId) {
  if (!danhMucId) {
    throw new Error("Vui lòng chọn danh mục");
  }

  const danhMuc =
    await warehouseLocationRepository.layDanhMucDangHienThiTheoId(danhMucId);

  if (!danhMuc) {
    throw new Error("Danh mục không tồn tại hoặc đang bị ẩn");
  }

  return danhMuc;
}

class WarehouseLocationModel {
  constructor({
    id,
    ten_vi_tri,
    danh_muc_id,
    ten_danh_muc,
    suc_chua_toi_da,
    so_luong_dang_chua,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_vi_tri = ten_vi_tri;
    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;
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

  static async layDanhSachViTriKhoDangHienThiService(danhMucId = null) {
    const danhMucIdChuanHoa = chuanHoaChuoi(danhMucId) || null;

    if (danhMucIdChuanHoa) {
      await kiemTraDanhMuc(danhMucIdChuanHoa);
    }

    return await warehouseLocationRepository.layDanhSachViTriKhoDangHienThi(
      danhMucIdChuanHoa
    );
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
    const danhMucId = chuanHoaChuoi(body.danh_muc_id);
    const sucChuaToiDa = docSoLuong(body.suc_chua_toi_da);

    if (!tenViTri) {
      throw new Error("Vui lòng nhập tên vị trí kho");
    }

    await kiemTraDanhMuc(danhMucId);

    const tenTrung =
      await warehouseLocationRepository.timViTriTrungTen(tenViTri);

    if (tenTrung) {
      throw new Error("Tên vị trí kho đã tồn tại");
    }

    const ketQua = await warehouseLocationRepository.taoViTriKho({
      tenViTri,
      danhMucId,
      sucChuaToiDa,
    });

    const viTriMoi = await warehouseLocationRepository.layViTriTheoId(
      ketQua.id
    );

    return new WarehouseLocationModel(viTriMoi);
  }

  static async capNhatViTriKhoService(id, body = {}) {
    const viTriHienTai = await layViTriBatBuocTonTai(id);

    const tenViTri =
      body.ten_vi_tri !== undefined
        ? chuanHoaChuoi(body.ten_vi_tri)
        : viTriHienTai.ten_vi_tri;

    const danhMucId =
      body.danh_muc_id !== undefined
        ? chuanHoaChuoi(body.danh_muc_id)
        : viTriHienTai.danh_muc_id;

    const sucChuaToiDa =
      body.suc_chua_toi_da !== undefined
        ? docSoLuong(body.suc_chua_toi_da)
        : Number(viTriHienTai.suc_chua_toi_da);

    if (!tenViTri) {
      throw new Error("Vui lòng nhập tên vị trí kho");
    }

    await kiemTraDanhMuc(danhMucId);

    const soLuongDangChua =
      await warehouseLocationRepository.tinhSoLuongDangChua(id);

    if (sucChuaToiDa < soLuongDangChua) {
      throw new Error(
        `Sức chứa không được nhỏ hơn số lượng đang chứa hiện tại (${soLuongDangChua})`
      );
    }

    // Vị trí đã có hàng thì không được đổi sang danh mục khác.
    const doiDanhMuc =
      String(viTriHienTai.danh_muc_id || "") !== String(danhMucId || "");

    if (doiDanhMuc && soLuongDangChua > 0) {
      throw new Error(
        `Vị trí đang chứa ${soLuongDangChua} vật phẩm, không thể đổi danh mục`
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
      danhMucId,
      sucChuaToiDa,
    });

    if (!ketQua) {
      throw new Error("Không tìm thấy vị trí kho");
    }

    const viTriSauCapNhat =
      await warehouseLocationRepository.layViTriTheoId(id);

    return new WarehouseLocationModel(viTriSauCapNhat);
  }

  static async capNhatTrangThaiViTriKhoService(id, body = {}) {
    await layViTriBatBuocTonTai(id);

    const trangThai = docTrangThai(body.trang_thai);

    const ketQua =
      await warehouseLocationRepository.capNhatTrangThaiViTriKho(
        id,
        trangThai
      );

    if (!ketQua) {
      throw new Error("Không tìm thấy vị trí kho");
    }

    const viTriSauCapNhat =
      await warehouseLocationRepository.layViTriTheoId(id);

    return new WarehouseLocationModel(viTriSauCapNhat);
  }

  static async xoaMemViTriKhoService(id) {
    await layViTriBatBuocTonTai(id);

    const thietBiDangDung =
      await warehouseLocationRepository.timThietBiTheoViTri(id);

    if (thietBiDangDung) {
      throw new Error("Vị trí kho đang được thiết bị sử dụng, không thể xóa");
    }

    const phuKienDangDung =
      await warehouseLocationRepository.timPhuKienTheoViTri(id);

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
