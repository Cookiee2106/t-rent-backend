/**
 * Chuẩn hóa tên/mã thiết bị thành dạng viết hoa, không dấu, không khoảng trắng
 * GIỮ NGUYÊN TẤT CẢ CHỮ VÀ SỐ (bao gồm số La Mã: I, II, III, IV...)
 * @param {string|null} rawCode - Tên hoặc mã thô từ product_models
 * @returns {string} Mã đã chuẩn hóa
 */
function normalizeDeviceCode(rawCode) {
  if (!rawCode) return null; // Không fallback "DEV" ở đây - để caller quyết định

  let code = String(rawCode).toUpperCase();

  // Bỏ dấu tiếng Việt
  code = code
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẴẲ]/g, "A")
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, "E")
    .replace(/[ÌÍỊỈĨ]/g, "I")
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, "O")
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, "U")
    .replace(/[ỲÝỴỶỸ]/g, "Y")
    .replace(/[Đ]/g, "D")
    // Bỏ khoảng trắng và ký tự đặc biệt, GIỮ NGUYÊN chữ và số (bao gồm I, V, X của số La Mã)
    .replace(/[^A-Z0-9]/g, "");

  // KHÔNG giới hạn số ký tự - giữ nguyên toàn bộ
  return code || null;
}

/**
 * Lấy mã thiết bị từ product model theo thứ tự ưu tiên:
 * code → model_code → slug → name
 * @param {object|null} productModel - Object product_models từ Prisma
 * @returns {string} Mã thiết bị đã chuẩn hóa
 */
function getDeviceCodeFromProductModel(productModel) {
  if (!productModel) return null;

  // Ưu tiên: code → model_code → slug → name
  const rawCode =
    productModel.code ||
    productModel.model_code ||
    productModel.slug ||
    productModel.name;

  return normalizeDeviceCode(rawCode);
}

/**
 * Sinh mã order DUY NHẤT trong ngày
 * Gọi TRONG TRANSACTION để đảm bảo count đúng
 * @param {object} tx - Prisma transaction client
 * @param {object|null} productModel - Object product_models
 * @returns {string} Mã order mới (VD: "2206CANONR5-001")
 */
async function generateUniqueOrderCode(tx, productModel) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Lấy mã thiết bị từ product model
  const deviceCode = getDeviceCodeFromProductModel(productModel);

  // Nếu không có product model hoặc không extract được mã → không sinh mã
  if (!deviceCode) {
    throw new Error("Khong co thong tin mau thiet bi de tao ma don hang");
  }

  const prefix = `${day}${month}${deviceCode}`;

  // Query tất cả order trong ngày với prefix đúng
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  const existingOrders = await tx.rental_orders.findMany({
    where: {
      order_code: { startsWith: prefix },
      created_at: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    select: { order_code: true },
  });

  // Parse phần STT sau "-" từ tất cả order và lấy max
  let maxSeq = 0;
  for (const order of existingOrders) {
    const parts = order.order_code.split("-");
    if (parts.length === 2) {
      const seq = parseInt(parts[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}-${String(nextSeq).padStart(3, "0")}`;
}

module.exports = {
  normalizeDeviceCode,
  getDeviceCodeFromProductModel,
  generateUniqueOrderCode,
};
