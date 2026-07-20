const prisma = require("../config/prisma");

const TRANG_THAI_THIET_BI_SAN_SANG = 501;
const TRANG_THAI_THIET_BI_BAO_TRI = 503;
const TRANG_THAI_THIET_BI_HU_HONG = 506;

const TRANG_THAI_BAO_TRI_DANG_BAO_TRI = 1301;
const TRANG_THAI_BAO_TRI_HOAN_THANH = 1302;

async function taoMaPhieuBaoTri(tx) {
  const ketQua = await tx.$queryRaw`
    SELECT
      CONCAT(
        'BT-',
        TO_CHAR(NOW(), 'YYYYMMDD'),
        '-',
        LPAD((COUNT(*) + 1)::text, 4, '0')
      ) AS ma_phieu_bao_tri
    FROM phieu_bao_tri
    WHERE bat_dau_luc::date = CURRENT_DATE
  `;

  return ketQua[0].ma_phieu_bao_tri;
}

async function demDanhSachBaoTri({ trangThai, tuKhoa }) {
  const tuKhoaTim = `%${tuKhoa || ""}%`;

  const ketQua = await prisma.$queryRaw`
    WITH ds AS (
      SELECT
        pbt.id,
        pbt.ma_phieu_bao_tri,
        pbt.ly_do,
        pbt.ket_qua,
        pbt.hoan_thanh_luc,
        tb.so_serial,
        mtb.ten_mau,
        dt.ma_don,
        CASE
          WHEN pbt.hoan_thanh_luc IS NOT NULL THEN ${TRANG_THAI_BAO_TRI_HOAN_THANH}
          ELSE COALESCE(pbt.trang_thai, ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI})
        END AS trang_thai_bao_tri
      FROM phieu_bao_tri pbt
      JOIN thiet_bi_vat_ly tb ON tb.id = pbt.thiet_bi_id
      JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
      LEFT JOIN don_thue dt ON dt.id = pbt.don_thue_id
    )
    SELECT COUNT(*)::int AS total
    FROM ds
    WHERE (${trangThai}::int IS NULL OR ds.trang_thai_bao_tri = ${trangThai}::int)
      AND (
        ${tuKhoa || ""} = ''
        OR LOWER(COALESCE(ds.ma_phieu_bao_tri, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ten_mau, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.so_serial, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ma_don, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ly_do, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ket_qua, '')) LIKE LOWER(${tuKhoaTim})
      )
  `;

  return ketQua[0]?.total || 0;
}

