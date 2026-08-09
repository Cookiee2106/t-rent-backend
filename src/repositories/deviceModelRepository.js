const prisma = require("../config/prisma");

// Repository bản gọn:
// Chỉ giữ các truy vấn đang được DeviceModelModel sử dụng.
const { Prisma } = require("@prisma/client");

function loaiBoIdTrung(danhSachId = []) {
  return [...new Set(danhSachId.filter(Boolean).map(String))];
}

async function layBoDiKemCuaMau(mauThietBiId) {
  return await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.mau_thiet_bi_chinh_id,
      bdk.so_luong,

      mtb_phu.id AS mau_thiet_bi_phu_id,
      h_phu.ten_hang AS ten_hang_phu,
      mtb_phu.ten_mau AS ten_mau_phu,
      dmtb_phu.ten_danh_muc AS ten_danh_muc_phu,

      pk.id AS phu_kien_id,
      pk.ten_phu_kien,
      NULL::text AS ten_hang_phu_kien,
      dmtb_pk.ten_danh_muc AS ten_danh_muc_phu_kien,
      pk.ngam_id AS ngam_id_phu_kien,
      n_pk.ten_ngam AS ten_ngam_phu_kien

    FROM bo_di_kem bdk

    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id

    LEFT JOIN hang_thiet_bi h_phu
      ON h_phu.id = mtb_phu.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb_phu
      ON dmtb_phu.id = mtb_phu.danh_muc_id

    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id

    LEFT JOIN danh_muc_thiet_bi dmtb_pk
      ON dmtb_pk.id = pk.danh_muc_id

    LEFT JOIN ngam_thiet_bi n_pk
      ON n_pk.id = pk.ngam_id
      AND n_pk.da_xoa_luc IS NULL

    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid

    ORDER BY bdk.created_at ASC
  `;
}

// Lấy bộ đi kèm của tất cả mẫu trong một lần truy vấn.
// Không còn gọi một query riêng cho từng mẫu.
async function layBoDiKemCuaNhieuMau(danhSachMauId = []) {
  const danhSachId = loaiBoIdTrung(danhSachMauId);

  if (danhSachId.length === 0) {
    return [];
  }

  const danhSachIdSql = Prisma.join(
    danhSachId.map((id) => Prisma.sql`${id}::uuid`)
  );

  return await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.mau_thiet_bi_chinh_id,
      bdk.so_luong,

      mtb_phu.id AS mau_thiet_bi_phu_id,
      h_phu.ten_hang AS ten_hang_phu,
      mtb_phu.ten_mau AS ten_mau_phu,
      dmtb_phu.ten_danh_muc AS ten_danh_muc_phu,

      pk.id AS phu_kien_id,
      pk.ten_phu_kien,
      NULL::text AS ten_hang_phu_kien,
      dmtb_pk.ten_danh_muc AS ten_danh_muc_phu_kien,
      pk.ngam_id AS ngam_id_phu_kien,
      n_pk.ten_ngam AS ten_ngam_phu_kien

    FROM bo_di_kem bdk

    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id

    LEFT JOIN hang_thiet_bi h_phu
      ON h_phu.id = mtb_phu.hang_id

    LEFT JOIN danh_muc_thiet_bi dmtb_phu
      ON dmtb_phu.id = mtb_phu.danh_muc_id

    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id

    LEFT JOIN danh_muc_thiet_bi dmtb_pk
      ON dmtb_pk.id = pk.danh_muc_id

    LEFT JOIN ngam_thiet_bi n_pk
      ON n_pk.id = pk.ngam_id
      AND n_pk.da_xoa_luc IS NULL

    WHERE bdk.mau_thiet_bi_chinh_id IN (${danhSachIdSql})

    ORDER BY
      bdk.mau_thiet_bi_chinh_id,
      bdk.created_at ASC
  `;
}

