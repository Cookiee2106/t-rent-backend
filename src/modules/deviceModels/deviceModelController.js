const asyncHandler = require("../../utils/asyncHandler");
const { successResponse } = require("../../utils/response");
const deviceModelService = require("./deviceModelService");

// ============================================================
// Lấy danh sách mẫu thiết bị (chỉ HOAT_DONG)
// ============================================================
const getDeviceModels = asyncHandler(async (req, res) => {
  const { trang, gioi_han, tu_khoa, hang_id, danh_muc_id, ten_hang, ten_danh_muc } = req.query;

  const ket_qua = await deviceModelService.getDeviceModels({
    trang: parseInt(trang) || 1,
    gioi_han: parseInt(gioi_han) || 20,
    tu_khoa: tu_khoa || undefined,
    hang_id: hang_id || undefined,
    danh_muc_id: danh_muc_id || undefined,
    ten_hang: ten_hang || undefined,
    ten_danh_muc: ten_danh_muc || undefined,
  });

  return successResponse(res, 200, "Lấy danh sách mẫu thiết bị thành công", ket_qua.danh_sach, {
    phan_trang: ket_qua.phan_trang,
  });
});

// ============================================================
// Lấy chi tiết mẫu thiết bị (chỉ HOAT_DONG)
// ============================================================
const getDeviceModelDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const mau_thiet_bi = await deviceModelService.getDeviceModelDetail(id);

  return successResponse(res, 200, "Lấy chi tiết mẫu thiết bị thành công", mau_thiet_bi);
});

module.exports = {
  getDeviceModels,
  getDeviceModelDetail,
};
