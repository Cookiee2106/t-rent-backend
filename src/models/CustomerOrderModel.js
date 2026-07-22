const customerOrderRepository = require("../repositories/customerOrderRepository");

function chuanHoaLyDoHuy(lyDoHuy) {
  return String(lyDoHuy || "").trim();
}

function layDanhSachMucDichFileTheoTrangThai(trangThaiDon) {
  const trangThai = Number(trangThaiDon);

  if (
    trangThai === customerOrderRepository.TRANG_THAI_DA_GIU_CHO ||
    trangThai === customerOrderRepository.TRANG_THAI_DA_HUY
  ) {
    return [];
  }

  if (
    trangThai === customerOrderRepository.TRANG_THAI_DANG_THUE ||
    trangThai === customerOrderRepository.TRANG_THAI_QUA_HAN
  ) {
    return [
      customerOrderRepository.MUC_DICH_HOP_DONG_GIAY,
      customerOrderRepository.MUC_DICH_ANH_BAN_GIAO,
    ];
  }

  if (trangThai === customerOrderRepository.TRANG_THAI_HOAN_THANH) {
    return [
      customerOrderRepository.MUC_DICH_HOP_DONG_GIAY,
      customerOrderRepository.MUC_DICH_ANH_BAN_GIAO,
      customerOrderRepository.MUC_DICH_ANH_KHI_TRA,
    ];
  }

  return [];
}

async function layDonThuocKhachHangBatBuoc(nguoiDungId, donThueId) {
  const donThue = await customerOrderRepository.layDonThuocKhachHang(
    donThueId,
    nguoiDungId
  );

  if (!donThue) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  return donThue;
}

class CustomerOrderModel {
  constructor({
    id,
    ma_don,
    khach_hang_id,
    phien_thanh_toan_id,

    ngay_nhan,
    ngay_tra,
    so_ngay_thue,

    tong_tien_thue,
    tong_tien_coc,

    trang_thai,
    ten_trang_thai,

    huy_luc,
    ly_do_huy,

    ban_giao_luc,
    nguoi_ban_giao_id,
    ten_nguoi_ban_giao,
    ghi_chu_ban_giao,

    tra_luc,
    nguoi_nhan_tra_id,
    ten_nguoi_nhan_tra,
    ghi_chu_thanh_ly,

    phi_phat_sinh_tien,

    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ma_don = ma_don;
    this.khach_hang_id = khach_hang_id || null;
    this.phien_thanh_toan_id = phien_thanh_toan_id || null;

    this.ngay_nhan = ngay_nhan || null;
    this.ngay_tra = ngay_tra || null;
    this.so_ngay_thue = Number(so_ngay_thue || 0);

    this.tong_tien_thue = Number(tong_tien_thue || 0);
    this.tong_tien_coc = Number(tong_tien_coc || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.huy_luc = huy_luc || null;
    this.ly_do_huy = ly_do_huy || null;

    this.ban_giao_luc = ban_giao_luc || null;
    this.nguoi_ban_giao_id = nguoi_ban_giao_id || null;
    this.ten_nguoi_ban_giao = ten_nguoi_ban_giao || null;
    this.ghi_chu_ban_giao = ghi_chu_ban_giao || null;

    this.tra_luc = tra_luc || null;
    this.nguoi_nhan_tra_id = nguoi_nhan_tra_id || null;
    this.ten_nguoi_nhan_tra = ten_nguoi_nhan_tra || null;
    this.ghi_chu_thanh_ly = ghi_chu_thanh_ly || null;

    this.phi_phat_sinh_tien = Number(phi_phat_sinh_tien || 0);

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachDonCuaToiService(nguoiDungId) {
    await customerOrderRepository.capNhatDonQuaHanCuaKhach(nguoiDungId);

    const danhSach = await customerOrderRepository.layDanhSachDonCuaKhach(
      nguoiDungId
    );

    return danhSach.map((don) => new CustomerOrderModel(don));
  }

  static async layChiTietDonCuaToiService(nguoiDungId, donThueId) {
    await customerOrderRepository.capNhatDonQuaHanCuaKhach(nguoiDungId);

    const donThue = await layDonThuocKhachHangBatBuoc(nguoiDungId, donThueId);

    const chiTietDon = await customerOrderRepository.layChiTietDonThue(donThueId);
    const thanhToan = await customerOrderRepository.layThanhToanCuaDon(donThueId);

    const danhSachMucDichId = layDanhSachMucDichFileTheoTrangThai(
      donThue.trang_thai
    );

    const tepDonThue = await customerOrderRepository.layTepDonThueTheoMucDich(
      donThueId,
      danhSachMucDichId
    );

    return {
      don_thue: new CustomerOrderModel(donThue),
      chi_tiet_don: chiTietDon.map((item) => ({
        ...item,
        so_luong: Number(item.so_luong || 0),
        gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
        tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),
        tien_thue: Number(item.tien_thue || 0),
        tien_coc: Number(item.tien_coc || 0),
      })),
      thanh_toan: thanhToan.map((item) => ({
        ...item,
        so_tien: Number(item.so_tien || 0),
      })),
      tep_don_thue: tepDonThue,
    };
  }

  static async huyDonCuaToiService(nguoiDungId, donThueId, body) {
    const lyDoHuy = chuanHoaLyDoHuy(body.ly_do_huy);

    if (!lyDoHuy) {
      throw new Error("Vui lòng nhập lý do hủy đơn");
    }

    await customerOrderRepository.capNhatDonQuaHanCuaKhach(nguoiDungId);

    const donThue = await layDonThuocKhachHangBatBuoc(nguoiDungId, donThueId);
    const trangThai = Number(donThue.trang_thai);

    if (trangThai === customerOrderRepository.TRANG_THAI_DA_HUY) {
      throw new Error("Đơn thuê này đã bị hủy trước đó");
    }

    if (trangThai === customerOrderRepository.TRANG_THAI_DANG_THUE) {
      throw new Error("Đơn đã bàn giao, không thể hủy");
    }

    if (trangThai === customerOrderRepository.TRANG_THAI_HOAN_THANH) {
      throw new Error("Đơn đã hoàn thành, không thể hủy");
    }

    if (trangThai === customerOrderRepository.TRANG_THAI_QUA_HAN) {
      throw new Error("Đơn đã quá hạn, không thể hủy");
    }

    if (trangThai !== customerOrderRepository.TRANG_THAI_DA_GIU_CHO) {
      throw new Error("Chỉ được hủy đơn khi đơn còn ở trạng thái đã giữ chỗ");
    }

    const ketQua = await customerOrderRepository.capNhatHuyDon(
      donThueId,
      nguoiDungId,
      lyDoHuy
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    return ketQua;
  }
}

module.exports = CustomerOrderModel;