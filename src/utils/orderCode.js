const prisma = require("./prisma");

function normalizeDeviceCode(name) {
  if (!name) return "DEV";

  let code = name.toUpperCase();

  code = code
    .replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẴẲ]/g, "A")
    .replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, "E")
    .replace(/[ÌÍỊỈĨ]/g, "I")
    .replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, "O")
    .replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, "U")
    .replace(/[ỲÝỴỶỸ]/g, "Y")
    .replace(/[Đ]/g, "D")
    .replace(/[^A-Z0-9]/g, "");

  if (code.length > 8) {
    code = code.substring(0, 8);
  }

  return code || "DEV";
}

async function generateOrderCode(productModelName) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const deviceCode = normalizeDeviceCode(productModelName);

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const countToday = await prisma.rental_orders.count({
    where: {
      created_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequenceNumber = String(countToday + 1).padStart(3, "0");

  return `${day}${month}${deviceCode}-${sequenceNumber}`;
}

module.exports = {
  generateOrderCode,
  normalizeDeviceCode,
};
