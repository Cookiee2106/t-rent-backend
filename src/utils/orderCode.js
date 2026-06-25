/**
 * Chuẩn hóa tên/mã thiết bị thành dạng viết hoa, không dấu, không khoảng trắng
 * GIỮ NGUYÊN TẤT CẢ CHỮ VÀ SỐ (bao gồm số La Mã: I, II, III, IV...)
 * @param {string|null} rawCode - Tên hoặc mã thô từ product_models
 * @returns {string} Mã đã chuẩn hóa
 */
function normalizeDeviceCode(rawCode) {
  if (!rawCode) return null;

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
    // Bỏ khoảng trắng và ký tự đặc biệt, GIỮ NGUYÊN chữ và số
    .replace(/[^A-Z0-9]/g, "");

  return code || null;
}

/**
 * Tao ma tam tu ten hang + ten mau (vi DB chua co field ma_mau)
 * Ví dụ: "Canon EOS R6" + "Canon" → "CANONEOSR6"
 * @param {string|null} ten_hang - Tên hãng thiết bị
 * @param {string|null} ten_mau - Tên mẫu thiết bị
 * @returns {string} Ma da chuan hoa, toi da 12 ky tu
 */
function taoMaTuTenMau(ten_hang, ten_mau) {
  const chuoi_goc = `${ten_hang || ""} ${ten_mau || ""}`.trim();

  const ma = normalizeDeviceCode(chuoi_goc);

  if (ma) {
    // Lay 12 ky tu dau
    return ma.slice(0, 12);
  }

  // Fallback: khong co ten
  return "TB";
}

/**
 * Lay ma thiet bi/mau thiet bi tu phien_thanh_toan
 * Su dung de tao prefix ma don
 * @param {object} tx - Prisma transaction client
 * @param {string} phien_thanh_toan_id - ID phien thanh toan
 * @returns {Promise<string>} Ma thiet bi da chuan hoa (VD: "CANONEOSR6")
 */
async function layMaThietBiTuPhien(tx, phien_thanh_toan_id) {
  const danh_sach = await tx.$queryRaw`
    SELECT
      m.ten_mau,
      h.ten_hang
    FROM chi_tiet_phien_thanh_toan ct
    JOIN mau_thiet_bi m ON m.id = ct.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = m.hang_id
    WHERE ct.phien_thanh_toan_id = ${phien_thanh_toan_id}
    ORDER BY ct.created_at ASC
    LIMIT 1
  `;

  if (danh_sach && danh_sach.length > 0) {
    const item = danh_sach[0];
    return taoMaTuTenMau(item.ten_hang, item.ten_mau);
  }

  return "TB";
}

/**
 * Sinh ma order DUY NHAT trong ngay
 * GoI TRONG TRANSACTION de dam bao count dung
 * @param {object} tx - Prisma transaction client
 * @param {string|null} phien_thanh_toan_id - ID phien thanh toan (de lay ma thiet bi)
 * @returns {Promise<string>} Ma order moi (VD: "CANONEOSR6-260625-001")
 */
async function generateUniqueOrderCode(tx, phien_thanh_toan_id) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  // Lay ma thiet bi tu phien_thanh_toan (neu co)
  let ma_thiet_bi = "TB";
  if (phien_thanh_toan_id) {
    ma_thiet_bi = await layMaThietBiTuPhien(tx, phien_thanh_toan_id);
  }

  const prefix = `${ma_thiet_bi}-${day}${month}`;

  // Query tat ca order trong ngay voi prefix dung (bang don_thue)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  const existingOrders = await tx.$queryRaw`
    SELECT ma_don FROM don_thue
    WHERE ma_don LIKE ${prefix + "-%"}
      AND created_at >= ${startOfDay}
      AND created_at < ${endOfDay}
  `;

  // Parse phan STT sau "-" tu tat ca order va lay max
  let maxSeq = 0;
  for (const order of existingOrders) {
    const parts = order.ma_don.split("-");
    if (parts.length >= 3) {
      const seq = parseInt(parts[parts.length - 1], 10);
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
  taoMaTuTenMau,
  layMaThietBiTuPhien,
  generateUniqueOrderCode,
};
