const prisma = require("../../config/prisma");

async function layDanhSachMauThietBiService() {
  const danhSach = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE mtb.da_xoa_luc IS NULL

    ORDER BY mtb.created_at DESC
  `;

  return danhSach;
}

module.exports = {
  layDanhSachMauThietBiService,
};