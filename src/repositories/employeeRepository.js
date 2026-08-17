const prisma = require("../config/prisma");

const VAI_TRO_NHAN_VIEN = "NHAN_VIEN";

async function layDanhSachNhanVien() {
  return await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.so_cccd,
      nd.dia_chi,
      nd.vai_tro,
      nd.trang_thai,
      tt.ten_trang_thai,
      nd.created_at,
      nd.updated_at
    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = nd.trang_thai

    WHERE nd.vai_tro = ${VAI_TRO_NHAN_VIEN}
      AND nd.da_xoa_luc IS NULL

    ORDER BY nd.created_at DESC
  `;
}

async function layChiTietNhanVien(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.so_cccd,
      nd.dia_chi,
      nd.vai_tro,
      nd.trang_thai,
      tt.ten_trang_thai,
      nd.created_at,
      nd.updated_at
    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = nd.trang_thai

    WHERE nd.id = ${id}::uuid
      AND nd.vai_tro = ${VAI_TRO_NHAN_VIEN}
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function timTrungEmailHoacSoDienThoai(email, soDienThoai, idBoQua = null) {
  const rows = await prisma.$queryRaw`
    SELECT id, email, so_dien_thoai
    FROM nguoi_dung
    WHERE da_xoa_luc IS NULL
      AND (${idBoQua}::uuid IS NULL OR id <> ${idBoQua}::uuid)
      AND (
        email = ${email}
        OR (
          ${soDienThoai}::text IS NOT NULL
          AND so_dien_thoai = ${soDienThoai}
        )
      )
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timTrungCccd(soCccd, idBoQua = null) {
  if (!soCccd) return null;

  const rows = await prisma.$queryRaw`
    SELECT id, so_cccd
    FROM nguoi_dung
    WHERE da_xoa_luc IS NULL
      AND so_cccd = ${soCccd}
      AND (${idBoQua}::uuid IS NULL OR id <> ${idBoQua}::uuid)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function themNhanVien({
  hoTen,
  email,
  soDienThoai,
  soCccd,
  diaChi,
  matKhauHash,
  trangThai,
}) {
  const rows = await prisma.$queryRaw`
    INSERT INTO nguoi_dung (
      ho_ten,
      email,
      so_dien_thoai,
      so_cccd,
      dia_chi,
      mat_khau_hash,
      vai_tro,
      trang_thai
    )
    VALUES (
      ${hoTen},
      ${email},
      ${soDienThoai},
      ${soCccd},
      ${diaChi},
      ${matKhauHash},
      ${VAI_TRO_NHAN_VIEN},
      ${trangThai}
    )
    RETURNING
      id,
      ho_ten,
      email,
      so_dien_thoai,
      so_cccd,
      dia_chi,
      vai_tro,
      trang_thai,
      created_at,
      updated_at
  `;

  return rows[0];
}

async function capNhatNhanVien(id, { hoTen, soDienThoai, soCccd, diaChi }) {
  const rows = await prisma.$queryRaw`
    UPDATE nguoi_dung
    SET
      ho_ten = ${hoTen},
      so_dien_thoai = ${soDienThoai},
      so_cccd = ${soCccd},
      dia_chi = ${diaChi},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND vai_tro = ${VAI_TRO_NHAN_VIEN}
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiNhanVien(id, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE nguoi_dung
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND vai_tro = ${VAI_TRO_NHAN_VIEN}
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function xoaMemNhanVien(id) {
  const rows = await prisma.$queryRaw`
    UPDATE nguoi_dung
    SET
      da_xoa_luc = NOW(),
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND vai_tro = ${VAI_TRO_NHAN_VIEN}
      AND da_xoa_luc IS NULL
    RETURNING id, ho_ten, email
  `;

  return rows[0] || null;
}

module.exports = {
  layDanhSachNhanVien,
  layChiTietNhanVien,
  timTrungEmailHoacSoDienThoai,
  timTrungCccd,
  themNhanVien,
  capNhatNhanVien,
  capNhatTrangThaiNhanVien,
  xoaMemNhanVien,
};