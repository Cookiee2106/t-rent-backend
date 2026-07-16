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

function docSoLuongBoDiKem(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so <= 0) {
    throw new Error("so_luong phải là số nguyên lớn hơn 0");
  }

  return so;
}

async function layThongTinMauThietBiChinh(id) {
  const danhSach = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb
    JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSach.length === 0) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  return danhSach[0];
}

async function layDanhSachBoDiKemAdminService(mauThietBiChinhId) {
  await layThongTinMauThietBiChinh(mauThietBiChinhId);

  const danhSach = await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.so_luong,
      bdk.created_at,
      mtb_phu.id AS mau_thiet_bi_phu_id,
      mtb_phu.ten_hang AS ten_hang_thiet_bi_phu,
      mtb_phu.ten_mau AS ten_mau_thiet_bi_phu,
      dmtb_phu.ten_danh_muc AS ten_danh_muc_thiet_bi_phu,
      pk.id AS phu_kien_id,
      pk.ten_phu_kien,
      pk.tong_so_luong
    FROM bo_di_kem bdk
    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id
    LEFT JOIN danh_muc_thiet_bi dmtb_phu
      ON dmtb_phu.id = mtb_phu.danh_muc_id
    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id
    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
    ORDER BY bdk.created_at ASC
  `;

  return danhSach.map((item) => ({
    ...item,
    so_luong: Number(item.so_luong),
    tong_so_luong: item.tong_so_luong === null ? null : Number(item.tong_so_luong),
    loai_bo_di_kem: item.mau_thiet_bi_phu_id ? "thiet_bi_phu" : "phu_kien",
  }));
}

async function layGoiYBoDiKemAdminService(mauThietBiChinhId, query = {}) {
  const mauChinh = await layThongTinMauThietBiChinh(mauThietBiChinhId);
  const tuKhoa = chuanHoaChuoi(query.q);
  const khoaTim = tuKhoa ? `%${tuKhoa}%` : null;

  const thietBiPhu = mauChinh.ten_hang
    ? await prisma.$queryRaw`
        SELECT
          mtb.id,
          mtb.ten_mau,
          mtb.ten_hang,
          dmtb.ten_danh_muc
        FROM mau_thiet_bi mtb
        JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
        WHERE mtb.da_xoa_luc IS NULL
          AND mtb.id <> ${mauThietBiChinhId}::uuid
          AND (
            (dmtb.tinh_chat_id = 2502 AND mtb.ten_hang = ${mauChinh.ten_hang})
            OR dmtb.ten_danh_muc = ${"Thẻ nhớ"}
          )
          AND NOT EXISTS (
            SELECT 1
            FROM bo_di_kem bdk
            WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
              AND bdk.mau_thiet_bi_phu_id = mtb.id
          )
          AND (
            ${khoaTim || ""} = ''
            OR mtb.ten_mau ILIKE ${khoaTim || ""}
            OR COALESCE(mtb.ten_hang, '') ILIKE ${khoaTim || ""}
            OR dmtb.ten_danh_muc ILIKE ${khoaTim || ""}
          )
        ORDER BY mtb.ten_mau ASC
        LIMIT 20
      `
    : await prisma.$queryRaw`
        SELECT
          mtb.id,
          mtb.ten_mau,
          mtb.ten_hang,
          dmtb.ten_danh_muc
        FROM mau_thiet_bi mtb
        JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
        WHERE mtb.da_xoa_luc IS NULL
          AND mtb.id <> ${mauThietBiChinhId}::uuid
          AND dmtb.ten_danh_muc = ${"Thẻ nhớ"}
          AND NOT EXISTS (
            SELECT 1
            FROM bo_di_kem bdk
            WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
              AND bdk.mau_thiet_bi_phu_id = mtb.id
          )
          AND (
            ${khoaTim || ""} = ''
            OR mtb.ten_mau ILIKE ${khoaTim || ""}
            OR COALESCE(mtb.ten_hang, '') ILIKE ${khoaTim || ""}
            OR dmtb.ten_danh_muc ILIKE ${khoaTim || ""}
          )
        ORDER BY mtb.ten_mau ASC
        LIMIT 20
      `;

  const phuKien = await prisma.$queryRaw`
    SELECT
      pk.id,
      pk.ten_phu_kien,
      NULL::text AS ten_hang,
      pk.tong_so_luong
    FROM phu_kien pk
    WHERE pk.da_xoa_luc IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM bo_di_kem bdk
        WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
          AND bdk.phu_kien_id = pk.id
      )
    ORDER BY pk.ten_phu_kien ASC
    LIMIT 20
  `;

  return {
    thiet_bi_phu: thietBiPhu,
    phu_kien: phuKien.map((item) => ({
      ...item,
      tong_so_luong: Number(item.tong_so_luong),
    })),
  };
}

async function taoBoDiKemAdminService(mauThietBiChinhId, body = {}) {
  const mauChinh = await layThongTinMauThietBiChinh(mauThietBiChinhId);
  const mauThietBiPhuId = chuanHoaChuoi(body.mau_thiet_bi_phu_id);
  const phuKienId = chuanHoaChuoi(body.phu_kien_id);
  const soLuong = docSoLuongBoDiKem(body.so_luong);

  if ((mauThietBiPhuId && phuKienId) || (!mauThietBiPhuId && !phuKienId)) {
    throw new Error("Cần cung cấp đúng một trong hai trường mau_thiet_bi_phu_id hoặc phu_kien_id");
  }

  if (mauThietBiPhuId) {
    const danhSach = await prisma.$queryRaw`
      SELECT
        mtb.id,
        mtb.ten_hang,
        mtb.ten_mau,
        dmtb.ten_danh_muc,
        dmtb.tinh_chat_id
      FROM mau_thiet_bi mtb
      JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
      WHERE mtb.id = ${mauThietBiPhuId}::uuid
        AND mtb.da_xoa_luc IS NULL
      LIMIT 1
    `;

    if (danhSach.length === 0) {
      throw new Error("Mẫu thiết bị phụ không tồn tại");
    }

    const mauPhu = danhSach[0];
    const hopLe =
      ((mauChinh.ten_hang && mauPhu.ten_hang === mauChinh.ten_hang && mauPhu.tinh_chat_id === 2502) ||
        mauPhu.ten_danh_muc === "Thẻ nhớ");

    if (!hopLe) {
      throw new Error("Mẫu thiết bị phụ không phù hợp với cấu hình bộ đi kèm của mẫu chính");
    }

    const tonTai = await prisma.$queryRaw`
      SELECT id
      FROM bo_di_kem
      WHERE mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
        AND mau_thiet_bi_phu_id = ${mauThietBiPhuId}::uuid
      LIMIT 1
    `;

    if (tonTai.length > 0) {
      throw new Error("Thiết bị phụ này đã tồn tại trong bộ đi kèm");
    }

    await prisma.$executeRaw`
      INSERT INTO bo_di_kem (
        id,
        mau_thiet_bi_chinh_id,
        mau_thiet_bi_phu_id,
        phu_kien_id,
        so_luong,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${mauThietBiChinhId}::uuid,
        ${mauThietBiPhuId}::uuid,
        NULL,
        ${soLuong},
        NOW()
      )
    `;
  } else {
    const danhSach = await prisma.$queryRaw`
      SELECT id, ten_phu_kien, tong_so_luong
      FROM phu_kien
      WHERE id = ${phuKienId}::uuid
        AND da_xoa_luc IS NULL
      LIMIT 1
    `;

    if (danhSach.length === 0) {
      throw new Error("Phụ kiện không tồn tại");
    }

    const tonTai = await prisma.$queryRaw`
      SELECT id
      FROM bo_di_kem
      WHERE mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
        AND phu_kien_id = ${phuKienId}::uuid
      LIMIT 1
    `;

    if (tonTai.length > 0) {
      throw new Error("Phụ kiện này đã tồn tại trong bộ đi kèm");
    }

    await prisma.$executeRaw`
      INSERT INTO bo_di_kem (
        id,
        mau_thiet_bi_chinh_id,
        mau_thiet_bi_phu_id,
        phu_kien_id,
        so_luong,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${mauThietBiChinhId}::uuid,
        NULL,
        ${phuKienId}::uuid,
        ${soLuong},
        NOW()
      )
    `;
  }

  return layDanhSachBoDiKemAdminService(mauThietBiChinhId);
}

async function xoaBoDiKemAdminService(mauThietBiChinhId, bundleId) {
  await layThongTinMauThietBiChinh(mauThietBiChinhId);

  const tonTai = await prisma.$queryRaw`
    SELECT id
    FROM bo_di_kem
    WHERE id = ${bundleId}::uuid
      AND mau_thiet_bi_chinh_id = ${mauThietBiChinhId}::uuid
    LIMIT 1
  `;

  if (tonTai.length === 0) {
    throw new Error("Không tìm thấy món trong bộ đi kèm");
  }

  await prisma.$executeRaw`
    DELETE FROM bo_di_kem
    WHERE id = ${bundleId}::uuid
  `;

  return { message: "Xóa món khỏi bộ đi kèm thành công" };
}

module.exports = {
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
  layDanhSachBoDiKemAdminService,
  layGoiYBoDiKemAdminService,
  taoBoDiKemAdminService,
  xoaBoDiKemAdminService,
};
