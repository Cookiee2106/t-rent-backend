const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const rentalTermService = require("./rentalTermService");

const getCurrentTerms = asyncHandler(async (req, res) => {
  const terms = await rentalTermService.getCurrentTerms();
  return successResponse(res, 200, "Lấy điều khoản thuê thành công", terms);
});

const acceptTerms = asyncHandler(async (req, res) => {
  const { termsId, termsVersion } = req.body;

  if (!termsId || !termsVersion) {
    return errorResponse(res, 400, "Vui lòng cung cấp termsId và termsVersion");
  }

  const result = await rentalTermService.acceptTerms(req.user.id, termsId, termsVersion);

  const message = result.alreadyAccepted
    ? "Bạn đã chấp nhận điều khoản này trước đó"
    : result.message;

  return successResponse(res, 200, message, {
    termsAcceptanceId: result.termsAcceptanceId,
    alreadyAccepted: result.alreadyAccepted,
  });
});

module.exports = {
  getCurrentTerms,
  acceptTerms,
};
