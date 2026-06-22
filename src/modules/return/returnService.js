const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

async function getLiquidationsList(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const where = {};

  if (filters.status === "PENDING_RETURN") {
    where.status = "RENTING";
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.keyword) {
    where.OR = [
      { order_code: { contains: filters.keyword, mode: "insensitive" } },
      { customer_profiles: { users: { full_name: { contains: filters.keyword, mode: "insensitive" } } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.rental_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
      include: {
        customer_profiles: {
          select: {
            id: true,
            users: { select: { id: true, full_name: true, email: true, phone: true } },
          },
        },
        rental_order_items: {
          include: {
            product_models: { select: { id: true, name: true, image_url: true } },
          },
        },
        return_records: {
          include: { return_charges: true },
        },
      },
    }),
    prisma.rental_orders.count({ where }),
  ]);

  return {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getLiquidationDetail(orderId) {
  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: {
      customer_profiles: {
        select: {
          id: true, address: true, identity_number: true,
          users: { select: { id: true, full_name: true, email: true, phone: true } },
        },
      },
      rental_order_items: {
        include: {
          product_models: {
            select: { id: true, name: true, image_url: true, daily_price: true, deposit_amount: true },
          },
          rental_order_assets: { include: { identified_assets: true } },
        },
      },
      handover_records: {
        include: {
          users: { select: { full_name: true } },
          handover_record_details: true,
          rental_record_files: { where: { file_purpose: "HANDOVER_IMAGE" } },
        },
      },
      return_records: {
        include: {
          users: { select: { full_name: true } },
          return_record_details: {
            include: {
              rental_order_assets: { include: { identified_assets: true } },
            },
          },
          return_charges: true,
          rental_record_files: { where: { file_purpose: "RETURN_IMAGE" } },
          payments_return_records_refund_payment_idTopayments: {
            select: { id: true, amount: true, status: true, transaction_code: true, paid_at: true },
          },
          payments_return_records_deduction_payment_idTopayments: {
            select: { id: true, amount: true, status: true, transaction_code: true, paid_at: true },
          },
        },
      },
      payments: true,
      rental_contracts: { include: { contract_files: true } },
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  return order;
}

async function uploadReturnImages(orderId, staffId, files, bodyImageUrls) {
  const order = await prisma.rental_orders.findUnique({ where: { id: orderId } });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  const uploaded = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer, "t-rent/return", "image");
      uploaded.push({
        fileUrl: result.secure_url,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      });
    }
  }

  if (bodyImageUrls && bodyImageUrls.length > 0) {
    for (const url of bodyImageUrls) {
      uploaded.push({
        fileUrl: typeof url === "string" ? url : url.fileUrl,
        originalName: typeof url === "string" ? "return-image" : url.originalName || "return-image",
        fileType: typeof url === "string" ? null : url.fileType || null,
        fileSize: typeof url === "string" ? null : url.fileSize || null,
      });
    }
  }

  if (uploaded.length === 0) {
    const error = new Error("Vui lòng upload ít nhất 1 ảnh hoặc cung cấp URL ảnh");
    error.statusCode = 400;
    throw error;
  }

  return { images: uploaded };
}

