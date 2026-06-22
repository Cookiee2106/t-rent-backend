const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const adminService = require("./adminService");
const orderService = require("../rentalOrders/rentalOrders.service");
const contractsService = require("../contracts/contractsService");
const handoverService = require("../handover/handoverService");
const returnService = require("../return/returnService");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

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

const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, keyword } = req.query;
  const result = await orderService.getAdminOrders(
    parseInt(page) || 1,
    parseInt(limit) || 20,
    { status, keyword }
  );
  return successResponse(res, 200, "Lấy danh sách đơn hàng thành công", result.orders, {
    pagination: result.pagination,
  });
});

const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await orderService.getAdminOrderDetail(id);
  return successResponse(res, 200, "Lấy chi tiết đơn hàng thành công", order);
});

const getAvailableAssets = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await orderService.getAvailableAssets(id);
  return successResponse(res, 200, "Lấy danh sách tài sản sẵn sàng thành công", result);
});

const uploadContractFile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;

  const result = await contractsService.uploadContract(id, req.user.id, file);

  return successResponse(res, 201, "Tải lên hợp đồng thành công", result);
});

const uploadHandoverImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  const bodyImageUrls = req.body.imageUrls;

  const result = await handoverService.uploadHandoverImages(id, req.user.id, files, bodyImageUrls);

  return successResponse(res, 201, "Tải lên ảnh bàn giao thành công", result);
});

const createHandover = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  let { note, assets, imageUrls } = req.body;

  // Parse JSON strings từ multipart/form-data
  if (assets && typeof assets === "string") {
    try { assets = JSON.parse(assets); } catch (e) { assets = undefined; }
  }
  if (imageUrls && typeof imageUrls === "string") {
    try { imageUrls = JSON.parse(imageUrls); } catch (e) { imageUrls = undefined; }
  }

  // Nếu có file upload kèm trong API 13, upload lên Cloudinary và merge
  if (files && files.length > 0) {
    const uploaded = [];
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer, "t-rent/handover", "image");
      uploaded.push({
        fileUrl: result.secure_url,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      });
    }
    imageUrls = [...(imageUrls || []), ...uploaded];
  }

  const result = await handoverService.createHandover(id, req.user.id, { note, assets, imageUrls });

  return successResponse(res, 201, "Lập phiếu bàn giao thành công", result);
});

// ─── Giai đoạn 3: Thanh lý hợp đồng (Return / Contract Liquidation) ───

const getLiquidations = asyncHandler(async (req, res) => {
  const { page, limit, status, keyword } = req.query;
  const result = await returnService.getLiquidationsList(
    parseInt(page) || 1, parseInt(limit) || 20, { status, keyword }
  );
  return successResponse(res, 200, "Lấy danh sách thanh lý thành công", result.orders, {
    pagination: result.pagination,
  });
});

const getLiquidationDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await returnService.getLiquidationDetail(id);
  return successResponse(res, 200, "Lấy chi tiết thanh lý thành công", result);
});

const uploadReturnImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files;
  const bodyImageUrls = req.body.imageUrls;

  const result = await returnService.uploadReturnImages(id, req.user.id, files, bodyImageUrls);

  return successResponse(res, 201, "Tải lên ảnh trả hàng thành công", result);
});

const createReturnInspection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assets, imageUrls, note, result } = req.body;

  const returnResult = await returnService.createReturnInspection(id, req.user.id, {
    assets, imageUrls, note, result,
  });

  return successResponse(res, 201, "Tạo phiếu thanh lý thành công", returnResult);
});

const processRefundDeposit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, transactionCode, note } = req.body;

  const result = await returnService.processRefundDeposit(id, req.user.id, {
    amount, transactionCode, note,
  });

  return successResponse(res, 200, "Hoàn trả tiền cọc thành công", result);
});

const processDeductDeposit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { charges, transactionCode, note } = req.body;

  const result = await returnService.processDeductDeposit(id, req.user.id, {
    charges, transactionCode, note,
  });

  return successResponse(res, 200, "Khấu trừ tiền cọc thành công", result);
});

const createMaintenanceRecord = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assetId, rentalOrderAssetId, reason, note } = req.body;

  const result = await returnService.createMaintenanceRecord(id, req.user.id, {
    assetId, rentalOrderAssetId, reason, note,
  });

  return successResponse(res, 201, "Tạo phiếu bảo trì thành công", result);
});

module.exports = {
  getCustomerAccounts,
  getCustomerAccountDetail,
  approveVerification,
  rejectVerification,
  getOrders,
  getOrderDetail,
  getAvailableAssets,
  uploadContractFile,
  uploadHandoverImages,
  createHandover,
  getLiquidations,
  getLiquidationDetail,
  uploadReturnImages,
  createReturnInspection,
  processRefundDeposit,
  processDeductDeposit,
  createMaintenanceRecord,
};
