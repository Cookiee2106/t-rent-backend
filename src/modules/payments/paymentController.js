const {
  layXacNhanThueService,
  taoPhienThanhToanCocService,
  layTrangThaiPhienThanhToanService,
  xuLyReturnVnpayService,
} = require("../../models/PaymentSessionModel");

function guiLoi(res, loi) {
  res.status(400).json({
    success: false,
    message: loi.message,
  });
}

// POST /api/cart/checkout/preview
async function layXacNhanThue(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const ketQua = await layXacNhanThueService(
      nguoiDungId,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Kiểm tra thông tin thuê thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

// POST /api/cart/checkout
async function taoPhienThanhToanCoc(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const ketQua = await taoPhienThanhToanCocService(
      nguoiDungId,
      req.body || {},
      req.ip
    );

    res.json({
      success: true,
      message: "Tạo phiên thanh toán cọc thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

// GET /api/payment-sessions/:id
async function layTrangThaiPhienThanhToan(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const ketQua = await layTrangThaiPhienThanhToanService(
      nguoiDungId,
      req.params.id
    );

    res.json({
      success: true,
      message: "Lấy trạng thái phiên thanh toán thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

// GET /api/payment-return/vnpay
async function nhanReturnVnpay(req, res) {
  try {
    console.log("===== VNPay Return Query =====");
    console.log(req.query);
    console.log("==============================");

    const urlRedirect = await xuLyReturnVnpayService(req.query);

    console.log("Redirect về FE:");
    console.log(urlRedirect);

    res.redirect(urlRedirect);
  } catch (loi) {
    console.log("Lỗi VNPay return:");
    console.log(loi.message);

    const feUrl =
      process.env.FE_PAYMENT_RESULT_URL ||
      "http://localhost:5173/payment-result";

    res.redirect(
      `${feUrl}?success=false&message=${encodeURIComponent(loi.message)}`
    );
  }
}

module.exports = {
  layXacNhanThue,
  taoPhienThanhToanCoc,
  layTrangThaiPhienThanhToan,
  nhanReturnVnpay,
};
