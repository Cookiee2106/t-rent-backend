const {
  layBaoCaoDoanhThuService,
  layBaoCaoTonKhoService,
  layDanhSachNhatKyThaoTacService,
  layChiTietNhatKyThaoTacService,
} = require("../../models/AdminReportLogModel");

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
    const ketQua = await layBaoCaoTonKhoService(req.query || {});

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
      message: "Lấy danh sách thao tác thành công",
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
      message: "Lấy chi tiết thao tác thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(404).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  layBaoCaoDoanhThu,
  layBaoCaoTonKho,
  layDanhSachNhatKyThaoTac,
  layChiTietNhatKyThaoTac,
};
