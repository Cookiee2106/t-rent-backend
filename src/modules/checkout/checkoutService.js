const prisma = require("../../utils/prisma");

async function createCheckoutSession(userId, { termsAcceptanceId, otpVerificationToken }) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      customer_profiles: true,
    },
  });

  if (!user) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const profile = user.customer_profiles;
  if (!profile) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  if (profile.verification_status !== "APPROVED") {
    const error = new Error("Tài khoản chưa được xác minh");
    error.statusCode = 403;
    throw error;
  }

  if (!termsAcceptanceId) {
    const error = new Error("Vui lòng chấp nhận điều khoản thuê trước");
    error.statusCode = 400;
    throw error;
  }

  const termsAcceptance = await prisma.term_acceptances.findFirst({
    where: {
      id: termsAcceptanceId,
      customer_id: profile.id,
    },
    include: {
      rental_terms: true,
    },
  });

  if (!termsAcceptance) {
    const error = new Error("Xác nhận điều khoản không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  if (!otpVerificationToken) {
    const error = new Error("OTP chưa được xác minh");
    error.statusCode = 400;
    throw error;
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
          product_models: true,
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!cart || cart.cart_items.length === 0) {
    const error = new Error("Giỏ hàng trống");
    error.statusCode = 400;
    throw error;
  }

  for (const item of cart.cart_items) {
    const product = item.product_models;
    if (product.status !== "ACTIVE" || product.deleted_at) {
      const error = new Error(
        `Mẫu thiết bị "${product.name}" hiện không khả dụng`
      );
      error.statusCode = 400;
      throw error;
    }

    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    if (endDate <= startDate) {
      const error = new Error("Ngày trả phải sau ngày nhận");
      error.statusCode = 400;
      throw error;
    }

    if (item.quantity < 1) {
      const error = new Error("Số lượng phải lớn hơn 0");
      error.statusCode = 400;
      throw error;
    }
  }

  // Kiểm tra đã có checkout session đang chờ thanh toán chưa
  const existingSession = await prisma.checkout_sessions.findFirst({
    where: {
      cart_id: cart.id,
      status: { in: ["READY_FOR_PAYMENT", "PAYMENT_PENDING"] },
    },
    orderBy: { created_at: "desc" },
    take: 1,
  });

  if (existingSession) {
    const isExpired = existingSession.expires_at && new Date(existingSession.expires_at) < new Date();

    if (!isExpired) {
      return {
        existingSession: true,
        checkoutSessionId: existingSession.id,
        status: existingSession.status,
        message: "Đã có phiên thanh toán đang chờ. Vui lòng tiếp tục thanh toán phiên cũ.",
      };
    }

    // Nếu hết hạn thì xóa và tạo mới
    await prisma.checkout_sessions.update({
      where: { id: existingSession.id },
      data: { status: "EXPIRED" },
    });
  }

  let minStartDate = null;
  let maxEndDate = null;
  let totalRentalAmount = 0;
  let totalDepositAmount = 0;

  const snapshotItems = [];

  for (const item of cart.cart_items) {
    const product = item.product_models;
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    if (!minStartDate || startDate < minStartDate) {
      minStartDate = startDate;
    }
    if (!maxEndDate || endDate > maxEndDate) {
      maxEndDate = endDate;
    }

    const rentalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const itemRentalAmount =
      parseFloat(product.daily_price) * item.quantity * rentalDays;
    const itemDepositAmount =
      parseFloat(product.deposit_amount) * item.quantity;

    totalRentalAmount += itemRentalAmount;
    totalDepositAmount += itemDepositAmount;

    snapshotItems.push({
      cartItemId: item.id,
      productModelId: product.id,
      productName: product.name,
      startDate,
      endDate,
      quantity: item.quantity,
      dailyPriceSnapshot: product.daily_price,
      depositAmountSnapshot: product.deposit_amount,
      rentalAmount: itemRentalAmount,
    });
  }

  const rentalDays = Math.ceil(
    (maxEndDate.getTime() - minStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const totalAmount = totalDepositAmount;

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const checkoutSession = await prisma.checkout_sessions.create({
    data: {
      customer_id: profile.id,
      cart_id: cart.id,
      terms_acceptance_id: termsAcceptanceId,
      otp_verified: true,
      otp_verification_token: otpVerificationToken,
      status: "READY_FOR_PAYMENT",
      rental_amount: totalRentalAmount,
      deposit_amount: totalDepositAmount,
      total_amount: totalAmount,
      expires_at: expiresAt,
    },
  });

  await prisma.checkout_session_items.createMany({
    data: snapshotItems.map((item) => ({
      checkout_session_id: checkoutSession.id,
      cart_item_id: item.cartItemId,
      product_model_id: item.productModelId,
      start_date: item.startDate,
      end_date: item.endDate,
      quantity: item.quantity,
      daily_price_snapshot: item.dailyPriceSnapshot,
      deposit_amount_snapshot: item.depositAmountSnapshot,
      rental_amount: item.rentalAmount,
    })),
  });

  return {
    checkoutSessionId: checkoutSession.id,
    status: checkoutSession.status,
    rentalAmount: totalRentalAmount,
    depositAmount: totalDepositAmount,
    totalAmount: totalAmount,
    rentalDays,
    startDate: minStartDate,
    endDate: maxEndDate,
    expiresAt,
    itemCount: snapshotItems.length,
  };
}

async function getCheckoutSession(userId, sessionId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      customer_profiles: true,
    },
  });

  if (!user || !user.customer_profiles) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const session = await prisma.checkout_sessions.findFirst({
    where: {
      id: sessionId,
      customer_id: user.customer_profiles.id,
    },
    include: {
      checkout_session_items: {
        include: {
          product_models: {
            include: {
              brands: true,
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
      term_acceptances: {
        include: {
          rental_terms: true,
        },
      },
    },
  });

  if (!session) {
    const error = new Error("Không tìm thấy phiên thanh toán");
    error.statusCode = 404;
    throw error;
  }

  const isExpired =
    session.expires_at && new Date(session.expires_at) < new Date();

  return {
    id: session.id,
    status: session.status,
    isExpired,
    otpVerified: session.otp_verified,
    rentalAmount: session.rental_amount,
    depositAmount: session.deposit_amount,
    totalAmount: session.total_amount,
    expiresAt: session.expires_at,
    paidAt: session.paid_at,
    failedAt: session.failed_at,
    createdAt: session.created_at,
    terms: session.term_acceptances
      ? {
          id: session.term_acceptances.rental_terms.id,
          version: session.term_acceptances.rental_terms.version,
          acceptedAt: session.term_acceptances.accepted_at,
        }
      : null,
    items: session.checkout_session_items.map((item) => ({
      id: item.id,
      productModelId: item.product_model_id,
      productName: item.product_models.name,
      productImage: item.product_models.image_url,
      brandName: item.product_models.brands?.name,
      quantity: item.quantity,
      startDate: item.start_date,
      endDate: item.end_date,
      dailyPrice: item.daily_price_snapshot,
      depositAmount: item.deposit_amount_snapshot,
      rentalAmount: item.rental_amount,
    })),
  };
}

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
};
