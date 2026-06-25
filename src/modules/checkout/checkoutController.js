const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const checkoutService = require("./checkoutService");

// ============================================================
// HELPER: Kiểm tra field không hợp lệ trong body
// ============================================================
function co_field_khong_hop_le(body, cac_field_cho_phep) {
  const cac_field_trong_body = Object.keys(body || {});
  return cac_field_trong_body.some((field) => !cac_field_cho_phep.includes(field));
}

// ============================================================
// Tạo phiên thanh toán
// ============================================================
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { xac_nhan_dieu_khoan_id, xac_thuc_otp_id } = req.body;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["xac_nhan_dieu_khoan_id", "xac_thuc_otp_id"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  if (!xac_nhan_dieu_khoan_id || !xac_thuc_otp_id) {
    return errorResponse(res, 400, "Vui lòng cung cấp đầy đủ thông tin");
  }

  const ket_qua = await checkoutService.createCheckoutSession(req.user.id, {
    xac_nhan_dieu_khoan_id,
    xac_thuc_otp_id,
  });

  if (ket_qua.existingSession) {
    return successResponse(res, 200, ket_qua.message, {
      phien_thanh_toan_id: ket_qua.phien_thanh_toan_id,
      trang_thai: ket_qua.trang_thai,
      da_co_phien_cu: true,
    });
  }

  return successResponse(res, 201, "Tạo phiên thanh toán thành công", ket_qua);
});

// ============================================================
// Lấy chi tiết phiên thanh toán
// ============================================================
const getCheckoutSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ket_qua = await checkoutService.getCheckoutSession(req.user.id, id);

  return successResponse(res, 200, "Lấy phiên thanh toán thành công", ket_qua);
});

module.exports = { createCheckoutSession, getCheckoutSession };
