const {
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
  capNhatTrangThaiKhachHangService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
} = require("./adminService");

function guiLoi(res, loi) {
  return res.status(400).json({
    success: false,
    message: loi.message,
  });
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
    guiLoi(res, loi);
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
    guiLoi(res, loi);
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
    guiLoi(res, loi);
  }
}

async function duyetHoSoXacMinh(req, res) {
  try {
    const khachHang = await duyetHoSoXacMinhService(
      req.params.id,
      req.nguoiDung.id
    );

    res.json({
      success: true,
      message: "Duyệt hồ sơ xác minh thành công",
      data: khachHang,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function tuChoiHoSoXacMinh(req, res) {
  try {
    const khachHang = await tuChoiHoSoXacMinhService(
      req.params.id,
      req.nguoiDung.id,
      req.body.ly_do_tu_choi
    );

    res.json({
      success: true,
      message: "Từ chối hồ sơ xác minh thành công",
      data: khachHang,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachKhachHang,
  layChiTietKhachHang,
  capNhatTrangThaiKhachHang,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
};