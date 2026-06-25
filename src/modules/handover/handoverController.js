const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const handoverService = require("./handoverService");

// ============================================================
// API #11: Upload ảnh bàn giao
// ============================================================
const uploadHandoverImages = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const files = req.files;
  const body_image_urls = req.body.danh_sach_anh_url;

  const ket_qua = await handoverService.uploadHandoverImages(
    don_thue_id,
    files,
    body_image_urls
  );

  return successResponse(res, 200, "Upload ảnh bàn giao thành công", ket_qua);
});

// ============================================================
// API #12: Lập phiếu bàn giao
// ============================================================
const createHandover = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;

  const ket_qua = await handoverService.createHandover(don_thue_id, nhan_vien_id, req.body);

  return successResponse(res, 201, "Lập phiếu bàn giao thành công", ket_qua);
});

module.exports = {
  uploadHandoverImages,
  createHandover,
};
