const {
  layPhienThanhToanService,
  xuLyWebhookThanhToanService,
} = require("./paymentService");

// GET /api/payment-sessions/:id
async function layPhienThanhToan(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const ketQua = await layPhienThanhToanService(khachHangId, req.params.id);

    res.json({
      success: true,
      message: "Lấy phiên thanh toán thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// POST /api/payment-webhooks
async function xuLyWebhookThanhToan(req, res) {
  try {
    const { id_su_kien, phien_thanh_toan_id } = req.body;
    const ketQua = await xuLyWebhookThanhToanService({
      id_su_kien,
      phien_thanh_toan_id,
      payload: req.body,
    });

    res.json({ success: true, message: ketQua.message, data: ketQua });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

module.exports = {
  layPhienThanhToan,
  xuLyWebhookThanhToan,
};
