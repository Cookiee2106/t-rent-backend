const asyncHandler = require("../../utils/asyncHandler");
const { successResponse } = require("../../utils/response");
const adminService = require("./adminService");

// ============================================================
// Người 1: Lấy danh sách tài khoản khách hàng
// ============================================================
const getCustomerAccounts = asyncHandler(async (req, res) => {
  const { trang, gioi_han, tu_khoa, trang_thai_xac_minh } = req.query;

  const ket_qua = await adminService.getCustomerAccounts({
    trang: parseInt(trang) || 1,
    gioi_han: parseInt(gioi_han) || 20,
    tu_khoa: tu_khoa || undefined,
    trang_thai_xac_minh: trang_thai_xac_minh || undefined,
  });

  return successResponse(res, 200, "Lấy danh sách tài khoản khách hàng thành công", ket_qua.danh_sach, {
    phan_trang: ket_qua.phan_trang,
  });
});

// ============================================================
// Người 1: Lấy chi tiết tài khoản khách hàng
// ============================================================
const getCustomerAccountDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tai_khoan = await adminService.getCustomerAccountDetail(id);

  return successResponse(res, 200, "Lấy chi tiết tài khoản khách hàng thành công", tai_khoan);
});

// ============================================================
// Người 1: Duyệt hồ sơ xác minh
// ============================================================
const approveVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ket_qua = await adminService.approveVerification(id, req.user.id);

  return successResponse(res, 200, ket_qua.message, {
    trang_thai_xac_minh: ket_qua.trang_thai_xac_minh,
  });
});

// ============================================================
// Người 1: Từ chối hồ sơ xác minh
// ============================================================
const rejectVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ly_do_tu_choi } = req.body;

  const ket_qua = await adminService.rejectVerification(id, req.user.id, ly_do_tu_choi);

  return successResponse(res, 200, ket_qua.message, {
    trang_thai_xac_minh: ket_qua.trang_thai_xac_minh,
  });
});

module.exports = {
  getCustomerAccounts,
  getCustomerAccountDetail,
  approveVerification,
  rejectVerification,
};
