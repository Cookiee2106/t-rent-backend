function layAdminReportLogRepository() {
  return require("../repositories/adminReportLogRepository");
}

const CAC_LOAI_THAO_TAC = [
  "THANH_TOAN_COC",
  "NHAN_TIEN_THUE",
  "HUY_DON",
  "THANH_LY",
];

function chuanHoaIdLoc(giaTri) {
  if (!giaTri || giaTri === "0") return null;
  return giaTri;
}

function kiemTraKhoangNgay(tuNgay, denNgay) {
  if ((tuNgay && !denNgay) || (!tuNgay && denNgay)) {
    throw new Error("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc");
  }

  if (!tuNgay && !denNgay) {
    return;
  }

  const ngayBatDau = new Date(tuNgay);
  const ngayKetThuc = new Date(denNgay);

  if (Number.isNaN(ngayBatDau.getTime()) || Number.isNaN(ngayKetThuc.getTime())) {
    throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ");
  }

  if (ngayBatDau > ngayKetThuc) {
    throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc");
  }
}

class AdminReportLogModel {
  static mapDongDoanhThuTheoThang(item = {}) {
    return {
      thang: item.thang || null,
      thang_hien_thi: item.thang_hien_thi || "",
      tong_doanh_thu: Number(item.tong_doanh_thu || 0),
      so_don_thue: Number(item.so_don_thue || 0),
    };
  }

  static mapDongDoanhThuTheoMau(item = {}) {
    return {
      mau_thiet_bi_id: item.mau_thiet_bi_id || null,
      ten_mau: item.ten_mau || "",
      ten_hang: item.ten_hang || "",
      ten_danh_muc: item.ten_danh_muc || "",
      so_lan_thue: Number(item.so_lan_thue || 0),
      tong_doanh_thu: Number(item.tong_doanh_thu || 0),
    };
  }

  static mapBaoCaoDoanhThu({
    tuNgay,
    denNgay,
    tongQuanDoanhThu,
    danhSachTheoThang,
    danhSachTheoMau,
  }) {
    const data = (danhSachTheoThang || []).map((item) =>
      AdminReportLogModel.mapDongDoanhThuTheoThang(item)
    );

    const revenueByModels = (danhSachTheoMau || []).map((item) =>
      AdminReportLogModel.mapDongDoanhThuTheoMau(item)
    );

    return {
      from: tuNgay,
      to: denNgay,
      tong_doanh_thu:
        tongQuanDoanhThu?.tong_doanh_thu !== undefined
          ? Number(tongQuanDoanhThu.tong_doanh_thu || 0)
          : data.reduce(
              (tong, item) => tong + Number(item.tong_doanh_thu || 0),
              0
            ),
      tong_don_thue:
        tongQuanDoanhThu?.tong_don_thue !== undefined
          ? Number(tongQuanDoanhThu.tong_don_thue || 0)
          : data.reduce(
              (tong, item) => tong + Number(item.so_don_thue || 0),
              0
            ),
      data,
      revenue_by_models: revenueByModels,
    };
  }

  static mapBaoCaoTonKho({ tongQuan, thietBiVatLy, phuKien, hang, danhMuc }) {
    return {
      summary: {
        tong_thiet_bi: Number(tongQuan?.tong_thiet_bi || 0),
        thiet_bi_san_sang: Number(tongQuan?.thiet_bi_san_sang || 0),
        thiet_bi_dang_thue: Number(tongQuan?.thiet_bi_dang_thue || 0),
        thiet_bi_dang_bao_tri: Number(tongQuan?.thiet_bi_dang_bao_tri || 0),
        thiet_bi_hu_hong: Number(tongQuan?.thiet_bi_hu_hong || 0),
        thiet_bi_bi_mat: Number(tongQuan?.thiet_bi_bi_mat || 0),
        tong_phu_kien: Number(tongQuan?.tong_phu_kien || 0),
        tong_so_luong_phu_kien: Number(tongQuan?.tong_so_luong_phu_kien || 0),
        phu_kien_mat_hu_hong: Number(tongQuan?.phu_kien_mat_hu_hong || 0),
      },
      physical_devices: (thietBiVatLy || []).map((item) => ({
        id: item.id,
        ten_mau: item.ten_mau || "",
        ten_hang: item.ten_hang || "",
        ten_danh_muc: item.ten_danh_muc || "",
        tong_so_luong: Number(item.tong_so_luong || 0),
        san_sang: Number(item.san_sang || 0),
        dang_thue: Number(item.dang_thue || 0),
        dang_bao_tri: Number(item.dang_bao_tri || 0),
        hu_hong: Number(item.hu_hong || 0),
        bi_mat: Number(item.bi_mat || 0),
      })),
      accessories: (phuKien || []).map((item) => ({
        id: item.id,
        ten_phu_kien: item.ten_phu_kien || "",
        ten_danh_muc: item.ten_danh_muc || "",
        tong_so_luong: Number(item.tong_so_luong || 0),
        dang_thue: Number(item.dang_thue || 0),
        hu_hong_mat: Number(item.hu_hong_mat || 0),
        san_sang: Number(item.san_sang || 0),
      })),
      brands: hang || [],
      categories: danhMuc || [],
    };
  }

