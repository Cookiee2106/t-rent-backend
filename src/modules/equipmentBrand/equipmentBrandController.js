const {
  layDanhSachHangThietBiService,
  layDanhSachHangDangHienThiService,
  taoHangThietBiService,
  capNhatHangThietBiService,
  capNhatTrangThaiHangThietBiService,
  xoaMemHangThietBiService,
} = require("../../models/EquipmentBrandModel");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy hãng thiết bị") {
    return res.status(404).json({
      success: false,
      message: loi.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function layDanhSachHangThietBi(req, res) {
  try {
    const data = await layDanhSachHangThietBiService();

    res.json({
      success: true,
      message: "Lấy danh sách hãng thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachHangDangHienThi(req, res) {
  try {
    const data = await layDanhSachHangDangHienThiService();

    res.json({
      success: true,
      message: "Lấy danh sách hãng thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoHangThietBi(req, res) {
  try {
    const data = await taoHangThietBiService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm hãng thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatHangThietBi(req, res) {
  try {
    const data = await capNhatHangThietBiService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật hãng thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiHangThietBi(req, res) {
  try {
    const data = await capNhatTrangThaiHangThietBiService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện hãng thiết bị thành công"
          : "Ẩn hãng thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaMemHangThietBi(req, res) {
  try {
    const data = await xoaMemHangThietBiService(req.params.id);

    res.json({
      success: true,
      message: data.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachHangThietBi,
  layDanhSachHangDangHienThi,
  taoHangThietBi,
  capNhatHangThietBi,
  capNhatTrangThaiHangThietBi,
  xoaMemHangThietBi,
};