async function layDanhSachMauThietBi({
  hangId = "",
  danhMucId = "",
  nhuCauId = "",
  giaTu = null,
  giaDen = null,
  ngamIdBatBuoc = "",
} = {}) {
  const coLocHang = Boolean(hangId);
  const coLocDanhMuc = Boolean(danhMucId);
  const coLocNhuCau = Boolean(nhuCauId);
  const coLocGiaTu = giaTu !== null;
  const coLocGiaDen = giaDen !== null;
  const coLocNgam = Boolean(ngamIdBatBuoc);

  // Đếm số thiết bị theo nhóm trước rồi JOIN vào danh sách mẫu.
  // Nhu cầu được gom thành JSON để không làm trùng dòng mẫu thiết bị.
  return await prisma.$queryRaw`
    WITH so_luong_tai_san AS (
      SELECT
        tbvl.mau_thiet_bi_id,
        COUNT(*)::int AS tong_san_sang

      FROM thiet_bi_vat_ly tbvl

      WHERE tbvl.trang_thai = 501
        AND tbvl.da_xoa_luc IS NULL

      GROUP BY tbvl.mau_thiet_bi_id
    )

    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,

      mtb.hang_id,
      h.ten_hang,

      -- Chỉ trả ngàm đang hiển thị.
      -- Mẫu cũ vẫn giữ liên kết trong database khi ngàm bị ẩn.
      n.id AS ngam_id,
      n.ten_ngam,

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,

      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', nc.id,
              'ten_nhu_cau', nc.ten_nhu_cau
            )
            ORDER BY nc.ten_nhu_cau
          )

          FROM mau_thiet_bi_nhu_cau mnc

          JOIN nhu_cau_su_dung nc
            ON nc.id = mnc.nhu_cau_id

          WHERE mnc.mau_thiet_bi_id = mtb.id
            AND nc.da_xoa_luc IS NULL
            AND nc.trang_thai = 601
        ),
        '[]'::jsonb
      ) AS nhu_cau_su_dung,

      COALESCE(slts.tong_san_sang, 0)::int AS so_luong_san_sang

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601

    LEFT JOIN so_luong_tai_san slts
      ON slts.mau_thiet_bi_id = mtb.id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601

      AND (
        ${coLocHang} = false
        OR mtb.hang_id = ${hangId || null}::uuid
      )

      AND (
        ${coLocDanhMuc} = false
        OR mtb.danh_muc_id = ${danhMucId || null}::uuid
      )

      AND (
        ${coLocNhuCau} = false
        OR EXISTS (
          SELECT 1

          FROM mau_thiet_bi_nhu_cau mnc_loc

          JOIN nhu_cau_su_dung nc_loc
            ON nc_loc.id = mnc_loc.nhu_cau_id

          WHERE mnc_loc.mau_thiet_bi_id = mtb.id
            AND mnc_loc.nhu_cau_id = ${nhuCauId || null}::uuid
            AND nc_loc.da_xoa_luc IS NULL
            AND nc_loc.trang_thai = 601
        )
      )

      AND (
        ${coLocGiaTu} = false
        OR mtb.gia_thue_ngay >= ${giaTu ?? 0}::bigint
      )

      AND (
        ${coLocGiaDen} = false
        OR mtb.gia_thue_ngay <= ${giaDen ?? 0}::bigint
      )

      -- Khách chọn mẫu máy ảnh, Backend lấy ngàm bằng id.
      -- Chỉ trả ống kính cùng ngàm đang hiển thị.
      AND (
        ${coLocNgam} = false
        OR (
          mtb.ngam_id = ${ngamIdBatBuoc || null}::uuid
          AND n.id IS NOT NULL
          AND LOWER(dmtb.ten_danh_muc) = LOWER('Ống kính')
        )
      )

    ORDER BY mtb.created_at DESC
  `;
}

