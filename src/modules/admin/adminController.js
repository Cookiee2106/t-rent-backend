const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const adminService = require("./adminService");

const getCustomerAccounts = asyncHandler(async (req, res) => {
  const { page, limit, keyword, verificationStatus } = req.query;

  const result = await adminService.getCustomerAccounts({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    keyword,
    verificationStatus,
  });

  return successResponse(res, 200, "Lấy danh sách tài khoản khách hàng thành công", result.users, {
    pagination: result.pagination,
  });
});

const getCustomerAccountDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const account = await adminService.getCustomerAccountDetail(id);

  return successResponse(res, 200, "Lấy chi tiết tài khoản khách hàng thành công", account);
});

const approveVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await adminService.approveVerification(id, req.user.id);

  return successResponse(res, 200, result.message, {
    verificationStatus: result.verificationStatus,
  });
});

const rejectVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectReason } = req.body;

  const result = await adminService.rejectVerification(id, req.user.id, rejectReason);

  return successResponse(res, 200, result.message, {
    verificationStatus: result.verificationStatus,
  });
});

module.exports = {
  getCustomerAccounts,
  getCustomerAccountDetail,
  approveVerification,
  rejectVerification,
};
