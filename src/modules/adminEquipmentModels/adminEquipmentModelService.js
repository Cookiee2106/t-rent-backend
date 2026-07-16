const prisma = require("../../config/prisma");

const TRANG_THAI_MAU_THIET_BI_HIEN_THI = 601;
const TRANG_THAI_MAU_THIET_BI_DA_AN = 602;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return null;
  }

  const ketQua = String(giaTri).trim();
  return ketQua || null;
}

function docGiaTriTien(giaTri, tenTruong) {
  if (giaTri === undefined) {
    return undefined;
  }

  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error(`${tenTruong} phải là số nguyên lớn hơn hoặc bằng 0`);
  }

  return so;
}

async function layDanhMucHopLe(danhMucId) {
  const danhSach = await prisma.$queryRaw`
    SELECT id, ten_danh_muc
    FROM danh_muc_thiet_bi
    WHERE id = ${danhMucId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return danhSach[0] || null;
}

async function layMauThietBiAdminTheoId(id) {
  const danhSach = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      mtb.trang_thai,
      tt.ten_trang_thai,
      mtb.created_at,
      mtb.updated_at
    FROM mau_thiet_bi mtb
    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = mtb.trang_thai
    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSach.length === 0) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  const mau = danhSach[0];

  return {
    ...mau,
    gia_thue_ngay: Number(mau.gia_thue_ngay),
    tien_coc: Number(mau.tien_coc),
  };
}

async function kiemTraTenMauTrung(tenMau, idLoaiTru = null) {
  const danhSach = idLoaiTru
    ? await prisma.$queryRaw`
        SELECT id
        FROM mau_thiet_bi
        WHERE LOWER(ten_mau) = LOWER(${tenMau})
          AND id <> ${idLoaiTru}::uuid
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id
        FROM mau_thiet_bi
        WHERE LOWER(ten_mau) = LOWER(${tenMau})
        LIMIT 1
      `;

  if (danhSach.length > 0) {
    throw new Error("Tên mẫu thiết bị đã tồn tại");
  }
}

function kiemTraTrangThaiHopLe(trangThai) {
  const giaTri = Number(trangThai);

  if (
    giaTri !== TRANG_THAI_MAU_THIET_BI_HIEN_THI &&
    giaTri !== TRANG_THAI_MAU_THIET_BI_DA_AN
  ) {
    throw new Error("trang_thai chỉ chấp nhận 601 hoặc 602");
  }

  return giaTri;
}

async function taoMauThietBiAdminService(body = {}) {
  const danh_muc_id = chuanHoaChuoi(body.danh_muc_id);
  const ten_hang = chuanHoaChuoi(body.ten_hang);
  const ten_mau = chuanHoaChuoi(body.ten_mau);
  const mo_ta = chuanHoaChuoi(body.mo_ta);
  const anh_url = chuanHoaChuoi(body.anh_url);
  const gia_thue_ngay = docGiaTriTien(body.gia_thue_ngay ?? 0, "gia_thue_ngay");
  const tien_coc = docGiaTriTien(body.tien_coc ?? 0, "tien_coc");

  if (!danh_muc_id) {
    throw new Error("danh_muc_id là bắt buộc");
  }

  if (!ten_mau) {
    throw new Error("ten_mau là bắt buộc");
  }

  const danhMuc = await layDanhMucHopLe(danh_muc_id);

  if (!danhMuc) {
    throw new Error("Danh mục thiết bị không tồn tại");
  }

  await kiemTraTenMauTrung(ten_mau);

  const ketQua = await prisma.$queryRaw`
    INSERT INTO mau_thiet_bi (
      id,
      danh_muc_id,
      ten_hang,
      ten_mau,
      mo_ta,
      anh_url,
      gia_thue_ngay,
      tien_coc,
      trang_thai,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${danh_muc_id}::uuid,
      ${ten_hang},
      ${ten_mau},
      ${mo_ta},
      ${anh_url},
      ${gia_thue_ngay},
      ${tien_coc},
      ${TRANG_THAI_MAU_THIET_BI_HIEN_THI},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return layMauThietBiAdminTheoId(ketQua[0].id);
}

async function capNhatMauThietBiAdminService(id, body = {}) {
  const mauHienTai = await layMauThietBiAdminTheoId(id);

  const coTruongCapNhat = [
    "danh_muc_id",
    "ten_hang",
    "ten_mau",
    "mo_ta",
    "anh_url",
    "gia_thue_ngay",
    "tien_coc",
  ].some((truong) => Object.prototype.hasOwnProperty.call(body, truong));

  if (!coTruongCapNhat) {
    throw new Error("Không có dữ liệu để cập nhật");
  }

  const danh_muc_id = Object.prototype.hasOwnProperty.call(body, "danh_muc_id")
    ? chuanHoaChuoi(body.danh_muc_id)
    : mauHienTai.danh_muc_id;

  if (!danh_muc_id) {
    throw new Error("danh_muc_id không hợp lệ");
  }

  const ten_hang = Object.prototype.hasOwnProperty.call(body, "ten_hang")
    ? chuanHoaChuoi(body.ten_hang)
    : mauHienTai.ten_hang;

  const ten_mau = Object.prototype.hasOwnProperty.call(body, "ten_mau")
    ? chuanHoaChuoi(body.ten_mau)
    : mauHienTai.ten_mau;

  const mo_ta = Object.prototype.hasOwnProperty.call(body, "mo_ta")
    ? chuanHoaChuoi(body.mo_ta)
    : mauHienTai.mo_ta;

  const anh_url = Object.prototype.hasOwnProperty.call(body, "anh_url")
    ? chuanHoaChuoi(body.anh_url)
    : mauHienTai.anh_url;

  const gia_thue_ngay = Object.prototype.hasOwnProperty.call(body, "gia_thue_ngay")
    ? docGiaTriTien(body.gia_thue_ngay, "gia_thue_ngay")
    : Number(mauHienTai.gia_thue_ngay);

  const tien_coc = Object.prototype.hasOwnProperty.call(body, "tien_coc")
    ? docGiaTriTien(body.tien_coc, "tien_coc")
    : Number(mauHienTai.tien_coc);

  if (!ten_mau) {
    throw new Error("ten_mau không được để trống");
  }

  const danhMuc = await layDanhMucHopLe(danh_muc_id);

  if (!danhMuc) {
    throw new Error("Danh mục thiết bị không tồn tại");
  }

  await kiemTraTenMauTrung(ten_mau, id);

  await prisma.$executeRaw`
    UPDATE mau_thiet_bi
    SET
      danh_muc_id = ${danh_muc_id}::uuid,
      ten_hang = ${ten_hang},
      ten_mau = ${ten_mau},
      mo_ta = ${mo_ta},
      anh_url = ${anh_url},
      gia_thue_ngay = ${gia_thue_ngay},
      tien_coc = ${tien_coc},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
  `;

  return layMauThietBiAdminTheoId(id);
}

async function capNhatTrangThaiMauThietBiAdminService(id, body = {}) {
  await layMauThietBiAdminTheoId(id);

  const trangThai = kiemTraTrangThaiHopLe(body.trang_thai);

  await prisma.$executeRaw`
    UPDATE mau_thiet_bi
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${id}::uuid
      AND da_xoa_luc IS NULL
  `;

  return layMauThietBiAdminTheoId(id);
}

module.exports = {
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
};
