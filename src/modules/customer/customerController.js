const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const customerService = require("./customerService");

// ============================================================
// HELPER: Kiểm tra field không hợp lệ trong body
// ============================================================
function co_field_khong_hop_le(body, cac_field_cho_phep) {
  const cac_field_trong_body = Object.keys(body || {});
  return cac_field_trong_body.some((field) => !cac_field_cho_phep.includes(field));
}

// ============================================================
// Người 1: Lấy thông tin tài khoản
// ============================================================
const getAccount = asyncHandler(async (req, res) => {
  const tai_khoan = await customerService.getCustomerAccount(req.user.id);
  return successResponse(res, 200, "Lấy thông tin tài khoản thành công", tai_khoan);
});

// ============================================================
// Người 1: Cập nhật hồ sơ
// ============================================================
const updateProfile = asyncHandler(async (req, res) => {
  const { dia_chi, so_cccd } = req.body;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["dia_chi", "so_cccd"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  if (!dia_chi && !so_cccd) {
    return errorResponse(res, 400, "Vui lòng cung cấp thông tin cần cập nhật");
  }

  const ho_so_da_cap_nhat = await customerService.updateCustomerProfile(req.user.id, {
    dia_chi,
    so_cccd,
  });

  return successResponse(res, 200, "Cập nhật hồ sơ thành công", ho_so_da_cap_nhat);
});

// ============================================================
// Người 1: Gửi hồ sơ xác minh
// ============================================================
const submitVerification = asyncHandler(async (req, res) => {
  const { so_cccd } = req.body;
  const files = req.files;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["so_cccd"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  const ket_qua = await customerService.submitVerification(req.user.id, files, so_cccd);

  return successResponse(res, 201, "Gửi hồ sơ xác minh thành công, đang chờ duyệt", ket_qua);
});

module.exports = {
  getAccount,
  updateProfile,
  submitVerification,
};
