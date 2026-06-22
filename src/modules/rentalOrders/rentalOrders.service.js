const prisma = require("../../utils/prisma");

async function getCustomerOrders(customerId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = { customer_id: customerId };

  const [orders, total] = await Promise.all([
    prisma.rental_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        rental_order_items: {
          include: {
            product_models: { select: { id: true, name: true, image_url: true } },
          },
        },
        payments: { select: { status: true, amount: true, method: true } },
      },
    }),
    prisma.rental_orders.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getCustomerOrderDetail(orderId, customerId) {
  const order = await prisma.rental_orders.findFirst({
    where: { id: orderId, customer_id: customerId },
    include: {
      rental_order_items: {
        include: {
          product_models: {
            select: { id: true, name: true, image_url: true, description: true },
          },
        },
      },
      payments: true,
      handover_records: { include: { users: { select: { full_name: true } } } },
      return_records: true,
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  return order;
}

async function cancelOrder(orderId, customerId) {
  const order = await prisma.rental_orders.findFirst({
    where: { id: orderId, customer_id: customerId },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  if (order.status !== "RESERVED") {
    const error = new Error("Đơn hàng không thể hủy ở trạng thái hiện tại");
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.rental_orders.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelled_at: new Date(),
      cancel_reason: "Khách hàng yêu cầu hủy",
    },
  });

  return updated;
}

async function getAdminOrders(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.keyword) {
    where.OR = [
      { order_code: { contains: filters.keyword } },
      { customer_profiles: { users: { full_name: { contains: filters.keyword } } } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.rental_orders.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
        payments: { select: { status: true, amount: true, method: true } },
      },
    }),
    prisma.rental_orders.count({ where }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getAdminOrderDetail(orderId) {
  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: {
      customer_profiles: {
        select: {
          id: true,
          address: true,
          identity_number: true,
          users: { select: { id: true, full_name: true, email: true, phone: true } },
        },
      },
      rental_order_items: {
        include: {
          product_models: {
            select: { id: true, name: true, image_url: true, description: true, daily_price: true, deposit_amount: true },
          },
        },
      },
      payments: true,
      handover_records: {
        include: {
          users: { select: { full_name: true } },
          handover_record_details: true,
        },
      },
      return_records: {
        include: { return_record_details: true, return_charges: true },
      },
      rental_contracts: true,
      term_acceptances: true,
      inventory_allocations: { include: { identified_assets: true } },
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  return order;
}

async function getAvailableAssets(orderId) {
  const order = await prisma.rental_orders.findUnique({
    where: { id: orderId },
    include: {
      rental_order_items: {
        select: { id: true, product_model_id: true, quantity: true },
      },
    },
  });

  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng");
    error.statusCode = 404;
    throw error;
  }

  const productModelIds = order.rental_order_items.map((i) => i.product_model_id);

  const assets = await prisma.identified_assets.findMany({
    where: {
      product_model_id: { in: productModelIds },
      status: "AVAILABLE",
      deleted_at: null,
    },
    select: {
      id: true,
      asset_code: true,
      asset_name: true,
      serial_number: true,
      product_model_id: true,
      current_location_id: true,
      condition_note: true,
    },
    orderBy: { asset_code: "asc" },
  });

  return {
    orderId,
    items: order.rental_order_items,
    assets,
  };
}

module.exports = {
  getCustomerOrders,
  getCustomerOrderDetail,
  cancelOrder,
  getAdminOrders,
  getAdminOrderDetail,
  getAvailableAssets,
};
