class AdminReportLogModel {
  static mapDongDoanhThuTheoThang(item = {}) {
    return {
      thang: item.thang || null,
      thang_hien_thi: item.thang_hien_thi || "",
      tong_doanh_thu: Number(item.tong_doanh_thu || 0),
      so_giao_dich: Number(item.so_giao_dich || 0),
      so_don_thue: Number(item.so_don_thue || 0),
    };
  }

  static mapBaoCaoDoanhThu({ tuNgay, denNgay, danhSachTheoThang }) {
    const data = (danhSachTheoThang || []).map((item) =>
      AdminReportLogModel.mapDongDoanhThuTheoThang(item)
    );

    return {
      from: tuNgay,
      to: denNgay,
      tong_doanh_thu: data.reduce(
        (tong, item) => tong + Number(item.tong_doanh_thu || 0),
        0
      ),
      tong_giao_dich: data.reduce(
        (tong, item) => tong + Number(item.so_giao_dich || 0),
        0
      ),
      tong_don_thue: data.reduce(
        (tong, item) => tong + Number(item.so_don_thue || 0),
        0
      ),
      data,
    };
  }

  static mapBaoCaoTonKho({ tongQuan, thietBiVatLy, phuKien, hang, danhMuc }) {
    return {
      summary: {
        tong_thiet_bi: Number(tongQuan?.tong_thiet_bi || 0),
        tong_phu_kien: Number(tongQuan?.tong_phu_kien || 0),
        tong_so_luong_phu_kien: Number(tongQuan?.tong_so_luong_phu_kien || 0),
        thiet_bi_hu_hong: Number(tongQuan?.thiet_bi_hu_hong || 0),
        thiet_bi_bi_mat: Number(tongQuan?.thiet_bi_bi_mat || 0),
        phu_kien_mat_hu_hong: Number(tongQuan?.phu_kien_mat_hu_hong || 0),
      },
      physical_devices: (thietBiVatLy || []).map((item) => ({
        id: item.id,
        ten_mau: item.ten_mau || "",
        ten_hang: item.ten_hang || "",
        ten_danh_muc: item.ten_danh_muc || "",
        tong_so_luong: Number(item.tong_so_luong || 0),
        dang_thue: Number(item.dang_thue || 0),
        hu_hong_mat: Number(item.hu_hong_mat || 0),
        san_sang: Number(item.san_sang || 0),
      })),
      accessories: (phuKien || []).map((item) => ({
        id: item.id,
        ten_phu_kien: item.ten_phu_kien || "",
        ten_hang: item.ten_hang || "",
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
}

module.exports = AdminReportLogModel;
