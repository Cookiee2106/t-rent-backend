const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const customerService = require("./customerService");

const getAccount = asyncHandler(async (req, res) => {
  const account = await customerService.getCustomerAccount(req.user.id);
  return successResponse(res, 200, "Lấy thông tin tài khoản thành công", account);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { address, identityNumber } = req.body;

  const updated = await customerService.updateProfile(req.user.id, {
    address,
    identityNumber,
  });

  return successResponse(res, 200, "Cập nhật hồ sơ thành công", updated);
});

const submitVerification = asyncHandler(async (req, res) => {
  const { identityNumber } = req.body;
  const files = req.files;

  const result = await customerService.submitVerification(req.user.id, files, identityNumber);

  return successResponse(res, 201, "Gửi hồ sơ xác minh thành công, đang chờ duyệt", result);
});

module.exports = {
  getAccount,
  updateProfile,
  submitVerification,
};
