const crypto = require("crypto");
const querystring = require("querystring");

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function buildPaymentUrl({ orderId, amount, orderInfo, returnUrl, ipnUrl, clientIp }) {
  const tmnCode = process.env.VNPAY_TMN_CODE;
  const secretKey = process.env.VNPAY_HASH_SECRET;
  const vnpUrl = process.env.VNPAY_API_URL;

  const date = new Date();
  const createDate = date
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);
  const expireDate = new Date(date.getTime() + 15 * 60 * 1000)
    .toISOString()
    .replace(/[-:T.]/g, "")
    .slice(0, 14);

  const ip = clientIp || "127.0.0.1";

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo || `Thanh toan coc don hang ${orderId}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ip,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  const sortedParams = sortObject(params);
  const signData = querystring.stringify(sortedParams);

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  sortedParams.vnp_SecureHash = signed;

  const paymentUrl = `${vnpUrl}?${querystring.stringify(sortedParams)}`;

  return {
    paymentUrl,
    txnRef: orderId,
  };
}

function verifyReturnUrl(query) {
  const secretKey = process.env.VNPAY_HASH_SECRET;
  const { vnp_SecureHash, ...restParams } = query;

  const sortedParams = sortObject(restParams);
  const signData = querystring.stringify(sortedParams);

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return signed === vnp_SecureHash;
}

function verifyIpn(query) {
  const secretKey = process.env.VNPAY_HASH_SECRET;
  const { vnp_SecureHash, ...restParams } = query;

  const sortedParams = sortObject(restParams);
  const signData = querystring.stringify(sortedParams);

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return signed === vnp_SecureHash;
}

module.exports = {
  buildPaymentUrl,
  verifyReturnUrl,
  verifyIpn,
};
