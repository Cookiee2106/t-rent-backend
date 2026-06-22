const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const customerService = require("./customerService");
const orderService = require("../rentalOrders/rentalOrders.service");
const prisma = require("../../utils/prisma");

async function getCustomerProfile(userId) {
  const profile = await prisma.customer_profiles.findUnique({ where: { user_id: userId } });
  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }
  return profile;
}

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

const getOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const profile = await getCustomerProfile(req.user.id);
  const result = await orderService.getCustomerOrders(profile.id, parseInt(page) || 1, parseInt(limit) || 20);
  return successResponse(res, 200, "Lấy danh sách đơn hàng thành công", result.orders, { pagination: result.pagination });
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await getCustomerProfile(req.user.id);
  const order = await orderService.getCustomerOrderDetail(id, profile.id);
  return successResponse(res, 200, "Lấy chi tiết đơn hàng thành công", order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profile = await getCustomerProfile(req.user.id);
  const order = await orderService.cancelOrder(id, profile.id);
  return successResponse(res, 200, "Hủy đơn hàng thành công", order);
});

module.exports = {
  getAccount,
  updateProfile,
  submitVerification,
  getOrders,
  getOrderDetail,
  cancelOrder,
};
