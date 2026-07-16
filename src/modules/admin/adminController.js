const {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
  capNhatTrangThaiKhachHangService,
  layBaoCaoDoanhThuService,
  layBaoCaoTonKhoService,
  layDanhSachNhatKyThaoTacService,
  layChiTietNhatKyThaoTacService,

  // XEM LỊCH SỬ HỒ SƠ XÁC MINH
  // layLichSuHoSoXacMinhService,

} = require("./adminService");

async function layDanhSachHoSoXacMinh(req, res) {
  try {
    const danhSachHoSo = await layDanhSachHoSoXacMinhService(req.query);
    res.json({
      success: true,
      message: "Lấy danh sách hồ sơ xác minh thành công",
      data: danhSachHoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}


async function layChiTietHoSoXacMinh(req, res) {
  try {
    const hoSo = await layChiTietHoSoXacMinhService(req.params.id);
    res.json({
      success: true,
      message: "Lấy chi tiết hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function duyetHoSoXacMinh(req, res) {
  try {
    const nguoiDuyetId = req.nguoiDung.id;
    const hoSo = await duyetHoSoXacMinhService(req.params.id, nguoiDuyetId);
    res.json({
      success: true,
      message: "Duyệt hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function tuChoiHoSoXacMinh(req, res) {
  try {
    const nguoiDuyetId = req.nguoiDung.id;
    const { ly_do_tu_choi } = req.body;
    const hoSo = await tuChoiHoSoXacMinhService(
      req.params.id,
      nguoiDuyetId,
      ly_do_tu_choi
    );
    res.json({
      success: true,
      message: "Từ chối hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layDanhSachKhachHang(req, res) {
  try {
    const danhSachKhachHang = await layDanhSachKhachHangService(req.query);
    res.json({
      success: true,
      message: "Lấy danh sách khách hàng thành công",
      data: danhSachKhachHang,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietKhachHang(req, res) {
  try {
    const khachHang = await layChiTietKhachHangService(req.params.id);
    res.json({
      success: true,
      message: "Lấy chi tiết khách hàng thành công",
      data: khachHang,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function capNhatTrangThaiKhachHang(req, res) {
  try {
    const khachHang = await capNhatTrangThaiKhachHangService(
      req.params.id,
      req.body.trang_thai
    );

    res.json({
      success: true,
      message: "Cập nhật trạng thái tài khoản khách hàng thành công",
      data: khachHang,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layBaoCaoDoanhThu(req, res) {
  try {
    const ketQua = await layBaoCaoDoanhThuService(req.query || {});
    res.json({
      success: true,
      message: "Lấy báo cáo doanh thu thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layBaoCaoTonKho(req, res) {
  try {
    const ketQua = await layBaoCaoTonKhoService();
    res.json({
      success: true,
      message: "Lấy báo cáo tồn kho thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layDanhSachNhatKyThaoTac(req, res) {
  try {
    const ketQua = await layDanhSachNhatKyThaoTacService(req.query || {});
    res.json({
      success: true,
      message: "Lấy danh sách nhật ký thao tác thành công",
      ...ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietNhatKyThaoTac(req, res) {
  try {
    const ketQua = await layChiTietNhatKyThaoTacService(req.params.id);
    res.json({
      success: true,
      message: "Lấy chi tiết nhật ký thao tác thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(404).json({
      success: false,
      message: loi.message,
    });
  }
}

/*
 XEM LỊCH SỬ HỒ SƠ XÁC MINH
*/

/*
async function layLichSuHoSoXacMinh(req, res) {
  try {
    const danhSachHoSo = await layLichSuHoSoXacMinhService(req.params.id);

    res.json({
      success: true,
      message: "Lấy lịch sử hồ sơ xác minh thành công",
      data: danhSachHoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}
*/

module.exports = {
  layDanhSachHoSoXacMinh,
  layChiTietHoSoXacMinh,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
  layDanhSachKhachHang,
  layChiTietKhachHang,
  capNhatTrangThaiKhachHang,
  layBaoCaoDoanhThu,
  layBaoCaoTonKho,
  layDanhSachNhatKyThaoTac,
  layChiTietNhatKyThaoTac,

  // LỊCH SỬ HỒ SƠ XÁC MINH
  // layLichSuHoSoXacMinh,
};
