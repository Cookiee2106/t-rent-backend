const prisma = require("../../utils/prisma");
const { buildPaymentUrl, verifyIpn } = require("../../utils/vnpay");
const { generateUniqueOrderCode } = require("../../utils/orderCode");

async function createVnpayPaymentUrl(userId, checkoutSessionId, clientIp) {
  if (!checkoutSessionId) {
    const error = new Error("Vui lòng cung cấp checkout_session_id");
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { customer_profiles: true },
  });

  if (!user || !user.customer_profiles) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const profile = user.customer_profiles;

  if (profile.verification_status !== "APPROVED") {
    const error = new Error("Tài khoản chưa được xác minh");
    error.statusCode = 403;
    throw error;
  }

  const session = await prisma.checkout_sessions.findFirst({
    where: { id: checkoutSessionId, customer_id: profile.id },
    include: { checkout_session_items: true },
  });

  if (!session) {
    const error = new Error("Không tìm thấy phiên thanh toán");
    error.statusCode = 404;
    throw error;
  }

  if (session.status !== "READY_FOR_PAYMENT") {
    const error = new Error("Phiên thanh toán không ở trạng thái hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  if (session.otp_verified !== true) {
    const error = new Error("OTP chưa được xác minh");
    error.statusCode = 400;
    throw error;
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    await prisma.checkout_sessions.update({
      where: { id: session.id },
      data: { status: "EXPIRED" },
    });
    const error = new Error("Phiên thanh toán đã hết hạn");
    error.statusCode = 400;
    throw error;
  }

  const existingPayment = await prisma.payments.findFirst({
    where: {
      checkout_session_id: session.id,
      payment_type: "DEPOSIT",
      method: "ONLINE_PAYMENT",
      status: "PENDING",
    },
  });

  let payment;
  if (existingPayment) {
    payment = existingPayment;
  } else {
    payment = await prisma.payments.create({
      data: {
        checkout_session_id: session.id,
        payment_type: "DEPOSIT",
        method: "ONLINE_PAYMENT",
        status: "PENDING",
        amount: session.total_amount,
      },
    });
  }

  await prisma.checkout_sessions.update({
    where: { id: session.id },
    data: { status: "PAYMENT_PENDING" },
  });

  const returnUrl =
    process.env.VNPAY_RETURN_URL ||
    `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-result`;
  const ipnUrl =
    process.env.VNPAY_IPN_URL ||
    `${process.env.BACKEND_URL || "http://localhost:4000"}/api/payments/vnpay/ipn`;

  const { paymentUrl } = buildPaymentUrl({
    orderId: payment.id,
    amount: parseFloat(session.total_amount),
    orderInfo: `T-Rent: Thanh toan coc ${session.id.substring(0, 8)}`,
    returnUrl,
    ipnUrl,
    clientIp,
  });

  return {
    paymentId: payment.id,
    paymentUrl,
    amount: session.total_amount,
    rentalAmount: session.rental_amount,
    depositAmount: session.deposit_amount,
    checkoutSessionId: session.id,
  };
}

async function handleVnpayReturn(query) {
  const responseCode = query.vnp_ResponseCode;
  const txnRef = query.vnp_TxnRef;
  const transactionNo = query.vnp_TransactionNo;
  const amount = query.vnp_Amount;

  return {
    responseCode,
    txnRef,
    transactionNo,
    amount,
    isSuccess: responseCode === "00",
  };
}

