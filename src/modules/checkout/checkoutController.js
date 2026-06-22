const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const checkoutService = require("./checkoutService");

const createCheckoutSession = asyncHandler(async (req, res) => {
  const { termsAcceptanceId, otpVerificationToken } = req.body;

  if (!termsAcceptanceId) {
    return errorResponse(res, 400, "Vui lòng chấp nhận điều khoản thuê trước");
  }

  if (!otpVerificationToken) {
    return errorResponse(res, 400, "Vui lòng xác thực OTP trước");
  }

  const result = await checkoutService.createCheckoutSession(req.user.id, {
    termsAcceptanceId,
    otpVerificationToken,
  });

  if (result.existingSession) {
    return successResponse(res, 200, result.message, {
      checkoutSessionId: result.checkoutSessionId,
      status: result.status,
      isExisting: true,
    });
  }

  return successResponse(res, 201, "Tạo phiên thanh toán thành công", {
    checkoutSessionId: result.checkoutSessionId,
    status: result.status,
    rentalAmount: result.rentalAmount,
    depositAmount: result.depositAmount,
    totalAmount: result.totalAmount,
    rentalDays: result.rentalDays,
    startDate: result.startDate,
    endDate: result.endDate,
    expiresAt: result.expiresAt,
    itemCount: result.itemCount,
  });
});

const getCheckoutSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await checkoutService.getCheckoutSession(req.user.id, id);

  return successResponse(res, 200, "Lấy chi tiết phiên thanh toán thành công", session);
});

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
};
