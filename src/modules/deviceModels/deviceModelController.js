const asyncHandler = require("../../utils/asyncHandler");
const { successResponse } = require("../../utils/response");
const deviceModelService = require("./deviceModelService");

const getProductModels = asyncHandler(async (req, res) => {
  const { page, limit, keyword, category, brand } = req.query;

  const result = await deviceModelService.getProductModels({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    keyword,
    category,
    brand,
  });

  return successResponse(res, 200, "Lấy danh sách mẫu thiết bị thành công", result.productModels, {
    pagination: result.pagination,
  });
});

const getProductModelDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const productModel = await deviceModelService.getProductModelDetail(id);

  return successResponse(res, 200, "Lấy chi tiết mẫu thiết bị thành công", productModel);
});

module.exports = {
  getProductModels,
  getProductModelDetail,
};
