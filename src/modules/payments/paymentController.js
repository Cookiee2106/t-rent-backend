const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const paymentService = require("./paymentService");
const { verifyReturnUrl } = require("../../utils/vnpay");

const createPaymentUrl = asyncHandler(async (req, res) => {
  const { checkoutSessionId } = req.body;

  if (!checkoutSessionId) {
    return errorResponse(res, 400, "Vui lòng cung cấp checkout_session_id");
  }

  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "127.0.0.1";

  const result = await paymentService.createVnpayPaymentUrl(req.user.id, checkoutSessionId, clientIp);

  return successResponse(res, 200, "Tạo URL thanh toán thành công", result);
});

const handleReturn = asyncHandler(async (req, res) => {
  const query = req.query;

  const isValid = verifyReturnUrl(query);
  if (!isValid) {
    return errorResponse(res, 400, "Dữ liệu không hợp lệ, chữ ký không đúng");
  }

  const result = await paymentService.handleVnpayReturn(query);

  if (result.isSuccess) {
    return successResponse(res, 200, "Thanh toán thành công", result);
  }

  return successResponse(res, 200, "Thanh toán thất bại", result);
});

const handleIpn = asyncHandler(async (req, res) => {
  const query = req.query;

  const result = await paymentService.handleVnpayIpn(query);

  if (result.RspCode === "00") {
    return res.status(200).json(result);
  }

  return res.status(400).json(result);
});

/**
 * TEST ENDPOINT - Simulate VNPAY IPN Success
 * CHỈ DÙNG CHO TEST, KHÔNG DÙNG TRONG PRODUCTION
 */
const testSimulateIpnSuccess = asyncHandler(async (req, res) => {
  const { paymentId } = req.query;

  if (process.env.NODE_ENV === "production") {
    return errorResponse(res, 403, "Endpoint không khả dụng trong production");
  }

  if (!paymentId) {
    return errorResponse(res, 400, "Vui lòng cung cấp paymentId");
  }

  const result = await paymentService.testSimulateIpnSuccess(paymentId);

  if (result.RspCode === "00") {
    return successResponse(res, 200, "Simulate IPN success thành công", result);
  }

  return errorResponse(res, 400, "Simulate IPN thất bại", result);
});

module.exports = {
  createPaymentUrl,
  handleReturn,
  handleIpn,
  testSimulateIpnSuccess,
};
