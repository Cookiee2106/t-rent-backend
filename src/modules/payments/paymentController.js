const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const paymentService = require("./paymentService");

// ============================================================
// HELPER: Kiểm tra field không hợp lệ trong body
// ============================================================
function co_field_khong_hop_le(body, cac_field_cho_phep) {
  const cac_field_trong_body = Object.keys(body || {});
  return cac_field_trong_body.some((field) => !cac_field_cho_phep.includes(field));
}

// ============================================================
// POST /api/payments/vnpay/create-payment-url
// ============================================================
const taoUrlThanhToan = asyncHandler(async (req, res) => {
  const { phien_thanh_toan_id } = req.body;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["phien_thanh_toan_id"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  if (!phien_thanh_toan_id) {
    return errorResponse(res, 400, "Vui lòng cung cấp phiên thanh toán");
  }

  const ip_client = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "127.0.0.1";

  const ket_qua = await paymentService.taoUrlThanhToanVnpay(
    req.user.id,
    phien_thanh_toan_id,
    ip_client
  );

  return successResponse(res, 200, "Tạo URL thanh toán thành công", ket_qua);
});

// ============================================================
// GET /api/payments/vnpay/return
// ============================================================
const xuLyTraVe = asyncHandler(async (req, res) => {
  const query = req.query;

  const hop_le = paymentService.verifyReturnUrl(query);
  if (!hop_le) {
    return errorResponse(res, 400, "Dữ liệu không hợp lệ, chữ ký không đúng");
  }

  const ket_qua = await paymentService.xuLyTraVeVnpay(query);

  if (ket_qua.thanh_cong) {
    return successResponse(res, 200, "Thanh toán thành công", ket_qua);
  }

  return successResponse(res, 200, "Thanh toán thất bại", ket_qua);
});

// ============================================================
// GET /api/payments/vnpay/ipn
// ============================================================
const xuLyIpn = asyncHandler(async (req, res) => {
  const query = req.query;

  const ket_qua = await paymentService.xuLyIpnVnpay(query);

  if (ket_qua.RspCode === "00") {
    return res.status(200).json(ket_qua);
  }

  return res.status(400).json(ket_qua);
});

// ============================================================
// GET /api/payments/vnpay/test-simulate-ipn
// Test: simulate IPN thành công - Không cần VNPAY thật
// ============================================================
const simulateIpnThanhCong = asyncHandler(async (req, res) => {
  const { thanh_toan_id } = req.query;

  if (process.env.NODE_ENV === "production") {
    return errorResponse(res, 403, "Hàm chỉ khả dụng trong môi trường test");
  }

  if (!thanh_toan_id) {
    return errorResponse(res, 400, "Vui lòng cung cấp thanh toán");
  }

  const ket_qua = await paymentService.simulateIpnThanhCong(req.user.id, thanh_toan_id);

  // Neu co loi thi tra ve loi
  if (ket_qua.loi) {
    return errorResponse(res, 400, ket_qua.loi, ket_qua);
  }

  // Neu da xu ly truoc do
  if (ket_qua.da_xu_ly_truoc_do) {
    return successResponse(res, 200, "Thanh toán đã được xử lý trước đó", ket_qua);
  }

  // Xu ly thanh cong
  return successResponse(res, 200, "Mô phỏng thanh toán thành công", ket_qua);
});

module.exports = {
  taoUrlThanhToan,
  xuLyTraVe,
  xuLyIpn,
  simulateIpnThanhCong,
};
