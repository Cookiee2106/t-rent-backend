const prisma = require("../../utils/prisma");

async function getMaintenanceRecords(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.keyword) {
    where.OR = [
      { identified_assets: { asset_code: { contains: filters.keyword } } },
      { reason: { contains: filters.keyword } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.maintenance_records.findMany({
      where,
      skip,
      take: limit,
      orderBy: { started_at: "desc" },
      include: {
        identified_assets: {
          select: { id: true, asset_code: true, asset_name: true, serial_number: true },
        },
        rental_orders: { select: { id: true, order_code: true } },
        users_maintenance_records_started_byTousers: {
          select: { full_name: true },
        },
      },
    }),
    prisma.maintenance_records.count({ where }),
  ]);

  return {
    records,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function createMaintenanceRecord(staffId, data) {
  const { assetId, reason, note } = data;

  if (!assetId || !reason) {
    const error = new Error("assetId và reason là bắt buộc");
    error.statusCode = 400;
    throw error;
  }

  const asset = await prisma.identified_assets.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    const error = new Error("Không tìm thấy tài sản");
    error.statusCode = 404;
    throw error;
  }

  const record = await prisma.maintenance_records.create({
    data: {
      asset_id: assetId,
      reason,
      status: "IN_PROGRESS",
      started_by: staffId,
      started_at: new Date(),
      note: note || "",
    },
  });

  await prisma.identified_assets.update({
    where: { id: assetId },
    data: { status: "MAINTENANCE" },
  });

  await prisma.asset_movements.create({
    data: {
      asset_id: assetId,
      movement_type: "MAINTENANCE",
      from_status: asset.status,
      to_status: "MAINTENANCE",
      notes: reason,
    },
  });

  return record;
}

module.exports = { getMaintenanceRecords, createMaintenanceRecord };
