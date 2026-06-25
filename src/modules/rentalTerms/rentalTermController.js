const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const rentalTermService = require("./rentalTermService");

// ============================================================
// HELPER: Kiểm tra field không hợp lệ trong body
// ============================================================
function co_field_khong_hop_le(body, cac_field_cho_phep) {
  const cac_field_trong_body = Object.keys(body || {});
  return cac_field_trong_body.some((field) => !cac_field_cho_phep.includes(field));
}

// ============================================================
// Lấy điều khoản thuê hiện hành (public)
// ============================================================
const getCurrentTerms = asyncHandler(async (req, res) => {
  const dieu_khoan = await rentalTermService.getCurrentTerms();
  return successResponse(res, 200, "Lấy điều khoản thuê thành công", dieu_khoan);
});

// ============================================================
// Chấp nhận điều khoản thuê (chỉ KHACH_HANG)
// ============================================================
const acceptTerms = asyncHandler(async (req, res) => {
  const { dieu_khoan_id, phien_ban } = req.body;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["dieu_khoan_id", "phien_ban"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  if (!dieu_khoan_id || !phien_ban) {
    return errorResponse(res, 400, "Vui lòng cung cấp đầy đủ thông tin");
  }

  // Lay IP address va User-Agent de audit
  const ip_address = req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"];
  const user_agent = req.headers["user-agent"];

  const ket_qua = await rentalTermService.acceptTerms(
    req.user.id,
    dieu_khoan_id,
    phien_ban,
    ip_address,
    user_agent
  );

  return successResponse(res, 200, "Chấp nhận điều khoản thuê thành công", ket_qua);
});

module.exports = {
  getCurrentTerms,
  acceptTerms,
};
