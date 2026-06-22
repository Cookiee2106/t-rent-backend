const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

async function uploadHandoverImages(orderId, staffId, files, bodyImageUrls) {
  const order = await prisma.rental_orders.findUnique({ where: { id: orderId } });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  const uploaded = [];

  // 1. Nếu có file upload → upload lên Cloudinary
  if (files && files.length > 0) {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer, "t-rent/handover", "image");
      uploaded.push({
        fileUrl: result.secure_url,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
      });
    }
  }

  // 2. Nếu có imageUrls từ body (URL có sẵn) → dùng trực tiếp
  if (bodyImageUrls && bodyImageUrls.length > 0) {
    for (const url of bodyImageUrls) {
      uploaded.push({
        fileUrl: typeof url === "string" ? url : url.fileUrl,
        originalName: typeof url === "string" ? "handover-image" : url.originalName || "handover-image",
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

async function createHandover(orderId, staffId, data) {
  const { note, assets, imageUrls } = data;

  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: {
      rental_order_items: true,
      handover_records: true,
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  if (order.status !== "RESERVED") {
    const error = new Error("Đơn hàng phải ở trạng thái RESERVED để bàn giao");
    error.statusCode = 400;
    throw error;
  }

  if (order.handover_records) {
    const error = new Error("Đơn hàng này đã được bàn giao");
    error.statusCode = 400;
    throw error;
  }

  if (!assets || assets.length === 0) {
    const error = new Error("Vui lòng chọn tài sản để bàn giao");
    error.statusCode = 400;
    throw error;
  }

  // Lấy danh sách identified_asset_ids từ request
  const allAssetIds = assets.flatMap((a) => a.identified_asset_ids);

  // Kiểm tra tài sản tồn tại và AVAILABLE
  const identifiedAssets = await prisma.identified_assets.findMany({
    where: { id: { in: allAssetIds } },
  });

  if (identifiedAssets.length !== allAssetIds.length) {
    const error = new Error("Một số tài sản không tồn tại");
    error.statusCode = 400;
    throw error;
  }

  const invalidAssets = identifiedAssets.filter((a) => a.status !== "AVAILABLE");
  if (invalidAssets.length > 0) {
    const error = new Error(`Tài sản ${invalidAssets.map((a) => a.asset_code).join(", ")} không sẵn sàng`);
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra từng product_model có đủ số lượng assets được chọn
  for (const item of assets) {
    const orderItem = order.rental_order_items.find(
      (oi) => oi.product_model_id === item.product_model_id
    );
    if (!orderItem) {
      const error = new Error(`Sản phẩm ${item.product_model_id} không có trong đơn hàng`);
      error.statusCode = 400;
      throw error;
    }
    if (item.identified_asset_ids.length < orderItem.quantity) {
      const error = new Error(
        `Sản phẩm ${orderItem.product_model_id} cần chọn ít nhất ${orderItem.quantity} tài sản`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Thực hiện trong transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Tạo handover_records
    const handover = await tx.handover_records.create({
      data: {
        rental_order_id: orderId,
        staff_id: staffId,
        handover_at: new Date(),
        note: note || null,
        status: "COMPLETED",
      },
    });

    // 2. Với mỗi asset được chọn, tạo rental_order_assets + handover_record_details
    const details = [];
    for (const item of assets) {
      for (const assetId of item.identified_asset_ids) {
        const asset = identifiedAssets.find((a) => a.id === assetId);

        const orderItem = order.rental_order_items.find(
          (oi) => oi.product_model_id === item.product_model_id
        );

        const orderAsset = await tx.rental_order_assets.create({
          data: {
            rental_order_id: orderId,
            rental_order_item_id: orderItem?.id || null,
            asset_id: assetId,
            asset_code_snapshot: asset.asset_code,
            serial_snapshot: asset.serial_number,
            identification_note_snapshot: asset.identification_note,
            status: "DELIVERED",
          },
        });

        // Tạo handover_record_details
        const detail = await tx.handover_record_details.create({
          data: {
            handover_record_id: handover.id,
            rental_order_id: orderId,
            rental_order_asset_id: orderAsset.id,
            delivered_quantity: 1,
            condition_note: item.condition_note || null,
          },
        });

        details.push(detail);
      }
    }

    // 3. Cập nhật trạng thái order → RENTING
    await tx.rental_orders.update({
      where: { id: orderId },
      data: { status: "RENTING", updated_at: new Date() },
    });

    // 4. Cập nhật rental_order_items → RENTED
    await tx.rental_order_items.updateMany({
      where: { rental_order_id: orderId },
      data: { status: "RENTED", updated_at: new Date() },
    });

    // 5. Cập nhật identified_assets → RENTED
    await tx.identified_assets.updateMany({
      where: { id: { in: allAssetIds } },
      data: { status: "RENTED" },
    });

    // 6. Tạo asset_movements
    for (const assetId of allAssetIds) {
      const asset = identifiedAssets.find((a) => a.id === assetId);
      await tx.asset_movements.create({
        data: {
          asset_id: assetId,
          related_order_id: orderId,
          from_location_id: asset.current_location_id,
          to_location_id: null,
          status_before: "AVAILABLE",
          status_after: "RENTED",
          movement_type: "DELIVER",
          note: `Bàn giao cho đơn hàng ${order.order_code}`,
          created_by: staffId,
        },
      });
    }

    // 7. Tạo rental_record_files nếu có imageUrls từ API 12
    if (imageUrls && imageUrls.length > 0) {
      for (const img of imageUrls) {
        await tx.rental_record_files.create({
          data: {
            rental_order_id: orderId,
            handover_record_id: handover.id,
            file_purpose: "HANDOVER_IMAGE",
            original_file_name: img.originalName || "handover-image",
            file_url: img.fileUrl,
            file_type: img.fileType || null,
            file_size: img.fileSize || null,
            uploaded_by: staffId,
          },
        });
      }
    }

    return {
      handoverId: handover.id,
      detailCount: details.length,
    };
  });

  return result;
}

module.exports = {
  uploadHandoverImages,
  createHandover,
};
