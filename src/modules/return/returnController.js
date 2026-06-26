const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const returnService = require("./returnService");

// ============================================================
// API #13: Danh sách thanh lý hợp đồng
// ============================================================
const getLiquidationsList = asyncHandler(async (req, res) => {
  const { trang, gioi_han, tu_khoa } = req.query;

  const ket_qua = await returnService.getLiquidationsList({
    trang: parseInt(trang) || 1,
    gioi_han: parseInt(gioi_han) || 20,
    tu_khoa: tu_khoa || undefined,
  });

  return successResponse(res, 200, "Lấy danh sách thanh lý thành công", ket_qua);
});

// ============================================================
// API #14: Chi tiết thanh lý hợp đồng
// ============================================================
const getLiquidationDetail = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const ket_qua = await returnService.getLiquidationDetail(don_thue_id);
  return successResponse(res, 200, "Lấy chi tiết thanh lý thành công", ket_qua);
});

// ============================================================
// API #15: Upload ảnh trả thiết bị
// ============================================================
const uploadReturnImages = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const files = req.files;
  const body_image_urls = req.body.danh_sach_anh_url;

  const ket_qua = await returnService.uploadReturnImages(
    don_thue_id,
    files,
    body_image_urls
  );

  return successResponse(res, 200, "Upload ảnh trả thiết bị thành công", ket_qua);
});

// ============================================================
// API #16: Lập phiếu trả / kiểm tra thiết bị
// ============================================================
const createReturnInspection = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;

  const ket_qua = await returnService.createReturnInspection(
    don_thue_id,
    nhan_vien_id,
    req.body
  );

  return successResponse(res, 201, "Lập phiếu trả thành công", ket_qua);
});

// ============================================================
// API #17: Hoàn cọc
// ============================================================
const processRefundDeposit = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;

  const ket_qua = await returnService.processRefundDeposit(
    don_thue_id,
    nhan_vien_id,
    req.body
  );

  return successResponse(res, 200, "Hoàn cọc thành công", ket_qua);
});

// ============================================================
// API #18: Khấu trừ cọc
// ============================================================
const processDeductDeposit = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;

  const ket_qua = await returnService.processDeductDeposit(
    don_thue_id,
    nhan_vien_id,
    req.body
  );

  return successResponse(res, 200, "Khấu trừ cọc thành công", ket_qua);
});

// ============================================================
// API #19: Tạo phiếu bảo trì
// ============================================================
const createMaintenanceRecord = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;

  const ket_qua = await returnService.createMaintenanceRecord(
    don_thue_id,
    nhan_vien_id,
    req.body
  );

  return successResponse(res, 201, "Tạo phiếu bảo trì thành công", ket_qua);
});

module.exports = {
  getLiquidationsList,
  getLiquidationDetail,
  uploadReturnImages,
  createReturnInspection,
  processRefundDeposit,
  processDeductDeposit,
  createMaintenanceRecord,
};
