const assetRepository = require("../../repositories/assetRepository");
const AssetModel = require("../../models/AssetModel");

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

async function layDanhSachThietBiVatLyService() {
  const danhSach = await assetRepository.layDanhSachThietBiVatLy();

  return danhSach.map((item) => new AssetModel(item));
}

async function layChiTietThietBiVatLyService(id) {
  const thietBi = await assetRepository.layThietBiVatLyTheoId(id);

  if (!thietBi) {
    throw new Error("Không tìm thấy thiết bị vật lý");
  }

  return new AssetModel(thietBi);
}

async function themThietBiVatLyService(body) {
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

  return await layChiTietThietBiVatLyService(ketQua.id);
}

async function capNhatThietBiVatLyService(id, body) {
  const thietBi = await layChiTietThietBiVatLyService(id);

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

  return await layChiTietThietBiVatLyService(id);
}

async function capNhatTrangThaiThietBiVatLyService(id, trangThaiMoi) {
  const thietBi = await layChiTietThietBiVatLyService(id);

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

  return await layChiTietThietBiVatLyService(id);
}

async function xoaMemThietBiVatLyService(id) {
  const thietBi = await layChiTietThietBiVatLyService(id);

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

module.exports = {
  layDanhSachThietBiVatLyService,
  layChiTietThietBiVatLyService,
  themThietBiVatLyService,
  capNhatThietBiVatLyService,
  capNhatTrangThaiThietBiVatLyService,
  xoaMemThietBiVatLyService,
};