async function createReturnInspection(orderId, staffId, data) {
  const { assets, imageUrls, note, result } = data;

  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: {
      rental_order_items: { include: { rental_order_assets: true } },
      return_records: true,
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  console.log("[DEBUG] createReturnInspection order.status:", order.status, "| id:", order.id, "| code:", order.order_code);

  if (order.status !== "RENTING") {
    const error = new Error("Đơn hàng phải ở trạng thái RENTING để thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (order.return_records) {
    const error = new Error("Đơn hàng này đã được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (!assets || assets.length === 0) {
    const error = new Error("Vui lòng cung cấp thông tin tài sản kiểm tra");
    error.statusCode = 400;
    throw error;
  }

  const allAssetIds = assets.map((a) => a.rental_order_asset_id);
  const orderAssets = await prisma.rental_order_assets.findMany({
    where: { id: { in: allAssetIds }, rental_order_id: orderId },
    include: { identified_assets: true },
  });

  if (orderAssets.length !== allAssetIds.length) {
    const error = new Error("Một số tài sản không thuộc đơn hàng này");
    error.statusCode = 400;
    throw error;
  }

  const dbResult = await prisma.$transaction(async (tx) => {
    const returnRecord = await tx.return_records.create({
      data: {
        rental_order_id: orderId,
        staff_id: staffId,
        returned_at: new Date(),
        result: result || "VALID",
        note: note || null,
      },
    });

    const details = [];
    for (const item of assets) {
      const orderAsset = orderAssets.find((a) => a.id === item.rental_order_asset_id);
      const isDamaged = item.is_damaged || false;
      const isMissing = item.is_missing || false;

      const detail = await tx.return_record_details.create({
        data: {
          return_record_id: returnRecord.id,
          rental_order_id: orderId,
          rental_order_asset_id: item.rental_order_asset_id,
          returned_quantity: isMissing ? 0 : 1,
          damaged_quantity: isDamaged ? 1 : 0,
          missing_quantity: isMissing ? 1 : 0,
          condition_note: item.condition_note || null,
          is_damaged: isDamaged,
          is_missing: isMissing,
          note: item.note || null,
        },
      });
      details.push(detail);

      await tx.rental_order_assets.update({
        where: { id: item.rental_order_asset_id },
        data: { condition_after: item.condition_note || null },
      });

      let newStatus = "AVAILABLE";
      let movementType = "RETURN";

      if (isMissing) {
        newStatus = "LOST";
        movementType = "LOST";
      } else if (isDamaged) {
        newStatus = "MAINTENANCE";
        movementType = "MAINTENANCE";
      }

      await tx.identified_assets.update({
        where: { id: orderAsset.asset_id },
        data: { status: newStatus, rental_count: { increment: isMissing ? 0 : 1 } },
      });

      await tx.asset_movements.create({
        data: {
          asset_id: orderAsset.asset_id,
          to_location_id: orderAsset.identified_assets.current_location_id,
          status_before: "RENTED",
          status_after: newStatus,
          movement_type: movementType,
          related_order_id: orderId,
          note: isMissing
            ? `Mất tài sản khi thanh lý đơn ${order.order_code}`
            : isDamaged
              ? `Hư hỏng khi thanh lý đơn ${order.order_code}`
              : `Trả về từ đơn ${order.order_code}`,
          created_by: staffId,
        },
      });
    }

    await tx.rental_orders.update({
      where: { id: orderId },
      data: { status: "COMPLETED", updated_at: new Date() },
    });

    await tx.rental_order_items.updateMany({
      where: { rental_order_id: orderId },
      data: { status: "RETURNED", updated_at: new Date() },
    });

    if (imageUrls && imageUrls.length > 0) {
      for (const img of imageUrls) {
        await tx.rental_record_files.create({
          data: {
            rental_order_id: orderId,
            return_record_id: returnRecord.id,
            file_purpose: "RETURN_IMAGE",
            original_file_name: img.originalName || "return-image",
            file_url: img.fileUrl,
            file_type: img.fileType || null,
            file_size: img.fileSize || null,
            uploaded_by: staffId,
          },
        });
      }
    }

    return { returnRecordId: returnRecord.id, detailCount: details.length };
  });

  return dbResult;
}

async function processRefundDeposit(orderId, staffId, data) {
  const { amount, transactionCode, note } = data;

  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: { return_records: true },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  if (!order.return_records) {
    const error = new Error("Đơn hàng chưa được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (order.return_records.deposit_result === "REFUNDED") {
    const error = new Error("Tiền cọc đã được hoàn trả");
    error.statusCode = 400;
    throw error;
  }

  const dbResult = await prisma.$transaction(async (tx) => {
    const payment = await tx.payments.create({
      data: {
        rental_order_id: orderId,
        payment_type: "REFUND_DEPOSIT",
        amount: amount || order.total_deposit_amount,
        method: "CASH",
        status: "PAID",
        transaction_code: transactionCode || null,
        paid_by: staffId,
        paid_at: new Date(),
        note: note || null,
      },
    });

    await tx.return_records.update({
      where: { rental_order_id: orderId },
      data: {
        deposit_result: "REFUNDED",
        refund_amount: amount || order.total_deposit_amount,
        refund_payment_id: payment.id,
      },
    });

    return { paymentId: payment.id, refundAmount: Number(amount || order.total_deposit_amount) };
  });

  return dbResult;
}

async function processDeductDeposit(orderId, staffId, data) {
  const { charges, transactionCode, note } = data;

  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: { return_records: true },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  if (!order.return_records) {
    const error = new Error("Đơn hàng chưa được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (!charges || charges.length === 0) {
    const error = new Error("Vui lòng cung cấp thông tin khấu trừ");
    error.statusCode = 400;
    throw error;
  }

  const totalDeduction = charges.reduce((sum, c) => sum + Number(c.amount), 0);

  const dbResult = await prisma.$transaction(async (tx) => {
    const payment = await tx.payments.create({
      data: {
        rental_order_id: orderId,
        payment_type: "DEDUCTION",
        amount: totalDeduction,
        method: "CASH",
        status: "PAID",
        transaction_code: transactionCode || null,
        paid_by: staffId,
        paid_at: new Date(),
        note: note || null,
      },
    });

    for (const charge of charges) {
      await tx.return_charges.create({
        data: {
          return_record_id: order.return_records.id,
          return_record_detail_id: charge.return_record_detail_id || null,
          charge_type: charge.charge_type || "DAMAGE",
          description: charge.description || null,
          amount: charge.amount,
          created_by: staffId,
        },
      });
    }

    await tx.return_records.update({
      where: { rental_order_id: orderId },
      data: {
        deposit_result: "DEDUCTED",
        deduction_amount: totalDeduction,
        deduction_payment_id: payment.id,
      },
    });

    return { paymentId: payment.id, deductionAmount: totalDeduction, chargeCount: charges.length };
  });

  return dbResult;
}

async function createMaintenanceRecord(orderId, staffId, data) {
  const { assetId, rentalOrderAssetId, reason, note } = data;

  const order = await prisma.rental_orders.findUnique({ where: { id: orderId } });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  const asset = await prisma.identified_assets.findUnique({ where: { id: assetId } });

  if (!asset) {
    const error = new Error("Không tìm thấy tài sản");
    error.statusCode = 404;
    throw error;
  }

  const orderAsset = await prisma.rental_order_assets.findUnique({
    where: { id: rentalOrderAssetId },
  });

  const dbResult = await prisma.$transaction(async (tx) => {
    const maintenance = await tx.maintenance_records.create({
      data: {
        asset_id: assetId,
        rental_order_id: orderId,
        rental_order_item_id: orderAsset?.rental_order_item_id || null,
        reason: reason || "Hư hỏng sau khi thuê",
        status: "IN_PROGRESS",
        started_by: staffId,
        started_at: new Date(),
        note: note || null,
      },
    });

    await tx.identified_assets.update({
      where: { id: assetId },
      data: { status: "MAINTENANCE" },
    });

    await tx.asset_movements.create({
      data: {
        asset_id: assetId,
        status_before: asset.status,
        status_after: "MAINTENANCE",
        movement_type: "MAINTENANCE",
        related_order_id: orderId,
        note: `Tạo phiếu bảo trì cho tài sản: ${reason || "Hư hỏng sau khi thuê"}`,
        created_by: staffId,
      },
    });

    return { maintenanceId: maintenance.id, assetId, status: "IN_PROGRESS" };
  });

  return dbResult;
}

module.exports = {
  getLiquidationsList,
  getLiquidationDetail,
  uploadReturnImages,
  createReturnInspection,
  processRefundDeposit,
  processDeductDeposit,
  createMaintenanceRecord,
};
