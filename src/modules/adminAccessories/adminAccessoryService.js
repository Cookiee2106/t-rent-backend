const prisma = require("../../config/prisma");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return null;
  }

  const ketQua = String(giaTri).trim();
  return ketQua || null;
}

function docTongSoLuong(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error("tong_so_luong phải là số nguyên lớn hơn hoặc bằng 0");
  }

  return so;
}

async function layPhuKienTheoId(id) {
  const danhSach = await prisma.$queryRaw`
    SELECT
      id,
      ten_phu_kien,
      ten_hang,
      tong_so_luong,
      vi_tri_luu_tru,
      ghi_chu,
      da_xoa_luc,
      created_at,
      updated_at
    FROM phu_kien
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSach.length === 0) {
    throw new Error("Không tìm thấy phụ kiện");
  }

  const phuKien = danhSach[0];

  return {
    ...phuKien,
    tong_so_luong: Number(phuKien.tong_so_luong),
  };
}

async function kiemTraTenPhuKienTrung(tenPhuKien, idLoaiTru = null) {
  const danhSach = idLoaiTru
    ? await prisma.$queryRaw`
        SELECT id
        FROM phu_kien
        WHERE LOWER(ten_phu_kien) = LOWER(${tenPhuKien})
          AND id <> ${idLoaiTru}::uuid
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id
        FROM phu_kien
        WHERE LOWER(ten_phu_kien) = LOWER(${tenPhuKien})
        LIMIT 1
      `;

  if (danhSach.length > 0) {
    throw new Error("Tên phụ kiện đã tồn tại");
  }
}

async function layDanhSachPhuKienAdminService() {
  const danhSach = await prisma.$queryRaw`
    SELECT
      id,
      ten_phu_kien,
      ten_hang,
      tong_so_luong,
      vi_tri_luu_tru,
      ghi_chu,
      created_at,
      updated_at
    FROM phu_kien
    WHERE da_xoa_luc IS NULL
    ORDER BY created_at DESC
  `;

  return danhSach.map((item) => ({
    ...item,
    tong_so_luong: Number(item.tong_so_luong),
  }));
}

async function layChiTietPhuKienAdminService(id) {
  return layPhuKienTheoId(id);
}

async function taoPhuKienAdminService(body = {}) {
  const tenPhuKien = chuanHoaChuoi(body.ten_phu_kien);
  const tenHang = chuanHoaChuoi(body.ten_hang);
  const viTriLuuTru = chuanHoaChuoi(body.vi_tri_luu_tru);
  const ghiChu = chuanHoaChuoi(body.ghi_chu);
  const tongSoLuong = docTongSoLuong(body.tong_so_luong ?? 0);

  if (!tenPhuKien) {
    throw new Error("ten_phu_kien là bắt buộc");
  }

  await kiemTraTenPhuKienTrung(tenPhuKien);

  const ketQua = await prisma.$queryRaw`
    INSERT INTO phu_kien (
      id,
      ten_phu_kien,
      ten_hang,
      tong_so_luong,
      vi_tri_luu_tru,
      ghi_chu,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${tenPhuKien},
      ${tenHang},
      ${tongSoLuong},
      ${viTriLuuTru},
      ${ghiChu},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return layPhuKienTheoId(ketQua[0].id);
}

async function capNhatPhuKienAdminService(id, body = {}) {
  const hienTai = await layPhuKienTheoId(id);

  const coTruongCapNhat = [
    "ten_phu_kien",
    "ten_hang",
    "tong_so_luong",
    "vi_tri_luu_tru",
    "ghi_chu",
  ].some((truong) => Object.prototype.hasOwnProperty.call(body, truong));

  if (!coTruongCapNhat) {
    throw new Error("Không có dữ liệu để cập nhật");
  }

  const tenPhuKien = Object.prototype.hasOwnProperty.call(body, "ten_phu_kien")
    ? chuanHoaChuoi(body.ten_phu_kien)
    : hienTai.ten_phu_kien;
  const tenHang = Object.prototype.hasOwnProperty.call(body, "ten_hang")
    ? chuanHoaChuoi(body.ten_hang)
    : hienTai.ten_hang;
  const viTriLuuTru = Object.prototype.hasOwnProperty.call(body, "vi_tri_luu_tru")
    ? chuanHoaChuoi(body.vi_tri_luu_tru)
    : hienTai.vi_tri_luu_tru;
  const ghiChu = Object.prototype.hasOwnProperty.call(body, "ghi_chu")
    ? chuanHoaChuoi(body.ghi_chu)
    : hienTai.ghi_chu;
  const tongSoLuong = Object.prototype.hasOwnProperty.call(body, "tong_so_luong")
    ? docTongSoLuong(body.tong_so_luong)
    : Number(hienTai.tong_so_luong);

  if (!tenPhuKien) {
    throw new Error("ten_phu_kien không được để trống");
  }

  await kiemTraTenPhuKienTrung(tenPhuKien, id);

  await prisma.$executeRaw`
    UPDATE phu_kien
    SET
      ten_phu_kien = ${tenPhuKien},
      ten_hang = ${tenHang},
      tong_so_luong = ${tongSoLuong},
      vi_tri_luu_tru = ${viTriLuuTru},
      ghi_chu = ${ghiChu},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
  `;

  return layPhuKienTheoId(id);
}

async function xoaMemPhuKienAdminService(id) {
  await layPhuKienTheoId(id);

  await prisma.$executeRaw`
    UPDATE phu_kien
    SET
      da_xoa_luc = NOW(),
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
  `;

  return { message: "Xóa mềm phụ kiện thành công" };
}

module.exports = {
  layDanhSachPhuKienAdminService,
  layChiTietPhuKienAdminService,
  taoPhuKienAdminService,
  capNhatPhuKienAdminService,
  xoaMemPhuKienAdminService,
};
