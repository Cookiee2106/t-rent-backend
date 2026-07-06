const {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
} = require("./adminService");

// Lấy danh sách hồ sơ xác minh
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

// Lấy chi tiết hồ sơ xác minh
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

// Duyệt hồ sơ xác minh
async function duyetHoSoXacMinh(req, res) {
  try {
    const hoSo = await duyetHoSoXacMinhService(
      req.params.id,
      req.nguoiDung.id
    );

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

// Từ chối hồ sơ xác minh
async function tuChoiHoSoXacMinh(req, res) {
  try {
    const { ly_do_tu_choi } = req.body;

    const hoSo = await tuChoiHoSoXacMinhService(
      req.params.id,
      req.nguoiDung.id,
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

module.exports = {
  layDanhSachHoSoXacMinh,
  layChiTietHoSoXacMinh,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
};