const prisma = require("../config/prisma");

function chuanHoaTenDeSoSanh(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

async function layDanhMucTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      dmtb.id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,
      tinh_chat.ten_danh_muc AS ten_tinh_chat,
      dmtb.trang_thai,
      trang_thai.ten_trang_thai,
      dmtb.created_at,
      dmtb.updated_at
    FROM danh_muc_thiet_bi dmtb

    LEFT JOIN danh_muc_he_thong tinh_chat
      ON tinh_chat.id = dmtb.tinh_chat_id

    LEFT JOIN trang_thai_he_thong trang_thai
      ON trang_thai.id = dmtb.trang_thai

    WHERE dmtb.id = ${id}::uuid
      AND dmtb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layDanhSachDanhMucThietBi() {
  return await prisma.$queryRaw`
    SELECT
      dmtb.id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,
      tinh_chat.ten_danh_muc AS ten_tinh_chat,
      dmtb.trang_thai,
      trang_thai.ten_trang_thai,
      dmtb.created_at,
      dmtb.updated_at
    FROM danh_muc_thiet_bi dmtb

    LEFT JOIN danh_muc_he_thong tinh_chat
      ON tinh_chat.id = dmtb.tinh_chat_id

    LEFT JOIN trang_thai_he_thong trang_thai
      ON trang_thai.id = dmtb.trang_thai

    WHERE dmtb.da_xoa_luc IS NULL

    ORDER BY tinh_chat.thu_tu ASC, dmtb.ten_danh_muc ASC
  `;
}

async function layDanhSachDanhMucHienThi(danhSachTinhChatId) {
  const layThietBiChinh = danhSachTinhChatId.includes(2501);
  const layThietBiPhu = danhSachTinhChatId.includes(2502);
  const layPhuKien = danhSachTinhChatId.includes(2503);

  return await prisma.$queryRaw`
    SELECT
      dmtb.id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,
      tinh_chat.ten_danh_muc AS ten_tinh_chat
    FROM danh_muc_thiet_bi dmtb

    LEFT JOIN danh_muc_he_thong tinh_chat
      ON tinh_chat.id = dmtb.tinh_chat_id

    WHERE dmtb.da_xoa_luc IS NULL
      AND dmtb.trang_thai = 601
      AND (
        (${layThietBiChinh} = true AND dmtb.tinh_chat_id = 2501)
        OR (${layThietBiPhu} = true AND dmtb.tinh_chat_id = 2502)
        OR (${layPhuKien} = true AND dmtb.tinh_chat_id = 2503)
      )

    ORDER BY tinh_chat.thu_tu ASC, dmtb.ten_danh_muc ASC
  `;
}

async function layDanhSachTinhChatDanhMuc() {
  return await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc
    FROM danh_muc_he_thong
    WHERE id IN (2501, 2502, 2503)
    ORDER BY thu_tu ASC, id ASC
  `;
}

async function timTinhChatTheoId(tinhChatId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc
    FROM danh_muc_he_thong
    WHERE id = ${tinhChatId}
      AND id IN (2501, 2502, 2503)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timDanhMucTrungTen(tenDanhMuc, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_danh_muc
    FROM danh_muc_thiet_bi
    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenDanhMuc);

  const danhMucTrung = rows.find((item) => {
    if (idBoQua && String(item.id) === String(idBoQua)) {
      return false;
    }

    return chuanHoaTenDeSoSanh(item.ten_danh_muc) === tenMoi;
  });

  return danhMucTrung || null;
}

async function taoDanhMucThietBi({ tenDanhMuc, tinhChatId }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO danh_muc_thiet_bi (
      id,
      ten_danh_muc,
      tinh_chat_id,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenDanhMuc},
      ${tinhChatId},
      601,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatDanhMucThietBi(id, { tenDanhMuc, tinhChatId }) {
  const rows = await prisma.$queryRaw`
    UPDATE danh_muc_thiet_bi
    SET
      ten_danh_muc = ${tenDanhMuc},
      tinh_chat_id = ${tinhChatId},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiDanhMucThietBi(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE danh_muc_thiet_bi
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function timMauThietBiTheoDanhMuc(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM mau_thiet_bi
    WHERE danh_muc_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timPhuKienTheoDanhMuc(id) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM phu_kien
    WHERE danh_muc_id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function xoaMemDanhMucThietBi(id) {
  const rows = await prisma.$queryRaw`
    UPDATE danh_muc_thiet_bi
    SET
      da_xoa_luc = NOW(),
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

module.exports = {
  layDanhMucTheoId,
  layDanhSachDanhMucThietBi,
  layDanhSachDanhMucHienThi,
  layDanhSachTinhChatDanhMuc,
  timTinhChatTheoId,
  timDanhMucTrungTen,
  taoDanhMucThietBi,
  capNhatDanhMucThietBi,
  capNhatTrangThaiDanhMucThietBi,
  timMauThietBiTheoDanhMuc,
  timPhuKienTheoDanhMuc,
  xoaMemDanhMucThietBi,
};