async function handleVnpayIpn(query) {
  // Bước 1: Verify chữ ký VNPAY - CHẠY ĐẦU TIÊN
  const isValidSignature = verifyIpn(query);
  if (!isValidSignature) {
    return { RspCode: "97", Message: "Chu ky khong hop le" };
  }

  // Bước 2: Parse số tiền AN TOÀN với radix 10
  const vnpAmount = parseInt(query.vnp_Amount, 10);
  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;
  const transactionNo = query.vnp_TransactionNo;

  if (!txnRef) {
    return { RspCode: "99", Message: "Khong tim thay ma tham chieu" };
  }

  if (query.vnp_TransactionNo === "0") {
    return { RspCode: "99", Message: "Khong co ma giao dich" };
  }

  // Bước 3: Tìm payment
  const payment = await prisma.payments.findUnique({
    where: { id: txnRef },
    include: {
      checkout_sessions: {
        include: {
          checkout_session_items: { include: { product_models: true } },
        },
      },
      rental_orders: true,
    },
  });

  if (!payment) {
    return { RspCode: "01", Message: "Khong tim thay giao dich thanh toan" };
  }

  // Bước 4: Payment đã xử lý - KHÔNG LÀM GÌ
  if (payment.status === "PAID") {
    return { RspCode: "00", Message: "Giao dich da duoc xu ly" };
  }

  // Bước 5: Verify số tiền
  const expectedAmount = Math.round(Number(payment.amount) * 100);
  if (vnpAmount !== expectedAmount) {
    return { RspCode: "04", Message: "So tien khong dung" };
  }

  // THÀNH CÔNG
  if (responseCode === "00") {
    const session = payment.checkout_sessions;

    if (!session) {
      return { RspCode: "01", Message: "Khong tim thay phien thanh toan" };
    }

    // Session đã được xử lý rồi
    if (session.status === "PAID") {
      return { RspCode: "00", Message: "Giao dich da duoc xu ly" };
    }

    // Bước 6: TOÀN BỘ trong một transaction (bọc ngoài để đảm bảo atomicity)
    try {
      let orderId;
      let orderCode;

      // Retry loop bên ngoài để mỗi attempt có transaction riêng
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          // Tạo transaction mới cho mỗi attempt
          const result = await prisma.$transaction(async (tx) => {
            const firstItem = session.checkout_session_items[0];
            const productModel = firstItem?.product_models || null;

            // Sinh order code TRONG TRANSACTION - query lại max STT mỗi attempt
            const code = await generateUniqueOrderCode(tx, productModel);

            // Tính toán ngày thuê
            const minStartDate = session.checkout_session_items.reduce(
              (min, item) =>
                new Date(item.start_date) < min ? new Date(item.start_date) : min,
              new Date()
            );
            const maxEndDate = session.checkout_session_items.reduce(
              (max, item) =>
                new Date(item.end_date) > max ? new Date(item.end_date) : max,
              new Date()
            );

            const firstStart = new Date(firstItem.start_date);
            const firstEnd = new Date(firstItem.end_date);
            const rentalDays = Math.ceil(
              (firstEnd.getTime() - firstStart.getTime()) / (1000 * 60 * 60 * 24)
            );
            const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

            // Tạo rental_order
            const rentalOrder = await tx.rental_orders.create({
              data: {
                order_code: code,
                customer_id: session.customer_id,
                start_date: minStartDate,
                end_date: maxEndDate,
                rental_days: rentalDays,
                total_rental_amount: session.rental_amount,
                total_deposit_amount: session.deposit_amount,
                status: "RESERVED",
                expired_at: expiredAt,
              },
            });

            // Tạo rental_order_items
            await tx.rental_order_items.createMany({
              data: session.checkout_session_items.map((item) => ({
                rental_order_id: rentalOrder.id,
                product_model_id: item.product_model_id,
                quantity: item.quantity || 1,
                daily_price_snapshot: item.daily_price_snapshot,
                deposit_amount_snapshot: item.deposit_amount_snapshot,
                rental_amount: item.rental_amount,
                deposit_amount:
                  parseFloat(item.deposit_amount_snapshot || 0) * (item.quantity || 1),
                status: "PENDING",
              })),
            });

            // Cập nhật checkout session
            await tx.checkout_sessions.update({
              where: { id: session.id },
              data: { status: "PAID", paid_at: new Date() },
            });

            // Cập nhật cart items
            if (session.cart_id) {
              const sessionItemIds = session.checkout_session_items
                .filter((item) => item.cart_item_id)
                .map((item) => item.cart_item_id);

              if (sessionItemIds.length > 0) {
                await tx.cart_items.updateMany({
                  where: { id: { in: sessionItemIds } },
                  data: { status: "ORDERED", updated_at: new Date() },
                });
              }
            }

            // Cập nhật payment
            await tx.payments.update({
              where: { id: payment.id },
              data: {
                status: "PAID",
                transaction_code: transactionNo,
                paid_at: new Date(),
                rental_order_id: rentalOrder.id,
              },
            });

            // Cập nhật terms acceptance
            if (session.terms_acceptance_id) {
              await tx.term_acceptances.update({
                where: { id: session.terms_acceptance_id },
                data: { rental_order_id: rentalOrder.id },
              });
            }

            console.log(`Order created: ${code}`);
            return { orderId: rentalOrder.id, orderCode: code };
          });

          orderId = result.orderId;
          orderCode = result.orderCode;
          break; // Thành công → thoát retry loop
        } catch (error) {
          // Kiểm tra lỗi unique constraint
          const isUniqueError =
            error.code === "P2002" ||
            error.code === "23505" ||
            (error.message && error.message.includes("Unique constraint")) ||
            (error.message && error.message.includes("duplicate key")) ||
            (error.meta?.target && error.meta.target.includes("order_code"));

          if (isUniqueError) {
            // Unique error → rollback tự động, retry với mã mới
            console.log(`Order code conflict on attempt ${attempt + 1}/5, retry with new STT`);
            continue;
          }

          // Lỗi khác → throw
          throw error;
        }
      }

      if (!orderId) {
        throw new Error("Khong tao duoc ma don hang sau 5 lan thu");
      }

      return { RspCode: "00", Message: "Xac nhan thanh toan thanh cong" };
    } catch (error) {
      console.error("IPN transaction failed:", error);
      return { RspCode: "99", Message: "Loi he thong" };
    }
  } else {
    // THẤT BẠI
    await prisma.payments.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    if (payment.checkout_session_id) {
      await prisma.checkout_sessions.update({
        where: { id: payment.checkout_session_id },
        data: { status: "PAYMENT_FAILED", failed_at: new Date() },
      });
    }

    return { RspCode: "00", Message: "Xac nhan thanh toan that bai" };
  }
}

module.exports = {
  createVnpayPaymentUrl,
  handleVnpayReturn,
  handleVnpayIpn,
};
