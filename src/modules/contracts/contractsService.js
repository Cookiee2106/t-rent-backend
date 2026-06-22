const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

async function uploadContract(orderId, staffId, file) {
  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: { customer_profiles: true, rental_contracts: true },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  if (order.status !== "RESERVED" && order.status !== "RENTING") {
    const error = new Error("Đơn hàng không ở trạng thái cho phép upload hợp đồng");
    error.statusCode = 400;
    throw error;
  }

  if (!file) {
    const error = new Error("Vui lòng upload file hợp đồng");
    error.statusCode = 400;
    throw error;
  }

  console.log(`\n[CONTRACT] Bắt đầu upload hợp đồng cho đơn ${order.order_code} (id=${orderId})`);
  console.log(`[CONTRACT] File: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

  const uploadResult = await uploadBufferToCloudinary(file.buffer, "t-rent/contracts", "auto");
  console.log(`[CONTRACT] Upload Cloudinary thành công: ${uploadResult.secure_url}`);

  // Tạo hoặc lấy rental_contract
  let contract = order.rental_contracts;
  if (!contract) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const countToday = await prisma.rental_contracts.count({
      where: {
        created_at: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
        },
      },
    });

    const contractCode = `HD-${day}${month}-${String(countToday + 1).padStart(3, "0")}`;

    contract = await prisma.rental_contracts.create({
      data: {
        contract_code: contractCode,
        rental_order_id: order.id,
        customer_id: order.customer_id,
        staff_id: staffId,
        status: "CREATED",
      },
    });
  }

  await prisma.contract_files.create({
    data: {
      contract_id: contract.id,
      original_file_name: file.originalname,
      file_url: uploadResult.secure_url,
      file_type: file.mimetype,
      file_size: file.size,
      uploaded_by: staffId,
    },
  });

  return {
    contractId: contract.id,
    contractCode: contract.contract_code,
    fileUrl: uploadResult.secure_url,
  };
}

module.exports = {
  uploadContract,
};
