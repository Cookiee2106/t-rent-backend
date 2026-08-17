const {
  layDanhSachThanhLyService,
  layChiTietThanhLyService,
  lapPhieuTraService,
} = require("../../models/SettlementModel");

async function layDanhSachThanhLy(req, res) {
  try {
    const ketQua = await layDanhSachThanhLyService({
      trang_thai: req.query.trang_thai,
      tu_khoa: req.query.tu_khoa,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.json({
      success: true,
      message: "Lấy danh sách thanh lý thành công",
      ...ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietThanhLy(req, res) {
  try {
    const data = await layChiTietThanhLyService(req.params.orderId);

    res.json({
      success: true,
      message: "Lấy chi tiết thanh lý thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function lapPhieuTra(req, res) {
  try {
    const data = await lapPhieuTraService(
      req.nguoiDung.id,
      req.params.orderId,
      req.body || {},
      req.files || []
    );

    res.json({
      success: true,
      message: data.message || "Lập phiếu trả/thanh lý thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,
};
