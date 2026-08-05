const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

function chuanHoaTenDeSoSanh(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

// Lấy toàn bộ nhu cầu cho màn hình quản lý, gồm cả Hiển thị và Đã ẩn.
async function layDanhSachNhuCau() {
  return await prisma.$queryRaw`
    SELECT
      nc.id,
      nc.ten_nhu_cau,
      nc.mo_ta,
      nc.trang_thai,
      tt.ten_trang_thai,
      nc.created_at,
      nc.updated_at,

      (
        SELECT COUNT(*)::int
        FROM mau_thiet_bi_nhu_cau mnc
        JOIN mau_thiet_bi mtb
          ON mtb.id = mnc.mau_thiet_bi_id
        WHERE mnc.nhu_cau_id = nc.id
          AND mtb.da_xoa_luc IS NULL
      ) AS so_mau_dang_dung

    FROM nhu_cau_su_dung nc

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = nc.trang_thai

    WHERE nc.da_xoa_luc IS NULL

    ORDER BY nc.ten_nhu_cau ASC
  `;
}

// Chỉ lấy nhu cầu đang hiển thị.
// Dùng cho form cấu hình nhu cầu của mẫu thiết bị.
async function layDanhSachNhuCauDangHienThi() {
  return await prisma.$queryRaw`
    SELECT
      id,
      ten_nhu_cau,
      mo_ta

    FROM nhu_cau_su_dung

    WHERE da_xoa_luc IS NULL
      AND trang_thai = 601

    ORDER BY ten_nhu_cau ASC
  `;
}

async function layNhuCauTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      nc.id,
      nc.ten_nhu_cau,
      nc.mo_ta,
      nc.trang_thai,
      tt.ten_trang_thai,
      nc.created_at,
      nc.updated_at,

      (
        SELECT COUNT(*)::int
        FROM mau_thiet_bi_nhu_cau mnc
        JOIN mau_thiet_bi mtb
          ON mtb.id = mnc.mau_thiet_bi_id
        WHERE mnc.nhu_cau_id = nc.id
          AND mtb.da_xoa_luc IS NULL
      ) AS so_mau_dang_dung

    FROM nhu_cau_su_dung nc

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = nc.trang_thai

    WHERE nc.id = ${id}::uuid
      AND nc.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

// Dùng khi kiểm tra danh sách nhu cầu được gắn cho mẫu.
async function layNhieuNhuCauHopLe(danhSachNhuCauId = []) {
  const danhSachId = [
    ...new Set(
      danhSachNhuCauId
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  if (danhSachId.length === 0) {
    return [];
  }

  const danhSachIdSql = Prisma.join(
    danhSachId.map(
      (id) => Prisma.sql`${id}::uuid`
    )
  );

  return await prisma.$queryRaw`
    SELECT
      id,
      ten_nhu_cau

    FROM nhu_cau_su_dung

    WHERE id IN (${danhSachIdSql})
      AND da_xoa_luc IS NULL
      AND trang_thai = 601
  `;
}

// Chống trùng ở Backend, cùng cách tổ chức như hãng và danh mục.
// Các tên khác hoa/thường, khác dấu hoặc thừa khoảng trắng được xem là trùng.
async function timNhuCauTrungTen(tenNhuCau, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_nhu_cau

    FROM nhu_cau_su_dung

    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenNhuCau);

  return (
    rows.find((item) => {
      if (idBoQua && String(item.id) === String(idBoQua)) {
        return false;
      }

      return chuanHoaTenDeSoSanh(item.ten_nhu_cau) === tenMoi;
    }) || null
  );
}

async function taoNhuCau({ tenNhuCau, moTa }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO nhu_cau_su_dung (
      id,
      ten_nhu_cau,
      mo_ta,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenNhuCau},
      ${moTa},
      601,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatNhuCau(id, { tenNhuCau, moTa }) {
  const rows = await prisma.$queryRaw`
    UPDATE nhu_cau_su_dung
    SET
      ten_nhu_cau = ${tenNhuCau},
      mo_ta = ${moTa},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

// Vẫn cho phép ẩn nhu cầu đang có mẫu sử dụng.
// Chỉ đổi trạng thái, không xóa mau_thiet_bi_nhu_cau.
async function capNhatTrangThaiNhuCau(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE nhu_cau_su_dung
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

module.exports = {
  layDanhSachNhuCau,
  layDanhSachNhuCauDangHienThi,
  layNhuCauTheoId,
  layNhieuNhuCauHopLe,
  timNhuCauTrungTen,
  taoNhuCau,
  capNhatNhuCau,
  capNhatTrangThaiNhuCau,
};
