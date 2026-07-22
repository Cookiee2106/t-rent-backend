const maintenanceRepository = require("../repositories/maintenanceRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) return "";
  return String(giaTri).trim();
}

class MaintenanceModel {
  constructor({
    id,
    ma_phieu_bao_tri,
    thiet_bi_id,
    don_thue_id,

    ly_do,
    ket_qua,

    nguoi_tao_id,
    ten_nguoi_tao,

    trang_thai_bao_tri,
    ten_trang_thai_bao_tri,

    bat_dau_luc,
    hoan_thanh_luc,

    so_serial,
    ten_mau,
    ma_don,
  } = {}) {
    this.id = id;
    this.ma_phieu_bao_tri = ma_phieu_bao_tri || "";
    this.thiet_bi_id = thiet_bi_id || null;
    this.don_thue_id = don_thue_id || null;

    this.ly_do = ly_do || "";
    this.ket_qua = ket_qua || "";

    this.nguoi_tao_id = nguoi_tao_id || null;
    this.ten_nguoi_tao = ten_nguoi_tao || "";

    this.trang_thai_bao_tri = hoan_thanh_luc
      ? 1302
      : Number(trang_thai_bao_tri || 1301);
    this.ten_trang_thai_bao_tri =
      this.trang_thai_bao_tri === 1302
        ? "Hoàn thành"
        : ten_trang_thai_bao_tri || "Đang bảo trì";

    this.bat_dau_luc = bat_dau_luc || null;
    this.hoan_thanh_luc = hoan_thanh_luc || null;

    this.so_serial = so_serial || "";
    this.ten_mau = ten_mau || "";
    this.ma_don = ma_don || "";
  }

  static async layDanhSachHoSoBaoTriService({ trang_thai, tu_khoa, page, limit }) {
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

  static async layChiTietHoSoBaoTriService(id) {
    const baoTri = await maintenanceRepository.layChiTietBaoTri(id);

    if (!baoTri) {
      throw new Error("Không tìm thấy phiếu bảo trì");
    }

    return new MaintenanceModel(baoTri);
  }

  static async taoHoSoBaoTriTuThietBiService(thietBiId, body = {}, nguoiTaoId) {
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

  static async capNhatKetQuaBaoTriService(id, body = {}) {
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
}

module.exports = MaintenanceModel;