// Tính số lượng còn lại của toàn bộ mẫu bằng một query.
async function laySoLuongKhaDungCuaTatCaMau(ngayNhan, ngayTra) {
  return await prisma.$queryRaw`
    WITH tong_thiet_bi AS (
      SELECT
        tbvl.mau_thiet_bi_id,
        COUNT(*)::int AS tong

      FROM thiet_bi_vat_ly tbvl

      WHERE tbvl.trang_thai = 501
        AND tbvl.da_xoa_luc IS NULL

      GROUP BY tbvl.mau_thiet_bi_id
    ),

    dat_truc_tiep AS (
      SELECT
        ctdt.mau_thiet_bi_id,
        COALESCE(SUM(ctdt.so_luong), 0)::int AS da_dat

      FROM chi_tiet_don_thue ctdt

      JOIN don_thue dt
        ON dt.id = ctdt.don_thue_id

      WHERE dt.trang_thai = 1102
        AND dt.ngay_nhan < ${ngayTra}::timestamptz
        AND dt.ngay_tra > ${ngayNhan}::timestamptz

      GROUP BY ctdt.mau_thiet_bi_id
    ),

    dat_lam_bo_di_kem AS (
      SELECT
        bdk.mau_thiet_bi_phu_id AS mau_thiet_bi_id,
        COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS da_dat

      FROM chi_tiet_don_thue ctdt

      JOIN don_thue dt
        ON dt.id = ctdt.don_thue_id

      JOIN bo_di_kem bdk
        ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

      WHERE bdk.mau_thiet_bi_phu_id IS NOT NULL
        AND dt.trang_thai = 1102
        AND dt.ngay_nhan < ${ngayTra}::timestamptz
        AND dt.ngay_tra > ${ngayNhan}::timestamptz

      GROUP BY bdk.mau_thiet_bi_phu_id
    )

    SELECT
      mtb.id AS mau_thiet_bi_id,

      GREATEST(
        COALESCE(ttb.tong, 0)
        - COALESCE(dtt.da_dat, 0)
        - COALESCE(dbdk.da_dat, 0),
        0
      )::int AS so_luong_kha_dung

    FROM mau_thiet_bi mtb

    LEFT JOIN tong_thiet_bi ttb
      ON ttb.mau_thiet_bi_id = mtb.id

    LEFT JOIN dat_truc_tiep dtt
      ON dtt.mau_thiet_bi_id = mtb.id

    LEFT JOIN dat_lam_bo_di_kem dbdk
      ON dbdk.mau_thiet_bi_id = mtb.id

    WHERE mtb.da_xoa_luc IS NULL
  `;
}

// Tính số lượng còn lại của toàn bộ phụ kiện bằng một query.
async function laySoLuongKhaDungCuaTatCaPhuKien(ngayNhan, ngayTra) {
  return await prisma.$queryRaw`
    WITH phu_kien_da_dat AS (
      SELECT
        bdk.phu_kien_id,
        COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS da_dat

      FROM chi_tiet_don_thue ctdt

      JOIN don_thue dt
        ON dt.id = ctdt.don_thue_id

      JOIN bo_di_kem bdk
        ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

      WHERE bdk.phu_kien_id IS NOT NULL
        AND dt.trang_thai IN (1102, 1103, 1105)
        AND dt.ngay_nhan < ${ngayTra}::timestamptz
        AND dt.ngay_tra > ${ngayNhan}::timestamptz

      GROUP BY bdk.phu_kien_id
    )

    SELECT
      pk.id AS phu_kien_id,

      GREATEST(
        COALESCE(pk.tong_so_luong, 0)
        - COALESCE(pkdd.da_dat, 0),
        0
      )::int AS so_luong_kha_dung

    FROM phu_kien pk

    LEFT JOIN phu_kien_da_dat pkdd
      ON pkdd.phu_kien_id = pk.id

    WHERE pk.da_xoa_luc IS NULL
  `;
}


