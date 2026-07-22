const assetRepository = require("../repositories/assetRepository");

function chuanHoaChuoi(giaTri) {
  const ketQua = String(giaTri || "").trim();

  return ketQua || null;
}

function kiemTraUuid(giaTri, tenTruong) {
  if (!giaTri) {
    throw new Error(`Vui lòng chọn ${tenTruong}`);
  }
}

async function kiemTraMauThietBi(mauThietBiId) {
  const mau = await assetRepository.layMauThietBiTheoId(mauThietBiId);

  if (!mau) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  return mau;
}

async function kiemTraViTriKho(viTriKhoId, thietBiIdBoQua = null) {
  const viTri = await assetRepository.layViTriKhoTheoId(viTriKhoId);

  if (!viTri) {
    throw new Error("Không tìm thấy vị trí kho");
  }

  if (Number(viTri.trang_thai) !== assetRepository.TRANG_THAI_HIEN_THI) {
    throw new Error("Vị trí kho đang bị ẩn, không thể sử dụng");
  }

  const soLuongDangChua = await assetRepository.demSoLuongDangChuaCuaViTri(
    viTriKhoId,
    thietBiIdBoQua
  );

  if (soLuongDangChua >= Number(viTri.suc_chua_toi_da || 0)) {
    throw new Error(`Vị trí "${viTri.ten_vi_tri}" đã đầy`);
  }

  return viTri;
}

async function kiemTraTrungDuLieu({ maTaiSan, soSerial, idBoQua = null }) {
  const trungSerial = await assetRepository.timTrungSoSerial(soSerial, idBoQua);

  if (trungSerial) {
    throw new Error("Số serial đã tồn tại");
  }

  const trungMaTaiSan = await assetRepository.timTrungMaTaiSan(
    maTaiSan,
    idBoQua
  );

  if (trungMaTaiSan) {
    throw new Error("Mã tài sản đã tồn tại");
  }
}

class AssetModel {
  constructor({
    id,
    mau_thiet_bi_id,

    ma_tai_san,
    so_serial,

    vi_tri_kho_id,
    ten_vi_tri,
    suc_chua_toi_da,

    trang_thai,
    ten_trang_thai,

    hang_id,
    ten_hang,
    ten_mau,
    ten_danh_muc,

    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.mau_thiet_bi_id = mau_thiet_bi_id;

    this.ma_tai_san = ma_tai_san || null;
    this.so_serial = so_serial || null;

    this.vi_tri_kho_id = vi_tri_kho_id || null;
    this.ten_vi_tri = ten_vi_tri || null;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;
    this.ten_mau = ten_mau || null;
    this.ten_danh_muc = ten_danh_muc || null;

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachThietBiVatLyService() {
    const danhSach = await assetRepository.layDanhSachThietBiVatLy();

    return danhSach.map((item) => new AssetModel(item));
  }

  static async layChiTietThietBiVatLyService(id) {
    const thietBi = await assetRepository.layThietBiVatLyTheoId(id);

    if (!thietBi) {
      throw new Error("Không tìm thấy thiết bị vật lý");
    }

    return new AssetModel(thietBi);
  }

  static async themThietBiVatLyService(body) {
    const mauThietBiId = body.mau_thiet_bi_id;
    const viTriKhoId = body.vi_tri_kho_id;
    const maTaiSan = chuanHoaChuoi(body.ma_tai_san);
    const soSerial = chuanHoaChuoi(body.so_serial);

    kiemTraUuid(mauThietBiId, "mẫu thiết bị");
    kiemTraUuid(viTriKhoId, "vị trí kho");

    if (!soSerial) {
      throw new Error("Vui lòng nhập số serial");
    }

    await kiemTraMauThietBi(mauThietBiId);
    await kiemTraViTriKho(viTriKhoId);
    await kiemTraTrungDuLieu({ maTaiSan, soSerial });

    const ketQua = await assetRepository.themThietBiVatLy({
      mauThietBiId,
      maTaiSan,
      soSerial,
      viTriKhoId,
    });

    return await AssetModel.layChiTietThietBiVatLyService(ketQua.id);
  }

  static async capNhatThietBiVatLyService(id, body) {
    const thietBi = await AssetModel.layChiTietThietBiVatLyService(id);

    if (Number(thietBi.trang_thai) === assetRepository.TRANG_THAI_DANG_THUE) {
      throw new Error("Không thể cập nhật thiết bị đang thuê");
    }

    const mauThietBiId = body.mau_thiet_bi_id;
    const viTriKhoId = body.vi_tri_kho_id;
    const maTaiSan = chuanHoaChuoi(body.ma_tai_san);
    const soSerial = chuanHoaChuoi(body.so_serial);

    kiemTraUuid(mauThietBiId, "mẫu thiết bị");
    kiemTraUuid(viTriKhoId, "vị trí kho");

    if (!soSerial) {
      throw new Error("Vui lòng nhập số serial");
    }

    await kiemTraMauThietBi(mauThietBiId);
    await kiemTraViTriKho(viTriKhoId, id);
    await kiemTraTrungDuLieu({ maTaiSan, soSerial, idBoQua: id });

    const ketQua = await assetRepository.capNhatThietBiVatLy(id, {
      mauThietBiId,
      maTaiSan,
      soSerial,
      viTriKhoId,
    });

    if (!ketQua) {
      throw new Error("Không tìm thấy thiết bị vật lý");
    }

    return await AssetModel.layChiTietThietBiVatLyService(id);
  }

  static async capNhatTrangThaiThietBiVatLyService(id, trangThaiMoi) {
    const thietBi = await AssetModel.layChiTietThietBiVatLyService(id);

    const trangThaiHienTai = Number(thietBi.trang_thai);
    const trangThai = Number(trangThaiMoi);

    const anHopLe =
      trangThaiHienTai === assetRepository.TRANG_THAI_SAN_SANG &&
      trangThai === assetRepository.TRANG_THAI_DA_AN;

    const hienHopLe =
      trangThaiHienTai === assetRepository.TRANG_THAI_DA_AN &&
      trangThai === assetRepository.TRANG_THAI_SAN_SANG;

    if (!anHopLe && !hienHopLe) {
      throw new Error("Chỉ được ẩn thiết bị sẵn sàng hoặc hiện lại thiết bị đã ẩn");
    }

    await assetRepository.capNhatTrangThaiThietBiVatLy(id, trangThai);

    return await AssetModel.layChiTietThietBiVatLyService(id);
  }

  static async xoaMemThietBiVatLyService(id) {
    const thietBi = await AssetModel.layChiTietThietBiVatLyService(id);

    if (Number(thietBi.trang_thai) === assetRepository.TRANG_THAI_DANG_THUE) {
      throw new Error("Không thể xóa thiết bị đang thuê");
    }

    const ketQua = await assetRepository.xoaMemThietBiVatLy(id);

    if (!ketQua) {
      throw new Error("Không tìm thấy thiết bị vật lý");
    }

    return {
      id: thietBi.id,
      so_serial: thietBi.so_serial,
      ma_tai_san: thietBi.ma_tai_san,
    };
  }
}

module.exports = AssetModel;
