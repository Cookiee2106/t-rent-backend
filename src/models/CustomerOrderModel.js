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
      customerOrderRepository.MUC_DICH_ANH_BIEN_BAN_BAN_GIAO,
    ];
  }

  if (trangThai === customerOrderRepository.TRANG_THAI_HOAN_THANH) {
    return [
      customerOrderRepository.MUC_DICH_HOP_DONG_GIAY,
      customerOrderRepository.MUC_DICH_ANH_BAN_GIAO,
      customerOrderRepository.MUC_DICH_ANH_KHI_TRA,
      customerOrderRepository.MUC_DICH_ANH_BIEN_BAN_BAN_GIAO,
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
    ty_le_phi_huy_snapshot,

    trang_thai,
    ten_trang_thai,

    huy_luc,
    ly_do_huy,

    yeu_cau_huy_id,
    ly_do_yeu_cau_huy,
    trang_thai_yeu_cau_huy_id,
    ten_trang_thai_yeu_cau_huy,
    ty_le_phi_huy_yeu_cau,
    tong_tien_coc_yeu_cau,
    phi_huy_yeu_cau,
    tien_coc_hoan_lai_yeu_cau,
    gui_luc_yeu_cau,

    ban_giao_luc,
    da_xuat_bien_ban,
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
    this.ty_le_phi_huy_snapshot = Number(ty_le_phi_huy_snapshot || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.huy_luc = huy_luc || null;
    this.ly_do_huy = ly_do_huy || null;

    this.yeu_cau_huy = yeu_cau_huy_id
      ? {
          id: yeu_cau_huy_id,
          ly_do_huy: ly_do_yeu_cau_huy || "",
          trang_thai_id: Number(trang_thai_yeu_cau_huy_id || 0),
          ten_trang_thai: ten_trang_thai_yeu_cau_huy || null,
          ty_le_phi_huy_snapshot: Number(ty_le_phi_huy_yeu_cau || 0),
          tong_tien_coc_snapshot: Number(tong_tien_coc_yeu_cau || 0),
          phi_huy: Number(phi_huy_yeu_cau || 0),
          tien_coc_hoan_lai: Number(tien_coc_hoan_lai_yeu_cau || 0),
          gui_luc: gui_luc_yeu_cau || null,
        }
      : null;

    this.ban_giao_luc = ban_giao_luc || null;
    this.da_xuat_bien_ban = Boolean(da_xuat_bien_ban);
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
        gia_tri_thiet_bi_snapshot: Number(item.gia_tri_thiet_bi_snapshot || 0),
        tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),
        tien_thue: Number(item.tien_thue || 0),
        tien_coc: Number(item.tien_coc || 0),
      })),
      thanh_toan: thanhToan.map((item) => ({
        ...item,
        so_tien: Number(item.so_tien || 0),
      })),
      tep_don_thue: tepDonThue.map((item) => ({
        ...item,
        protected: true,
        loai_file: item.loai_file || "image/*",
      })),
    };
  }

  static async guiYeuCauHuyDonCuaToiService(nguoiDungId, donThueId, body) {
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
      throw new Error("Đơn đã bàn giao, không thể gửi yêu cầu hủy");
    }

    if (trangThai === customerOrderRepository.TRANG_THAI_HOAN_THANH) {
      throw new Error("Đơn đã hoàn thành, không thể gửi yêu cầu hủy");
    }

    if (trangThai === customerOrderRepository.TRANG_THAI_QUA_HAN) {
      throw new Error("Đơn đã quá hạn, không thể gửi yêu cầu hủy");
    }

    if (trangThai !== customerOrderRepository.TRANG_THAI_DA_GIU_CHO) {
      throw new Error(
        "Chỉ được gửi yêu cầu hủy khi đơn còn ở trạng thái đã giữ chỗ"
      );
    }

    const daXuatBienBan = await customerOrderRepository.daCoVatPhamBanGiao(
      donThueId
    );

    if (daXuatBienBan) {
      throw new Error(
        "Đơn đã xuất biên bản bàn giao, không thể gửi yêu cầu hủy"
      );
    }

    const yeuCauHienTai =
      await customerOrderRepository.layYeuCauHuyDonTheoDon(donThueId);

    if (
      Number(yeuCauHienTai?.trang_thai_id) ===
      customerOrderRepository.TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY
    ) {
      throw new Error("Yêu cầu hủy đơn này đang chờ cửa hàng xác nhận");
    }

    if (
      Number(yeuCauHienTai?.trang_thai_id) ===
      customerOrderRepository.TRANG_THAI_YEU_CAU_HUY_DA_XAC_NHAN
    ) {
      throw new Error("Yêu cầu hủy đơn này đã được xác nhận");
    }

    if (
      donThue.ty_le_phi_huy_snapshot === null ||
      donThue.ty_le_phi_huy_snapshot === undefined
    ) {
      throw new Error("Đơn thuê chưa có chính sách phí hủy");
    }

    const tyLePhiHuy = Number(donThue.ty_le_phi_huy_snapshot);
    const tongTienCoc = Number(donThue.tong_tien_coc || 0);

    if (
      !Number.isFinite(tyLePhiHuy) ||
      tyLePhiHuy < 0 ||
      tyLePhiHuy > 100
    ) {
      throw new Error("Tỷ lệ phí hủy của đơn thuê không hợp lệ");
    }

    const phiHuy = Math.round((tongTienCoc * tyLePhiHuy) / 100);
    const tienCocHoanLai = Math.max(0, tongTienCoc - phiHuy);

    const ketQua = await customerOrderRepository.guiYeuCauHuyDon({
      donThueId,
      lyDoHuy,
      tyLePhiHuySnapshot: tyLePhiHuy,
      tongTienCocSnapshot: tongTienCoc,
      phiHuy,
      tienCocHoanLai,
    });

    if (!ketQua) {
      throw new Error("Không thể gửi lại yêu cầu hủy đơn ở trạng thái hiện tại");
    }

    return {
      ...ketQua,
      trang_thai_id: Number(ketQua.trang_thai_id || 0),
      ty_le_phi_huy_snapshot: Number(ketQua.ty_le_phi_huy_snapshot || 0),
      tong_tien_coc_snapshot: Number(ketQua.tong_tien_coc_snapshot || 0),
      phi_huy: Number(ketQua.phi_huy || 0),
      tien_coc_hoan_lai: Number(ketQua.tien_coc_hoan_lai || 0),
    };
  }
}

module.exports = CustomerOrderModel;