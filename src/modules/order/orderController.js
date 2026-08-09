const {
  layDanhSachDonThueService,
  layChiTietDonThueService,
  layThietBiSanSangService,
  lapPhieuBanGiaoService,
  layChinhSachThueService,
  capNhatChinhSachThueService,
  xacNhanYeuCauHuyService,
  tuChoiYeuCauHuyService,
} = require("../../models/AdminOrderModel");

async function layChinhSachThue(req, res) {
  try {
    const data = await layChinhSachThueService();

    res.json({
      success: true,
      message: "Lấy chính sách thuê thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function capNhatChinhSachThue(req, res) {
  try {
    const data = await capNhatChinhSachThueService(
      req.nguoiDung.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật phí hủy đơn thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function xacNhanYeuCauHuy(req, res) {
  try {
    const data = await xacNhanYeuCauHuyService(
      req.nguoiDung.id,
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Xác nhận hủy đơn thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function tuChoiYeuCauHuy(req, res) {
  try {
    const data = await tuChoiYeuCauHuyService(
      req.nguoiDung.id,
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Từ chối yêu cầu hủy thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}


async function layDanhSachDonThue(req, res) {
  try {
    const ketQua = await layDanhSachDonThueService({
      trang_thai: req.query.trang_thai,
      tu_khoa: req.query.tu_khoa,
      yeu_cau_huy: req.query.yeu_cau_huy,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      message: "Lấy danh sách đơn thuê thành công",
      ...ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietDonThue(req, res) {
  try {
    const data = await layChiTietDonThueService(req.params.id);

    res.json({
      success: true,
      message: "Lấy chi tiết đơn thuê thành công",
      data,
    });
  } catch (loi) {
    res.status(404).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layThietBiSanSang(req, res) {
  try {
    const data = await layThietBiSanSangService({
      mau_thiet_bi_id: req.query.mau_thiet_bi_id,
      ngay_nhan: req.query.ngay_nhan,
      ngay_tra: req.query.ngay_tra,
    });

    res.json({
      success: true,
      message: "Lấy danh sách thiết bị khả dụng thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function lapPhieuBanGiao(req, res) {
  try {
    const ketQua = await lapPhieuBanGiaoService(
      req.nguoiDung.id,
      req.params.id,
      {
        ghi_chu_ban_giao: req.body.ghi_chu_ban_giao,
        vat_pham: req.body.vat_pham,
      },
      req.files
    );

    res.json({
      success: true,
      message: ketQua.message,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  layChinhSachThue,
  capNhatChinhSachThue,
  xacNhanYeuCauHuy,
  tuChoiYeuCauHuy,
  layDanhSachDonThue,
  layChiTietDonThue,
  layThietBiSanSang,
  lapPhieuBanGiao,
};
