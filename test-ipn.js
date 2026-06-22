require("dotenv").config();
const crypto = require("crypto");
const querystring = require("querystring");

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(function(k) { sorted[k] = obj[k]; });
  return sorted;
}

function buildHash(params, secretKey) {
  const sorted = sortObject(params);
  const signData = querystring.stringify(sorted);
  const hmac = crypto.createHmac("sha512", secretKey);
  return hmac.update(Buffer.from(signData, "utf-8").digest("hex");
}

async function runTest() {
  const { PrismaClient } = require("@prisma/client");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Expire old sessions
    await prisma.checkout_sessions.updateMany({
      where: { status: { in: ["READY_FOR_PAYMENT", "PAYMENT_PENDING"] },
      data: { status: "EXPIRED" },
    });
    console.log("1. Old sessions expired");

    // 2. Get user and product
    const user = await prisma.users.findUnique({
      where: { email: "terms@trent.com" },
      include: { customer_profiles: true },
    });
    const profile = user.customer_profiles;

    const product = await prisma.product_models.findFirst({
      where: { status: "ACTIVE" },
    });
    console.log("2. Product:", product.name);

    // 3. Create cart and item
    const cart = await prisma.carts.create({
      data: { customer_id: profile.id, status: "ACTIVE" },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    await prisma.cart_items.create({
      data: {
        cart_id: cart.id,
        product_model_id: product.id,
        quantity: 1,
        start_date: startDate,
        end_date: endDate,
        status: "ACTIVE",
      },
    });
    console.log("3. Cart item created for:", product.name);

    // 4. Login via HTTP
    const loginRes = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "terms@trent.com", password: "Abc12345" }),
    }).then(function(r) { return r.json(); });
    const token = loginRes.data.token;
    console.log("4. Logged in, token OK");

    // 5. Accept terms via HTTP
    await fetch("http://localhost:4000/api/rental-terms/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        termsId: "ae3aa484-090b-4e09-a3fe-558b68cdd231",
        termsVersion: "v1.0",
      }),
    });
    console.log("5. Terms accepted");

    // 6. Create checkout session via HTTP
    const checkoutRes = await fetch("http://localhost:4000/api/checkout-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        termsAcceptanceId: "ccf78445-f74c-4d2a-8672-febf6ab910ee",
        otpVerificationToken: "test_token_" + Date.now(),
      }),
    }).then(function(r) { return r.json(); });
    console.log("6. Checkout session:", checkoutRes.success ? "OK" : JSON.stringify(checkoutRes));
    if (!checkoutRes.success) { return; }

    const sessionId = checkoutRes.data.checkoutSessionId;

    // 7. Create payment URL via HTTP
    const payRes = await fetch("http://localhost:4000/api/payments/vnpay/create-payment-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ checkoutSessionId: sessionId }),
    }).then(function(r) { return r.json(); });
    console.log("7. Payment URL:", payRes.success ? "OK" : JSON.stringify(payRes));
    if (!payRes.success) { return; }

    const paymentId = payRes.data.paymentId;
    console.log("8. Payment ID:", paymentId);

    // 8. Build IPN hash and send success
    const secretKey = "AZXQO500EVLXECR0FCC42IG9ACWKNINI";
    const now = new Date();
    const createDate = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000).toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);

    var params = {
      vnp_Amount: "500000000",
      vnp_Command: "pay",
      vnp_CreateDate: createDate,
      vnp_CurrCode: "VND",
      vnp_ExpireDate: expireDate,
      vnp_IpAddr: "127.0.0.1",
      vnp_Locale: "vn",
      vnp_OrderType: "other",
      vnp_ResponseCode: "00",
      vnp_ReturnUrl: "http://localhost:5173/payment-result",
      vnp_TmnCode: "P9QYTZHG",
      vnp_TransactionNo: "999888777",
      vnp_TxnRef: paymentId,
      vnp_Version: "2.1.0",
    };
    params.vnp_SecureHash = buildHash(params, secretKey);

    var ipnQuery = querystring.stringify(params);
    var ipnRes = await fetch("http://localhost:4000/api/payments/vnpay/ipn?" + ipnQuery).then(function(r) { return r.text(); });
    console.log("9. IPN response:", ipnRes);

    // 9. Check order codes
    var orders = await prisma.rental_orders.findMany({
      where: { customer_id: profile.id },
      orderBy: { created_at: "desc" },
      take: 5,
    });
    console.log("10. Orders created:");
    orders.forEach(function(o) { console.log("    -", o.order_code, "status:", o.status); });

    await prisma.$disconnect();
    await pool.end();
  } catch (e) {
    console.error("ERROR:", e.message);
    await prisma.$disconnect().catch(function() {});
    await pool.end().catch(function() {});
  }
}

runTest();