async function layDanhSachBaoTri({ trangThai, tuKhoa, limit, offset }) {
  const tuKhoaTim = `%${tuKhoa || ""}%`;

  return await prisma.$queryRaw`
    WITH ds AS (
      SELECT
        pbt.id,
        pbt.ma_phieu_bao_tri,
        pbt.thiet_bi_id,
        pbt.don_thue_id,
        pbt.ly_do,
        pbt.ket_qua,
        pbt.nguoi_tao_id,
        pbt.bat_dau_luc,
        pbt.hoan_thanh_luc,
        tb.so_serial,
        mtb.ten_mau,
        nd.ho_ten AS ten_nguoi_tao,
        dt.ma_don,
        CASE
          WHEN pbt.hoan_thanh_luc IS NOT NULL THEN ${TRANG_THAI_BAO_TRI_HOAN_THANH}
          ELSE COALESCE(pbt.trang_thai, ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI})
        END AS trang_thai_bao_tri
      FROM phieu_bao_tri pbt
      JOIN thiet_bi_vat_ly tb ON tb.id = pbt.thiet_bi_id
      JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
      LEFT JOIN nguoi_dung nd ON nd.id = pbt.nguoi_tao_id
      LEFT JOIN don_thue dt ON dt.id = pbt.don_thue_id
    )
    SELECT
      ds.*,
      tt.ten_trang_thai AS ten_trang_thai_bao_tri
    FROM ds
    LEFT JOIN trang_thai_he_thong tt ON tt.id = ds.trang_thai_bao_tri
    WHERE (${trangThai}::int IS NULL OR ds.trang_thai_bao_tri = ${trangThai}::int)
      AND (
        ${tuKhoa || ""} = ''
        OR LOWER(COALESCE(ds.ma_phieu_bao_tri, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ten_mau, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.so_serial, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ma_don, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ly_do, '')) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(ds.ket_qua, '')) LIKE LOWER(${tuKhoaTim})
      )
    ORDER BY ds.bat_dau_luc DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

async function layChiTietBaoTri(id) {
  const ketQua = await prisma.$queryRaw`
    WITH ds AS (
      SELECT
        pbt.id,
        pbt.ma_phieu_bao_tri,
        pbt.thiet_bi_id,
        pbt.don_thue_id,
        pbt.ly_do,
        pbt.ket_qua,
        pbt.nguoi_tao_id,
        pbt.bat_dau_luc,
        pbt.hoan_thanh_luc,
        tb.so_serial,
        mtb.ten_mau,
        nd.ho_ten AS ten_nguoi_tao,
        dt.ma_don,
        CASE
          WHEN pbt.hoan_thanh_luc IS NOT NULL THEN ${TRANG_THAI_BAO_TRI_HOAN_THANH}
          ELSE COALESCE(pbt.trang_thai, ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI})
        END AS trang_thai_bao_tri
      FROM phieu_bao_tri pbt
      JOIN thiet_bi_vat_ly tb ON tb.id = pbt.thiet_bi_id
      JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
      LEFT JOIN nguoi_dung nd ON nd.id = pbt.nguoi_tao_id
      LEFT JOIN don_thue dt ON dt.id = pbt.don_thue_id
      WHERE pbt.id = ${id}::uuid
      LIMIT 1
    )
    SELECT
      ds.*,
      tt.ten_trang_thai AS ten_trang_thai_bao_tri
    FROM ds
    LEFT JOIN trang_thai_he_thong tt ON tt.id = ds.trang_thai_bao_tri
  `;

  return ketQua[0] || null;
}

async function taoBaoTriTuThietBi({ thietBiId, lyDo, nguoiTaoId }) {
  return await prisma.$transaction(async (tx) => {
    const thietBi = await tx.$queryRaw`
      SELECT id, trang_thai
      FROM thiet_bi_vat_ly
      WHERE id = ${thietBiId}::uuid
        AND da_xoa_luc IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    if (thietBi.length === 0) {
      throw new Error("Không tìm thấy thiết bị vật lý");
    }

    if (Number(thietBi[0].trang_thai) !== TRANG_THAI_THIET_BI_SAN_SANG) {
      throw new Error("Chỉ tạo bảo trì cho thiết bị đang Sẵn sàng");
    }

    const dangBaoTri = await tx.$queryRaw`
      SELECT id
      FROM phieu_bao_tri
      WHERE thiet_bi_id = ${thietBiId}::uuid
        AND trang_thai = ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI}
        AND hoan_thanh_luc IS NULL
      LIMIT 1
    `;

    if (dangBaoTri.length > 0) {
      throw new Error("Thiết bị này đang có phiếu bảo trì chưa hoàn thành");
    }

    const maPhieu = await taoMaPhieuBaoTri(tx);

    const phieu = await tx.$queryRaw`
      INSERT INTO phieu_bao_tri (
        id,
        ma_phieu_bao_tri,
        thiet_bi_id,
        don_thue_id,
        ly_do,
        nguoi_tao_id,
        trang_thai,
        bat_dau_luc
      )
      VALUES (
        gen_random_uuid(),
        ${maPhieu},
        ${thietBiId}::uuid,
        NULL,
        ${lyDo},
        ${nguoiTaoId}::uuid,
        ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI},
        NOW()
      )
      RETURNING *
    `;

    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET
        trang_thai = ${TRANG_THAI_THIET_BI_BAO_TRI},
        updated_at = NOW()
      WHERE id = ${thietBiId}::uuid
    `;

    return phieu[0];
  });
}

async function capNhatKetQuaBaoTri({ id, ketQua, trangThaiSauBaoTri }) {
  return await prisma.$transaction(async (tx) => {
    const phieu = await tx.$queryRaw`
      SELECT id, thiet_bi_id, trang_thai, hoan_thanh_luc
      FROM phieu_bao_tri
      WHERE id = ${id}::uuid
      LIMIT 1
      FOR UPDATE
    `;

    if (phieu.length === 0) {
      throw new Error("Không tìm thấy phiếu bảo trì");
    }

    if (phieu[0].hoan_thanh_luc || Number(phieu[0].trang_thai) === TRANG_THAI_BAO_TRI_HOAN_THANH) {
      throw new Error("Phiếu bảo trì này đã hoàn thành");
    }

    const thietBi = await tx.$queryRaw`
      SELECT id, trang_thai
      FROM thiet_bi_vat_ly
      WHERE id = ${phieu[0].thiet_bi_id}::uuid
        AND da_xoa_luc IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    if (thietBi.length === 0) {
      throw new Error("Không tìm thấy thiết bị vật lý");
    }

    if (Number(thietBi[0].trang_thai) !== TRANG_THAI_THIET_BI_BAO_TRI) {
      throw new Error("Chỉ cập nhật kết quả cho thiết bị đang Bảo trì");
    }

    await tx.$executeRaw`
      UPDATE phieu_bao_tri
      SET
        ket_qua = ${ketQua},
        trang_thai = ${TRANG_THAI_BAO_TRI_HOAN_THANH},
        hoan_thanh_luc = NOW()
      WHERE id = ${id}::uuid
    `;

    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET
        trang_thai = ${trangThaiSauBaoTri},
        updated_at = NOW()
      WHERE id = ${phieu[0].thiet_bi_id}::uuid
    `;

    return {
      id,
      thiet_bi_id: phieu[0].thiet_bi_id,
      ket_qua: ketQua,
      trang_thai_bao_tri: TRANG_THAI_BAO_TRI_HOAN_THANH,
      trang_thai_sau_bao_tri: trangThaiSauBaoTri,
    };
  });
}

module.exports = {
  TRANG_THAI_THIET_BI_SAN_SANG,
  TRANG_THAI_THIET_BI_BAO_TRI,
  TRANG_THAI_THIET_BI_HU_HONG,
  TRANG_THAI_BAO_TRI_DANG_BAO_TRI,
  TRANG_THAI_BAO_TRI_HOAN_THANH,

  taoMaPhieuBaoTri,
  demDanhSachBaoTri,
  layDanhSachBaoTri,
  layChiTietBaoTri,
  taoBaoTriTuThietBi,
  capNhatKetQuaBaoTri,
};
