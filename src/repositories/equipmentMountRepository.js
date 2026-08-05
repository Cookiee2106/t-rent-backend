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

// Lấy toàn bộ ngàm cho màn hình quản lý, gồm cả Hiển thị và Đã ẩn.
async function layDanhSachNgam() {
  return await prisma.$queryRaw`
    SELECT
      n.id,
      n.ten_ngam,
      n.hang_so_huu_id,
      h.ten_hang,
      n.trang_thai,
      tt.ten_trang_thai,
      n.created_at,
      n.updated_at,

      (
        SELECT COUNT(*)::int
        FROM mau_thiet_bi mtb
        WHERE mtb.ngam_id = n.id
          AND mtb.da_xoa_luc IS NULL
      ) AS so_mau_dang_dung

    FROM ngam_thiet_bi n

    JOIN hang_thiet_bi h
      ON h.id = n.hang_so_huu_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = n.trang_thai

    WHERE n.da_xoa_luc IS NULL

    ORDER BY
      h.ten_hang ASC,
      n.ten_ngam ASC
  `;
}

// Chỉ lấy ngàm đang hiển thị và có hãng đang hiển thị.
// Dùng cho form thêm/cập nhật mẫu thiết bị.
async function layDanhSachNgamDangHienThi() {
  return await prisma.$queryRaw`
    SELECT
      n.id,
      n.ten_ngam,
      n.hang_so_huu_id,
      h.ten_hang

    FROM ngam_thiet_bi n

    JOIN hang_thiet_bi h
      ON h.id = n.hang_so_huu_id

    WHERE n.da_xoa_luc IS NULL
      AND n.trang_thai = 601
      AND h.da_xoa_luc IS NULL
      AND h.trang_thai = 601

    ORDER BY
      h.ten_hang ASC,
      n.ten_ngam ASC
  `;
}

async function layNgamTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      n.id,
      n.ten_ngam,
      n.hang_so_huu_id,
      h.ten_hang,
      n.trang_thai,
      tt.ten_trang_thai,
      n.created_at,
      n.updated_at,

      (
        SELECT COUNT(*)::int
        FROM mau_thiet_bi mtb
        WHERE mtb.ngam_id = n.id
          AND mtb.da_xoa_luc IS NULL
      ) AS so_mau_dang_dung

    FROM ngam_thiet_bi n

    JOIN hang_thiet_bi h
      ON h.id = n.hang_so_huu_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = n.trang_thai

    WHERE n.id = ${id}::uuid
      AND n.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

// Dùng khi gắn ngàm cho mẫu thiết bị.
async function layNgamHopLe(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      n.id,
      n.ten_ngam,
      n.hang_so_huu_id

    FROM ngam_thiet_bi n

    JOIN hang_thiet_bi h
      ON h.id = n.hang_so_huu_id

    WHERE n.id = ${id}::uuid
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601
      AND h.da_xoa_luc IS NULL
      AND h.trang_thai = 601

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layHangHopLe(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_hang

    FROM hang_thiet_bi

    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = 601

    LIMIT 1
  `;

  return rows[0] || null;
}

// Chống trùng ở Backend, cùng cách tổ chức như hãng và danh mục.
// Các tên khác hoa/thường, khác dấu hoặc thừa khoảng trắng được xem là trùng.
async function timNgamTrungTen(tenNgam, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ten_ngam

    FROM ngam_thiet_bi

    WHERE da_xoa_luc IS NULL
  `;

  const tenMoi = chuanHoaTenDeSoSanh(tenNgam);

  return (
    rows.find((item) => {
      if (idBoQua && String(item.id) === String(idBoQua)) {
        return false;
      }

      return chuanHoaTenDeSoSanh(item.ten_ngam) === tenMoi;
    }) || null
  );
}

async function taoNgam({ tenNgam, hangId }) {
  const rows = await prisma.$queryRaw`
    INSERT INTO ngam_thiet_bi (
      id,
      ten_ngam,
      hang_so_huu_id,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenNgam},
      ${hangId}::uuid,
      601,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0];
}

async function capNhatNgam(id, { tenNgam, hangId }) {
  const rows = await prisma.$queryRaw`
    UPDATE ngam_thiet_bi
    SET
      ten_ngam = ${tenNgam},
      hang_so_huu_id = ${hangId}::uuid,
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

// Vẫn cho phép ẩn ngàm đang có mẫu sử dụng.
// Chỉ đổi trạng thái, không xóa mau_thiet_bi.ngam_id.
async function capNhatTrangThaiNgam(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE ngam_thiet_bi
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
  layDanhSachNgam,
  layDanhSachNgamDangHienThi,
  layNgamTheoId,
  layNgamHopLe,
  layHangHopLe,
  timNgamTrungTen,
  taoNgam,
  capNhatNgam,
  capNhatTrangThaiNgam,
};
