const {
  layGioHangService,
  themVaoGioHangService,
  capNhatSanPhamService,
  xoaSanPhamService,
  datHangService,
} = require("./cartService");

// 1. Xem giỏ hàng
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
    res.status(400).json({ success: false, message: loi.message });
  }
}

// 2. Thêm sản phẩm vào giỏ
async function themVaoGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const ketQua = await themVaoGioHangService(khachHangId, req.body);

    res.json({ success: true, message: ketQua.message });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// 3. Cập nhật sản phẩm trong giỏ
async function capNhatSanPhamGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;
    const ketQua = await capNhatSanPhamService(khachHangId, itemId, req.body);

    res.json({ success: true, message: ketQua.message });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// 4. Xóa sản phẩm khỏi giỏ
async function xoaSanPhamGioHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;
    const ketQua = await xoaSanPhamService(khachHangId, itemId);

    res.json({ success: true, message: ketQua.message });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// 5. Đặt hàng (checkout)
async function datHang(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const ketQua = await datHangService(khachHangId, req.body);

    res.json({
      success: true,
      message: "Đặt hàng và tạo phiên thanh toán thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

module.exports = {
  layGioHang,
  themVaoGioHang,
  capNhatSanPhamGioHang,
  xoaSanPhamGioHang,
  datHang,
};
