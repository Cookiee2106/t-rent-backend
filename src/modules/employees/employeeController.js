const {
  layDanhSachNhanVienService,
  layChiTietNhanVienService,
  themNhanVienService,
  capNhatNhanVienService,
  capNhatTrangThaiNhanVienService,
  xoaMemNhanVienService,
} = require("../../models/EmployeeModel");

function guiLoi(res, loi) {
  return res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function layDanhSachNhanVien(req, res) {
  try {
    const data = await layDanhSachNhanVienService();

    res.json({
      success: true,
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layChiTietNhanVien(req, res) {
  try {
    const data = await layChiTietNhanVienService(req.params.id);

    res.json({
      success: true,
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function themNhanVien(req, res) {
  try {
    const data = await themNhanVienService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm nhân viên thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatNhanVien(req, res) {
  try {
    const data = await capNhatNhanVienService(req.params.id, req.body || {});

    res.json({
      success: true,
      message: "Cập nhật nhân viên thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiNhanVien(req, res) {
  try {
    const data = await capNhatTrangThaiNhanVienService(
      req.params.id,
      req.body.trang_thai
    );

    res.json({
      success: true,
      message: "Cập nhật trạng thái nhân viên thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaMemNhanVien(req, res) {
  try {
    const data = await xoaMemNhanVienService(req.params.id);

    res.json({
      success: true,
      message: "Xóa nhân viên thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachNhanVien,
  layChiTietNhanVien,
  themNhanVien,
  capNhatNhanVien,
  capNhatTrangThaiNhanVien,
  xoaMemNhanVien,
};