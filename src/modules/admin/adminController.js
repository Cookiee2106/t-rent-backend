const {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
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

module.exports = {
  layDanhSachHoSoXacMinh,
  layChiTietHoSoXacMinh,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
  layDanhSachKhachHang,
  layChiTietKhachHang,
};