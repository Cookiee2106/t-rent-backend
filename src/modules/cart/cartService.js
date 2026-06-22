const prisma = require("../../utils/prisma");

async function getOrCreateCart(userId) {
  // Lấy customer_profile từ userId
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  const customerId = profile.id;

  let cart = await prisma.carts.findFirst({
    where: {
      customer_id: customerId,
      status: "ACTIVE",
    },
  });

  if (!cart) {
    cart = await prisma.carts.create({
      data: {
        customer_id: customerId,
        status: "ACTIVE",
      },
    });
  }

  return cart;
}

async function addCartItem(customerId, { productModelId, quantity, startDate, endDate }) {
  const productModel = await prisma.product_models.findUnique({
    where: { id: productModelId },
  });

  if (!productModel) {
    const error = new Error("Mẫu thiết bị không tồn tại");
    error.statusCode = 404;
    throw error;
  }

  if (productModel.status !== "ACTIVE" || productModel.deleted_at) {
    const error = new Error("Mẫu thiết bị hiện không khả dụng");
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const error = new Error("Ngày nhận và ngày trả không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error("Ngày trả phải sau ngày nhận");
    error.statusCode = 400;
    throw error;
  }

  if (quantity < 1) {
    const error = new Error("Số lượng phải lớn hơn 0");
    error.statusCode = 400;
    throw error;
  }

  const cart = await getOrCreateCart(customerId);

  const existingItem = await prisma.cart_items.findFirst({
    where: {
      cart_id: cart.id,
      product_model_id: productModelId,
      start_date: start,
      end_date: end,
      status: "ACTIVE",
    },
  });

  let cartItem;
  if (existingItem) {
    cartItem = await prisma.cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
        updated_at: new Date(),
      },
      include: {
        product_models: {
          select: {
            id: true,
            name: true,
            image_url: true,
          },
        },
      },
    });
  } else {
    cartItem = await prisma.cart_items.create({
      data: {
        cart_id: cart.id,
        product_model_id: productModelId,
        quantity,
        start_date: start,
        end_date: end,
        daily_price_snapshot: productModel.daily_price,
        deposit_amount_snapshot: productModel.deposit_amount,
        status: "ACTIVE",
      },
      include: {
        product_models: {
          select: {
            id: true,
            name: true,
            image_url: true,
          },
        },
      },
    });
  }

  return {
    id: cartItem.id,
    productModel: {
      id: cartItem.product_models.id,
      name: cartItem.product_models.name,
      imageUrl: cartItem.product_models.image_url,
    },
    quantity: cartItem.quantity,
    startDate: cartItem.start_date,
    endDate: cartItem.end_date,
    dailyPriceSnapshot: cartItem.daily_price_snapshot,
    depositAmountSnapshot: cartItem.deposit_amount_snapshot,
  };
}

async function getCart(userId) {
  // Lấy customer_profile từ userId
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    return {
      id: null,
      items: [],
    };
  }

  const cart = await prisma.carts.findFirst({
    where: {
      customer_id: profile.id,
      status: "ACTIVE",
    },
    include: {
      cart_items: {
        where: { status: "ACTIVE" },
        include: {
          product_models: {
            select: {
              id: true,
              name: true,
              image_url: true,
              daily_price: true,
              deposit_amount: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!cart) {
    return {
      id: null,
      items: [],
    };
  }

  const items = cart.cart_items.map((item) => ({
    id: item.id,
    productModel: {
      id: item.product_models.id,
      name: item.product_models.name,
      imageUrl: item.product_models.image_url,
      dailyPrice: item.product_models.daily_price,
      depositAmount: item.product_models.deposit_amount,
    },
    quantity: item.quantity,
    startDate: item.start_date,
    endDate: item.end_date,
    dailyPriceSnapshot: item.daily_price_snapshot,
    depositAmountSnapshot: item.deposit_amount_snapshot,
  }));

  return {
    id: cart.id,
    items,
  };
}

async function removeCartItem(userId, itemId) {
  // Lấy customer_profile từ userId
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  const cart = await prisma.carts.findFirst({
    where: {
      customer_id: profile.id,
      status: "ACTIVE",
    },
  });

  if (!cart) {
    const error = new Error("Không tìm thấy giỏ hàng");
    error.statusCode = 404;
    throw error;
  }

  const cartItem = await prisma.cart_items.findFirst({
    where: {
      id: itemId,
      cart_id: cart.id,
      status: "ACTIVE",
    },
  });

  if (!cartItem) {
    const error = new Error("Không tìm thấy sản phẩm trong giỏ hàng");
    error.statusCode = 404;
    throw error;
  }

  await prisma.cart_items.update({
    where: { id: itemId },
    data: {
      status: "REMOVED",
      updated_at: new Date(),
    },
  });

  return { message: "Đã xóa sản phẩm khỏi giỏ hàng" };
}

module.exports = {
  addCartItem,
  getCart,
  removeCartItem,
};
