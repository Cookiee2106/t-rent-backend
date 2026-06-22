const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const cartService = require("./cartService");

const addCartItem = asyncHandler(async (req, res) => {
  const { productModelId, quantity, startDate, endDate } = req.body;

  if (!productModelId || !quantity || !startDate || !endDate) {
    return errorResponse(res, 400, "Vui lòng điền đầy đủ thông tin sản phẩm và ngày thuê");
  }

  const item = await cartService.addCartItem(req.user.id, {
    productModelId,
    quantity: parseInt(quantity),
    startDate,
    endDate,
  });

  return successResponse(res, 201, "Thêm sản phẩm vào giỏ hàng thành công", item);
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(req.user.id);

  return successResponse(res, 200, "Lấy giỏ hàng thành công", cart);
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await cartService.removeCartItem(req.user.id, id);

  return successResponse(res, 200, result.message);
});

module.exports = {
  addCartItem,
  getCart,
  removeCartItem,
};
