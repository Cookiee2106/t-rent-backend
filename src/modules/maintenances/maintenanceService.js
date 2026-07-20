const MaintenanceModel = require("../../models/MaintenanceModel");
const maintenanceRepository = require("../../repositories/maintenanceRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) return "";
  return String(giaTri).trim();
}

async function layDanhSachHoSoBaoTriService({ trang_thai, tu_khoa, page, limit }) {
  const trangThai = trang_thai ? Number(trang_thai) : null;
  const tuKhoa = chuanHoaChuoi(tu_khoa);
  const soTrang = Number(page || 1);
  const soDong = Number(limit || 10);
  const offset = (soTrang - 1) * soDong;

  const total = await maintenanceRepository.demDanhSachBaoTri({
    trangThai,
    tuKhoa,
  });

  const danhSach = await maintenanceRepository.layDanhSachBaoTri({
    trangThai,
    tuKhoa,
    limit: soDong,
    offset,
  });

  return {
    data: danhSach.map((item) => new MaintenanceModel(item)),
    total,
    page: soTrang,
    limit: soDong,
  };
}

async function layChiTietHoSoBaoTriService(id) {
  const baoTri = await maintenanceRepository.layChiTietBaoTri(id);

  if (!baoTri) {
    throw new Error("Không tìm thấy phiếu bảo trì");
  }

  return new MaintenanceModel(baoTri);
}

async function taoHoSoBaoTriTuThietBiService(thietBiId, body = {}, nguoiTaoId) {
  const lyDo = chuanHoaChuoi(body.ly_do);

  if (!nguoiTaoId) {
    throw new Error("Không xác định được người tạo phiếu bảo trì");
  }

  if (!lyDo) {
    throw new Error("Vui lòng nhập lý do bảo trì");
  }

  const ketQua = await maintenanceRepository.taoBaoTriTuThietBi({
    thietBiId,
    lyDo,
    nguoiTaoId,
  });

  return new MaintenanceModel(ketQua);
}

async function capNhatKetQuaBaoTriService(id, body = {}) {
  const ketQua = chuanHoaChuoi(body.ket_qua);
  const trangThaiSauBaoTri = Number(body.trang_thai_sau_bao_tri);

  if (!ketQua) {
    throw new Error("Vui lòng nhập kết quả bảo trì");
  }

  if (
    trangThaiSauBaoTri !== maintenanceRepository.TRANG_THAI_THIET_BI_SAN_SANG &&
    trangThaiSauBaoTri !== maintenanceRepository.TRANG_THAI_THIET_BI_HU_HONG
  ) {
    throw new Error("Trạng thái sau bảo trì không hợp lệ");
  }

  return await maintenanceRepository.capNhatKetQuaBaoTri({
    id,
    ketQua,
    trangThaiSauBaoTri,
  });
}

module.exports = {
  layDanhSachHoSoBaoTriService,
  layChiTietHoSoBaoTriService,
  taoHoSoBaoTriTuThietBiService,
  capNhatKetQuaBaoTriService,
};
