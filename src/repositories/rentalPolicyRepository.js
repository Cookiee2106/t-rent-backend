const prisma = require("../config/prisma");

async function layChinhSachThue() {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ty_le_phi_huy::text AS ty_le_phi_huy,
      updated_by,
      created_at,
      updated_at
    FROM chinh_sach_huy_don
    WHERE id = 1
    LIMIT 1
  `;

  return rows[0] || null;
}

async function capNhatTyLePhiHuy(nguoiCapNhatId, tyLePhiHuy) {
  const rows = await prisma.$queryRaw`
    UPDATE chinh_sach_huy_don
    SET
      ty_le_phi_huy = ${tyLePhiHuy},
      updated_by = ${nguoiCapNhatId}::uuid,
      updated_at = NOW()
    WHERE id = 1
    RETURNING
      id,
      ty_le_phi_huy::text AS ty_le_phi_huy,
      updated_by,
      created_at,
      updated_at
  `;

  return rows[0] || null;
}

module.exports = {
  layChinhSachThue,
  capNhatTyLePhiHuy,
};
