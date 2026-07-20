const CustomerOrderModel = require("../../models/CustomerOrderModel");
const customerOrderRepository = require("../../repositories/customerOrderRepository");

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

async function layDanhSachDonCuaToiService(nguoiDungId) {
  await customerOrderRepository.capNhatDonQuaHanCuaKhach(nguoiDungId);

  const danhSach = await customerOrderRepository.layDanhSachDonCuaKhach(
    nguoiDungId
  );

  return danhSach.map((don) => new CustomerOrderModel(don));
}

async function layChiTietDonCuaToiService(nguoiDungId, donThueId) {
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

async function huyDonCuaToiService(nguoiDungId, donThueId, body) {
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

module.exports = {
  layDanhSachDonCuaToiService,
  layChiTietDonCuaToiService,
  huyDonCuaToiService,
};