  static layTenVaiTro(vaiTro) {
    if (vaiTro === "KHACH_HANG" || vaiTro === "KHÁCH_HÀNG") return "Khách hàng";
    if (vaiTro === "NHAN_VIEN" || vaiTro === "NHÂN_VIÊN") return "Nhân viên";
    if (
      vaiTro === "QUAN_TRI" ||
      vaiTro === "QUAN_TRI_VIEN" ||
      vaiTro === "QUẢN_TRỊ_VIÊN"
    ) {
      return "Quản trị viên";
    }

    return vaiTro || "";
  }

  static mapThaoTac(item = {}) {
    return {
      id: item.id,
      loai_thao_tac: item.loai_thao_tac || "",
      ten_thao_tac: item.ten_thao_tac || "",
      nguoi_dung_id: item.nguoi_dung_id || null,
      ten_nguoi_dung: item.ten_nguoi_dung || "",
      email: item.email || "",
      vai_tro: item.vai_tro || "",
      ten_vai_tro: AdminReportLogModel.layTenVaiTro(item.vai_tro),
      ma_don: item.ma_don || "",
      so_tien:
        item.so_tien === null || item.so_tien === undefined
          ? null
          : Number(item.so_tien || 0),
      ghi_chu: item.ghi_chu || "",
      thoi_gian: item.thoi_gian || null,
    };
  }

  static mapDanhSachThaoTac({ danhSach, total, page, limit }) {
    return {
      data: (danhSach || []).map((item) => AdminReportLogModel.mapThaoTac(item)),
      total: Number(total || 0),
      page: Number(page || 1),
      limit: Number(limit || 10),
    };
  }

  static async layBaoCaoDoanhThuService(query = {}) {
    const namHienTai = new Date().getFullYear();
    const tuNgay = query.from || `${namHienTai}-01-01`;
    const denNgay = query.to || `${namHienTai}-12-31`;

    kiemTraKhoangNgay(tuNgay, denNgay);

    return layAdminReportLogRepository().layBaoCaoDoanhThuRepository({ tuNgay, denNgay });
  }

  static async layBaoCaoTonKhoService(query = {}) {
    return layAdminReportLogRepository().layBaoCaoTonKhoRepository({
      hangId: chuanHoaIdLoc(query.hang_id),
      danhMucId: chuanHoaIdLoc(query.danh_muc_id),
    });
  }

  static async layDanhSachNhatKyThaoTacService(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
    const loaiThaoTac = query.loai_thao_tac || null;
    const tuKhoa = String(query.tu_khoa || "").trim() || null;
    const from = query.from || null;
    const to = query.to || null;

    if (loaiThaoTac && !CAC_LOAI_THAO_TAC.includes(loaiThaoTac)) {
      throw new Error("Loại thao tác không hợp lệ");
    }

    kiemTraKhoangNgay(from, to);

    return layAdminReportLogRepository().layDanhSachNhatKyThaoTacRepository({
      page,
      limit,
      loaiThaoTac,
      tuKhoa,
      from,
      to,
    });
  }

  static async layChiTietNhatKyThaoTacService(id) {
    if (!id) {
      throw new Error("Thiếu id thao tác");
    }

    return layAdminReportLogRepository().layChiTietNhatKyThaoTacRepository(id);
  }
}

module.exports = AdminReportLogModel;
