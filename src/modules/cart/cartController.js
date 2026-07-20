const {
  layGioHangService,
  themVaoGioHangService,
  capNhatSanPhamService,
  xoaSanPhamService,
} = require("./cartService");

function guiLoi(res, loi) {
  res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function layGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const gioHang = await layGioHangService(khachHangId);

    res.json({
      success: true,
      message: "Lấy giỏ hàng thành công",
      data: gioHang,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function themVaoGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const ketQua = await themVaoGioHangService(khachHangId, req.body);

    res.json({
      success: true,
      message: ketQua.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatSanPhamGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;

    const ketQua = await capNhatSanPhamService(khachHangId, itemId, req.body);

    res.json({
      success: true,
      message: ketQua.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaSanPhamGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;

    const ketQua = await xoaSanPhamService(khachHangId, itemId);

    res.json({
      success: true,
      message: ketQua.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layGioHang,
  themVaoGioHang,
  capNhatSanPhamGioHang,
  xoaSanPhamGioHang,
};
