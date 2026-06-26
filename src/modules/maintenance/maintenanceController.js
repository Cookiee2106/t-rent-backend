const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const maintenanceService = require("./maintenanceService");

const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filters = { keyword: req.query.keyword, status: req.query.status };

  const result = await maintenanceService.getMaintenanceRecords(page, limit, filters);

  return successResponse(res, 200, "Lấy danh sách bảo trì thành công", result.records, result.pagination);
});

const create = asyncHandler(async (req, res) => {
  const { assetId, reason, note } = req.body;
  const staffId = req.user.id;

  if (!assetId || !reason) {
    return errorResponse(res, 400, "assetId và reason là bắt buộc");
  }

  const record = await maintenanceService.createMaintenanceRecord(staffId, { assetId, reason, note });

  return successResponse(res, 201, "Tạo hồ sơ bảo trì thành công", record);
});

module.exports = { list, create };