// Chỉ lấy nhu cầu đang hiển thị cho bộ lọc khách hàng.
async function layDanhSachNhuCauBoLoc() {
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

// Chỉ lấy máy ảnh có ngàm đang hiển thị.
// Ngàm bị ẩn sẽ không xuất hiện trong phần chọn máy ảnh để lọc ống kính.
async function layDanhSachMayAnhBoLoc() {
  return await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.hang_id,
      h.ten_hang,
      mtb.ten_mau,
      n.id AS ngam_id,
      n.ten_ngam

    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601
      AND dmtb.da_xoa_luc IS NULL
      AND dmtb.trang_thai = 601
      AND LOWER(dmtb.ten_danh_muc) = LOWER('Máy ảnh')
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601
      AND (
        mtb.hang_id IS NULL
        OR (
          h.da_xoa_luc IS NULL
          AND h.trang_thai = 601
        )
      )

    ORDER BY
      h.ten_hang ASC,
      mtb.ten_mau ASC
  `;
}

// Kiểm tra nhu cầu được truyền vào bộ lọc còn đang hiển thị.
async function layNhuCauHienThiTheoId(nhuCauId) {
  const rows = await prisma.$queryRaw`
    SELECT id, ten_nhu_cau
    FROM nhu_cau_su_dung
    WHERE id = ${nhuCauId}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = 601
    LIMIT 1
  `;

  return rows[0] || null;
}

// Lấy máy ảnh và ngàm đang hiển thị để kiểm tra tương thích.
async function layMayAnhTheoIdChoTuongThich(mayAnhId) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_mau,
      n.id AS ngam_id,
      n.ten_ngam

    FROM mau_thiet_bi mtb

    JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    WHERE mtb.id = ${mayAnhId}::uuid
      AND mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601
      AND dmtb.da_xoa_luc IS NULL
      AND dmtb.trang_thai = 601
      AND LOWER(dmtb.ten_danh_muc) = LOWER('Máy ảnh')
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601
      AND (
        mtb.hang_id IS NULL
        OR (
          h.da_xoa_luc IS NULL
          AND h.trang_thai = 601
        )
      )

    LIMIT 1
  `;

  return rows[0] || null;
}

async function layMauThietBiTheoId(id) {
  const rows = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,
      dmtb.tinh_chat_id,

      mtb.hang_id,
      h.ten_hang,

      -- ngam_id_noi_bo chỉ dùng trong Model để lọc sản phẩm tương tự.
      -- Không gắn vào response trả cho khách.
      mtb.ngam_id AS ngam_id_noi_bo,

      -- Chỉ trả thông tin ngàm khi ngàm đang hiển thị.
      n.id AS ngam_id,
      n.ten_ngam,

      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,

      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', nc.id,
              'ten_nhu_cau', nc.ten_nhu_cau
            )
            ORDER BY nc.ten_nhu_cau
          )

          FROM mau_thiet_bi_nhu_cau mnc

          JOIN nhu_cau_su_dung nc
            ON nc.id = mnc.nhu_cau_id

          WHERE mnc.mau_thiet_bi_id = mtb.id
            AND nc.da_xoa_luc IS NULL
            AND nc.trang_thai = 601
        ),
        '[]'::jsonb
      ) AS nhu_cau_su_dung

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = 601

    LIMIT 1
  `;

  return rows[0] || null;
}

async function laySanPhamTuongTu(
  mauId,
  danhMucId,
  ngamIdBatBuoc = ""
) {
  const coLocNgam = Boolean(ngamIdBatBuoc);

  return await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      dmtb.ten_danh_muc,

      mtb.hang_id,
      h.ten_hang,

      n.id AS ngam_id,
      n.ten_ngam,

      mtb.ten_mau,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,

      COALESCE(
        (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'id', nc.id,
              'ten_nhu_cau', nc.ten_nhu_cau
            )
            ORDER BY nc.ten_nhu_cau
          )

          FROM mau_thiet_bi_nhu_cau mnc

          JOIN nhu_cau_su_dung nc
            ON nc.id = mnc.nhu_cau_id

          WHERE mnc.mau_thiet_bi_id = mtb.id
            AND nc.da_xoa_luc IS NULL
            AND nc.trang_thai = 601
        ),
        '[]'::jsonb
      ) AS nhu_cau_su_dung

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id

    LEFT JOIN ngam_thiet_bi n
      ON n.id = mtb.ngam_id
      AND n.da_xoa_luc IS NULL
      AND n.trang_thai = 601

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.id <> ${mauId}::uuid
      AND mtb.danh_muc_id = ${danhMucId}::uuid
      AND mtb.trang_thai = 601
      AND (
        ${coLocNgam} = false
        OR (
          mtb.ngam_id = ${ngamIdBatBuoc || null}::uuid
          AND n.id IS NOT NULL
        )
      )

    ORDER BY mtb.created_at DESC
  `;
}

module.exports = {
  layBoDiKemCuaMau,
  layBoDiKemCuaNhieuMau,
  layDanhSachMauThietBi,
  laySoLuongKhaDungCuaTatCaMau,
  laySoLuongKhaDungCuaTatCaPhuKien,
  layDanhSachNhuCauBoLoc,
  layDanhSachMayAnhBoLoc,
  layNhuCauHienThiTheoId,
  layMayAnhTheoIdChoTuongThich,
  layMauThietBiTheoId,
  laySanPhamTuongTu,
};
