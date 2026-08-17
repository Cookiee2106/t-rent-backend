const adminCustomerRepository = require("../repositories/adminCustomerRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

class AdminCustomerModel {
  constructor({
    id,
    khach_hang_id,
    ho_ten,
    email,
    so_dien_thoai,
    dia_chi,

    trang_thai,
    ten_trang_thai_tai_khoan,

    trang_thai_xac_minh,
    ten_trang_thai_xac_minh,

    ho_so_xac_minh_id,
    so_cccd,
    co_anh_mat_truoc,
    co_anh_mat_sau,
    co_anh_cam_cccd,

    trang_thai_ho_so,
    ten_trang_thai_ho_so,

    ly_do_tu_choi,
    nguoi_duyet_id,
    duyet_luc,
    ngay_gui,
    created_at,
  } = {}) {
    this.id = id;
    this.khach_hang_id = khach_hang_id ?? id;

    this.ho_ten = ho_ten;
    this.email = email;
    this.so_dien_thoai = so_dien_thoai;
    this.dia_chi = dia_chi ?? null;

    this.trang_thai = trang_thai;
    this.ten_trang_thai_tai_khoan = ten_trang_thai_tai_khoan ?? null;

    this.trang_thai_xac_minh = trang_thai_xac_minh ?? null;
    this.ten_trang_thai_xac_minh = ten_trang_thai_xac_minh ?? null;

    this.ho_so_xac_minh_id = ho_so_xac_minh_id ?? null;
    this.so_cccd = so_cccd ?? null;
    this.co_anh_mat_truoc = Boolean(co_anh_mat_truoc);
    this.co_anh_mat_sau = Boolean(co_anh_mat_sau);
    this.co_anh_cam_cccd = Boolean(co_anh_cam_cccd);

    this.trang_thai_ho_so = trang_thai_ho_so ?? null;
    this.ten_trang_thai_ho_so = ten_trang_thai_ho_so ?? null;

    this.ly_do_tu_choi = ly_do_tu_choi ?? null;
    this.nguoi_duyet_id = nguoi_duyet_id ?? null;
    this.duyet_luc = duyet_luc ?? null;
    this.ngay_gui = ngay_gui ?? null;
    this.created_at = created_at ?? null;
  }

  // Lấy danh sách khách hàng.
  static async layDanhSachKhachHangService(query = {}) {
    const tuKhoa = chuanHoaChuoi(query.tu_khoa);
    const trangThai = Number(query.trang_thai) || 0;

    const rows = await adminCustomerRepository.layDanhSachKhachHang({
      tuKhoa,
      mauTimKiem: `%${tuKhoa}%`,
      trangThai,
    });

    return rows.map((item) => new AdminCustomerModel(item));
  }

  // Lấy chi tiết khách hàng.
  static async layChiTietKhachHangService(khachHangId) {
    const row = await adminCustomerRepository.layChiTietKhachHang(khachHangId);

    if (!row) {
      throw new Error("Không tìm thấy khách hàng");
    }

    return new AdminCustomerModel(row);
  }

  // Khóa hoặc mở khóa tài khoản khách hàng.
  static async capNhatTrangThaiKhachHangService(khachHangId, trangThaiMoi) {
    const TRANG_THAI_HOAT_DONG = 101;
    const TRANG_THAI_BI_KHOA = 102;

    const trangThai = Number(trangThaiMoi);

    if (
      trangThai !== TRANG_THAI_HOAT_DONG &&
      trangThai !== TRANG_THAI_BI_KHOA
    ) {
      throw new Error("Trạng thái tài khoản không hợp lệ");
    }

    const ketQua = await adminCustomerRepository.capNhatTrangThaiKhachHang(
      khachHangId,
      trangThai
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy khách hàng");
    }

    return await AdminCustomerModel.layChiTietKhachHangService(khachHangId);
  }

  // Duyệt hồ sơ xác minh.
  static async duyetHoSoXacMinhService(hoSoId, nguoiDuyetId) {
    const hoSo = await adminCustomerRepository.layHoSoXacMinhTheoId(hoSoId);

    if (!hoSo) {
      throw new Error("Không tìm thấy hồ sơ xác minh");
    }

    if (Number(hoSo.trang_thai) !== 202) {
      throw new Error("Chỉ có thể duyệt hồ sơ đang chờ duyệt");
    }

    await adminCustomerRepository.duyetHoSoXacMinh(
      hoSoId,
      hoSo.khach_hang_id,
      nguoiDuyetId
    );

    return await AdminCustomerModel.layChiTietKhachHangService(
      hoSo.khach_hang_id
    );
  }

  // Từ chối hồ sơ xác minh.
  static async tuChoiHoSoXacMinhService(
    hoSoId,
    nguoiDuyetId,
    lyDoTuChoi
  ) {
    const lyDo = chuanHoaChuoi(lyDoTuChoi);

    if (!lyDo) {
      throw new Error("Vui lòng nhập lý do từ chối");
    }

    const hoSo = await adminCustomerRepository.layHoSoXacMinhTheoId(hoSoId);

    if (!hoSo) {
      throw new Error("Không tìm thấy hồ sơ xác minh");
    }

    if (Number(hoSo.trang_thai) !== 202) {
      throw new Error("Chỉ có thể từ chối hồ sơ đang chờ duyệt");
    }

    await adminCustomerRepository.tuChoiHoSoXacMinh(
      hoSoId,
      hoSo.khach_hang_id,
      nguoiDuyetId,
      lyDo
    );

    return await AdminCustomerModel.layChiTietKhachHangService(
      hoSo.khach_hang_id
    );
  }
}

module.exports = AdminCustomerModel;
