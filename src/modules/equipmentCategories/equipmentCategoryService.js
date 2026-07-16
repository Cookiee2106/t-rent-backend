const prisma = require("../../config/prisma");

async function layDanhSachDanhMucThietBiService() {
  return await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc
    FROM danh_muc_thiet_bi
    WHERE da_xoa_luc IS NULL
    ORDER BY ten_danh_muc ASC
  `;
}

module.exports = {
  layDanhSachDanhMucThietBiService,
};
