const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const contractsService = require("./contractsService");

// ============================================================
// API #10: Upload file hợp đồng giấy
// ============================================================
const uploadContract = asyncHandler(async (req, res) => {
  const don_thue_id = req.params.id;
  const nhan_vien_id = req.user.id;
  const file = req.file;

  if (!file) {
    return errorResponse(res, 400, "Vui lòng upload file hợp đồng");
  }

  const ket_qua = await contractsService.uploadContract(don_thue_id, nhan_vien_id, file);

  return successResponse(res, 201, "Upload hợp đồng thành công", ket_qua);
});

module.exports = {
  uploadContract,
};
