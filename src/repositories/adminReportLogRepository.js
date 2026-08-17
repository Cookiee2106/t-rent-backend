const prisma = require("../config/prisma");
const AdminReportLogModel = require("../models/AdminReportLogModel");

const THIET_BI_SAN_SANG = 501;
const THIET_BI_DANG_THUE = 502;
const THIET_BI_DANG_BAO_TRI = 503;
const THIET_BI_BI_MAT = 505;
const THIET_BI_HU_HONG = 506;

async function kiemTraCoCotPhuKienMatHuHong() {
  const ketQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS so_cot
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'phu_kien'
      AND column_name = 'so_luong_mat_hu_hong'
  `;

  return Number(ketQua[0]?.so_cot || 0) > 0;
}

async function layBaoCaoDoanhThuRepository({ tuNgay, denNgay }) {
  // Hai dòng chú thích cũ bên dưới được giữ lại để đối chiếu với logic trước đây.
  // Chỉ tính những đơn đã xác nhận bàn giao và có dòng tiền thuê 2302.
  // Dùng EXISTS để một đơn không bị nhân đôi nếu dữ liệu có nhiều dòng 2302.
  const LOAI_TIEN_THUE = 2302;
  const LOAI_PHI_HUY_DON = 2306;

  // Tổng doanh thu và doanh thu theo tháng lấy trực tiếp từ dòng tiền thực tế:
  // 2302 = tiền thuê, 2306 = phí hủy đơn. Hoàn cọc 2303 không được cộng.
  const [
    tongQuanDoanhThu,
    danhSachTheoThang,
    danhSachTheoMau,
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        COALESCE(SUM(tt.so_tien), 0)::text AS tong_doanh_thu,
        COUNT(DISTINCT tt.don_thue_id)::int AS tong_don_thue
      FROM thanh_toan tt
      WHERE tt.loai_dong_tien_id IN (
          ${LOAI_TIEN_THUE},
          ${LOAI_PHI_HUY_DON}
        )
        AND tt.created_at::date >= ${tuNgay}::date
        AND tt.created_at::date <= ${denNgay}::date
    `,

    prisma.$queryRaw`
      WITH danh_sach_thang AS (
        SELECT GENERATE_SERIES(
          DATE_TRUNC('month', ${tuNgay}::date),
          DATE_TRUNC('month', ${denNgay}::date),
          INTERVAL '1 month'
        ) AS thang
      ),
      doanh_thu_theo_thang AS (
        SELECT
          DATE_TRUNC('month', tt.created_at) AS thang,
          COALESCE(SUM(tt.so_tien), 0)::text AS tong_doanh_thu,
          COUNT(DISTINCT tt.don_thue_id)::int AS so_don_thue
        FROM thanh_toan tt
        WHERE tt.loai_dong_tien_id IN (
            ${LOAI_TIEN_THUE},
            ${LOAI_PHI_HUY_DON}
          )
          AND tt.created_at::date >= ${tuNgay}::date
          AND tt.created_at::date <= ${denNgay}::date
        GROUP BY DATE_TRUNC('month', tt.created_at)
      )
      SELECT
        dst.thang,
        TO_CHAR(dst.thang, 'MM/YYYY') AS thang_hien_thi,
        COALESCE(dtt.tong_doanh_thu, '0') AS tong_doanh_thu,
        COALESCE(dtt.so_don_thue, 0)::int AS so_don_thue
      FROM danh_sach_thang dst
      LEFT JOIN doanh_thu_theo_thang dtt
        ON dtt.thang = dst.thang
      ORDER BY dst.thang ASC
    `,

    prisma.$queryRaw`
      SELECT
        mtb.id AS mau_thiet_bi_id,
        mtb.ten_mau,
        COALESCE(h.ten_hang, '') AS ten_hang,
        COALESCE(dmtb.ten_danh_muc, '') AS ten_danh_muc,

        -- Một đơn có mẫu này được tính là một lần thuê.
        -- Dù số lượng trong đơn lớn hơn 1 vẫn chỉ tính một lần.
        COUNT(DISTINCT dt.id)::int AS so_lan_thue,

        COALESCE(SUM(ctdt.tien_thue), 0)::text AS tong_doanh_thu
      FROM don_thue dt
      JOIN chi_tiet_don_thue ctdt
        ON ctdt.don_thue_id = dt.id
      JOIN mau_thiet_bi mtb
        ON mtb.id = ctdt.mau_thiet_bi_id
      LEFT JOIN hang_thiet_bi h
        ON h.id = mtb.hang_id
      LEFT JOIN danh_muc_thiet_bi dmtb
        ON dmtb.id = mtb.danh_muc_id
      WHERE dt.ban_giao_luc IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM thanh_toan tt
          WHERE tt.don_thue_id = dt.id
            AND tt.loai_dong_tien_id = ${LOAI_TIEN_THUE}
            AND tt.created_at::date >= ${tuNgay}::date
            AND tt.created_at::date <= ${denNgay}::date
        )
      GROUP BY
        mtb.id,
        mtb.ten_mau,
        h.ten_hang,
        dmtb.ten_danh_muc
      ORDER BY
        COUNT(DISTINCT dt.id) DESC,
        SUM(ctdt.tien_thue) DESC,
        mtb.ten_mau ASC
    `,
  ]);

  return AdminReportLogModel.mapBaoCaoDoanhThu({
    tuNgay,
    denNgay,
    tongQuanDoanhThu: tongQuanDoanhThu[0] || {},
    danhSachTheoThang,
    danhSachTheoMau,
  });
}

async function layBaoCaoTonKhoRepository({ hangId, danhMucId }) {
  const coCotPhuKienMatHuHong = await kiemTraCoCotPhuKienMatHuHong();

  const [tongQuanThietBi] = await prisma.$queryRaw`
    SELECT
      COUNT(tbvl.id) FILTER (
        WHERE tbvl.trang_thai IN (
          ${THIET_BI_SAN_SANG},
          ${THIET_BI_DANG_THUE},
          ${THIET_BI_DANG_BAO_TRI}
        )
      )::int AS tong_thiet_bi,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_SAN_SANG})::int AS thiet_bi_san_sang,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_DANG_THUE})::int AS thiet_bi_dang_thue,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_DANG_BAO_TRI})::int AS thiet_bi_dang_bao_tri,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_HU_HONG})::int AS thiet_bi_hu_hong,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_BI_MAT})::int AS thiet_bi_bi_mat
    FROM thiet_bi_vat_ly tbvl
    JOIN mau_thiet_bi mtb
      ON mtb.id = tbvl.mau_thiet_bi_id
    WHERE tbvl.da_xoa_luc IS NULL
      AND mtb.da_xoa_luc IS NULL
      AND (
        ${hangId}::uuid IS NULL
        OR mtb.hang_id = ${hangId}::uuid
      )
      AND (
        ${danhMucId}::uuid IS NULL
        OR mtb.danh_muc_id = ${danhMucId}::uuid
      )
  `;

  let tongQuanPhuKien;

  if (coCotPhuKienMatHuHong) {
    [tongQuanPhuKien] = await prisma.$queryRaw`
      SELECT
        COUNT(pk.id)::int AS tong_phu_kien,
        COALESCE(SUM(pk.tong_so_luong), 0)::int AS tong_so_luong_phu_kien,
        COALESCE(SUM(pk.so_luong_mat_hu_hong), 0)::int AS phu_kien_mat_hu_hong
      FROM phu_kien pk
      WHERE pk.da_xoa_luc IS NULL
        -- Phụ kiện không còn cột hãng; bộ lọc hãng chỉ áp dụng cho mẫu thiết bị.
        AND (
          ${danhMucId}::uuid IS NULL
          OR pk.danh_muc_id = ${danhMucId}::uuid
        )
    `;
  } else {
    [tongQuanPhuKien] = await prisma.$queryRaw`
      SELECT
        COUNT(pk.id)::int AS tong_phu_kien,
        COALESCE(SUM(pk.tong_so_luong), 0)::int AS tong_so_luong_phu_kien,
        0::int AS phu_kien_mat_hu_hong
      FROM phu_kien pk
      WHERE pk.da_xoa_luc IS NULL
        -- Phụ kiện không còn cột hãng; bộ lọc hãng chỉ áp dụng cho mẫu thiết bị.
        AND (
          ${danhMucId}::uuid IS NULL
          OR pk.danh_muc_id = ${danhMucId}::uuid
        )
    `;
  }

  const danhSachThietBiVatLy = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_mau,
      h.ten_hang,
      dmtb.ten_danh_muc,
      COUNT(tbvl.id) FILTER (
        WHERE tbvl.trang_thai IN (
          ${THIET_BI_SAN_SANG},
          ${THIET_BI_DANG_THUE},
          ${THIET_BI_DANG_BAO_TRI}
        )
      )::int AS tong_so_luong,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_SAN_SANG})::int AS san_sang,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_DANG_THUE})::int AS dang_thue,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_DANG_BAO_TRI})::int AS dang_bao_tri,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_HU_HONG})::int AS hu_hong,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = ${THIET_BI_BI_MAT})::int AS bi_mat
    FROM mau_thiet_bi mtb
    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id
    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id
    LEFT JOIN thiet_bi_vat_ly tbvl
      ON tbvl.mau_thiet_bi_id = mtb.id
      AND tbvl.da_xoa_luc IS NULL
    WHERE mtb.da_xoa_luc IS NULL
      AND (
        ${hangId}::uuid IS NULL
        OR mtb.hang_id = ${hangId}::uuid
      )
      AND (
        ${danhMucId}::uuid IS NULL
        OR mtb.danh_muc_id = ${danhMucId}::uuid
      )
    GROUP BY mtb.id, mtb.ten_mau, h.ten_hang, dmtb.ten_danh_muc, mtb.created_at
    ORDER BY mtb.created_at DESC, mtb.ten_mau ASC
  `;

  let danhSachPhuKien;

  if (coCotPhuKienMatHuHong) {
    danhSachPhuKien = await prisma.$queryRaw`
      WITH phu_kien_dang_thue AS (
        SELECT
          bgvp.phu_kien_id,
          SUM(bgvp.so_luong_giao)::int AS dang_thue
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_id IS NOT NULL
          AND dt.trang_thai IN (1103, 1105)
        GROUP BY bgvp.phu_kien_id
      )
      SELECT
        pk.id,
        pk.ten_phu_kien,
        dmtb.ten_danh_muc,
        n.ten_ngam,
        pk.tong_so_luong::int AS tong_so_luong,
        COALESCE(pkdt.dang_thue, 0)::int AS dang_thue,
        COALESCE(pk.so_luong_mat_hu_hong, 0)::int AS hu_hong_mat,
        GREATEST(pk.tong_so_luong - COALESCE(pkdt.dang_thue, 0), 0)::int AS san_sang
      FROM phu_kien pk
      LEFT JOIN danh_muc_thiet_bi dmtb
        ON dmtb.id = pk.danh_muc_id
      LEFT JOIN ngam_thiet_bi n
        ON n.id = pk.ngam_id
        AND n.da_xoa_luc IS NULL
      LEFT JOIN phu_kien_dang_thue pkdt
        ON pkdt.phu_kien_id = pk.id
      WHERE pk.da_xoa_luc IS NULL
        -- Phụ kiện không còn cột hãng; bộ lọc hãng chỉ áp dụng cho mẫu thiết bị.
        AND (
          ${danhMucId}::uuid IS NULL
          OR pk.danh_muc_id = ${danhMucId}::uuid
        )
      ORDER BY pk.ten_phu_kien ASC
    `;
  } else {
    danhSachPhuKien = await prisma.$queryRaw`
      WITH phu_kien_dang_thue AS (
        SELECT
          bgvp.phu_kien_id,
          SUM(bgvp.so_luong_giao)::int AS dang_thue
        FROM ban_giao_vat_pham bgvp
        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE bgvp.phu_kien_id IS NOT NULL
          AND dt.trang_thai IN (1103, 1105)
        GROUP BY bgvp.phu_kien_id
      )
      SELECT
        pk.id,
        pk.ten_phu_kien,
        dmtb.ten_danh_muc,
        n.ten_ngam,
        pk.tong_so_luong::int AS tong_so_luong,
        COALESCE(pkdt.dang_thue, 0)::int AS dang_thue,
        0::int AS hu_hong_mat,
        GREATEST(pk.tong_so_luong - COALESCE(pkdt.dang_thue, 0), 0)::int AS san_sang
      FROM phu_kien pk
      LEFT JOIN danh_muc_thiet_bi dmtb
        ON dmtb.id = pk.danh_muc_id
      LEFT JOIN ngam_thiet_bi n
        ON n.id = pk.ngam_id
        AND n.da_xoa_luc IS NULL
      LEFT JOIN phu_kien_dang_thue pkdt
        ON pkdt.phu_kien_id = pk.id
      WHERE pk.da_xoa_luc IS NULL
        -- Phụ kiện không còn cột hãng; bộ lọc hãng chỉ áp dụng cho mẫu thiết bị.
        AND (
          ${danhMucId}::uuid IS NULL
          OR pk.danh_muc_id = ${danhMucId}::uuid
        )
      ORDER BY pk.ten_phu_kien ASC
    `;
  }

  const danhSachHang = await prisma.$queryRaw`
    SELECT id, ten_hang
    FROM hang_thiet_bi
    WHERE da_xoa_luc IS NULL
    ORDER BY ten_hang ASC
  `;

  const danhSachDanhMuc = await prisma.$queryRaw`
    SELECT id, ten_danh_muc
    FROM danh_muc_thiet_bi
    WHERE da_xoa_luc IS NULL
    ORDER BY ten_danh_muc ASC
  `;

  return AdminReportLogModel.mapBaoCaoTonKho({
    tongQuan: {
      ...tongQuanThietBi,
      ...tongQuanPhuKien,
    },
    thietBiVatLy: danhSachThietBiVatLy,
    phuKien: danhSachPhuKien,
    hang: danhSachHang,
    danhMuc: danhSachDanhMuc,
  });
}

async function layDanhSachNhatKyThaoTacRepository({
  page,
  limit,
  loaiThaoTac,
  tuKhoa,
  from,
  to,
}) {
  const offset = (page - 1) * limit;

  const danhSach = await prisma.$queryRaw`
    WITH danh_sach_thao_tac AS (
      SELECT
        ('THANH_TOAN_COC_' || tt.id::text) AS id,
        'THANH_TOAN_COC' AS loai_thao_tac,
        'Thanh toán tiền giữ chỗ' AS ten_thao_tac,
        COALESCE(tt.nguoi_thuc_hien_id, dt.khach_hang_id) AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        tt.so_tien::text AS so_tien,
        tt.ghi_chu,
        tt.created_at AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(
          tt.nguoi_thuc_hien_id,
          dt.khach_hang_id
        )
      WHERE tt.loai_dong_tien_id = 2301

      UNION ALL

      SELECT
        ('NHAN_TIEN_THUE_' || tt.id::text) AS id,
        'NHAN_TIEN_THUE' AS loai_thao_tac,
        'Nhận tiền thuê khi bàn giao' AS ten_thao_tac,
        COALESCE(
          tt.nguoi_thuc_hien_id,
          dt.nguoi_ban_giao_id
        ) AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        tt.so_tien::text AS so_tien,
        tt.ghi_chu,
        dt.ban_giao_luc AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(
          tt.nguoi_thuc_hien_id,
          dt.nguoi_ban_giao_id
        )
      WHERE tt.loai_dong_tien_id = 2302
        AND dt.ban_giao_luc IS NOT NULL

      UNION ALL

      -- Hủy đơn chỉ được ghi nhận khi yêu cầu hủy đã được xác nhận (1702).
      -- Dùng bảng yêu_cau_huy_don để lấy đúng người xử lý, phí hủy và thời điểm xử lý.
      SELECT
        ('HUY_DON_' || ychd.id::text) AS id,
        'HUY_DON' AS loai_thao_tac,
        'Xác nhận hủy đơn' AS ten_thao_tac,
        ychd.nguoi_xu_ly_id AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        ychd.phi_huy::text AS so_tien,
        COALESCE(
          NULLIF(ychd.ghi_chu_xu_ly, ''),
          ychd.ly_do_huy
        ) AS ghi_chu,
        ychd.xu_ly_luc AS thoi_gian
      FROM yeu_cau_huy_don ychd
      JOIN don_thue dt
        ON dt.id = ychd.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = ychd.nguoi_xu_ly_id
      WHERE ychd.trang_thai_id = 1702
        AND ychd.xu_ly_luc IS NOT NULL
        AND dt.huy_luc IS NOT NULL

      UNION ALL


      SELECT
        ('THANH_LY_' || dt.id::text) AS id,
        'THANH_LY' AS loai_thao_tac,
        'Thanh lý hợp đồng' AS ten_thao_tac,
        dt.nguoi_nhan_tra_id AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        NULL::text AS so_tien,
        dt.ghi_chu_thanh_ly AS ghi_chu,
        dt.tra_luc AS thoi_gian
      FROM don_thue dt
      LEFT JOIN nguoi_dung nd
        ON nd.id = dt.nguoi_nhan_tra_id
      WHERE dt.tra_luc IS NOT NULL
    )
    SELECT *
    FROM danh_sach_thao_tac
    WHERE (
      ${loaiThaoTac}::text IS NULL
      OR loai_thao_tac = ${loaiThaoTac}::text
    )
      AND (
        ${tuKhoa}::text IS NULL
        OR COALESCE(ten_nguoi_dung, '') ILIKE
          '%' || ${tuKhoa}::text || '%'
        OR COALESCE(ma_don, '') ILIKE
          '%' || ${tuKhoa}::text || '%'
      )
      AND (
        ${from}::date IS NULL
        OR thoi_gian::date >= ${from}::date
      )
      AND (
        ${to}::date IS NULL
        OR thoi_gian::date <= ${to}::date
      )
    ORDER BY thoi_gian DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const demKetQua = await prisma.$queryRaw`
    WITH danh_sach_thao_tac AS (
      SELECT
        ('THANH_TOAN_COC_' || tt.id::text) AS id,
        'THANH_TOAN_COC' AS loai_thao_tac,
        nd.ho_ten AS ten_nguoi_dung,
        dt.ma_don,
        tt.created_at AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(
          tt.nguoi_thuc_hien_id,
          dt.khach_hang_id
        )
      WHERE tt.loai_dong_tien_id = 2301

      UNION ALL

      SELECT
        ('NHAN_TIEN_THUE_' || tt.id::text) AS id,
        'NHAN_TIEN_THUE' AS loai_thao_tac,
        nd.ho_ten AS ten_nguoi_dung,
        dt.ma_don,
        dt.ban_giao_luc AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(
          tt.nguoi_thuc_hien_id,
          dt.nguoi_ban_giao_id
        )
      WHERE tt.loai_dong_tien_id = 2302
        AND dt.ban_giao_luc IS NOT NULL

      UNION ALL

      SELECT
        ('HUY_DON_' || ychd.id::text) AS id,
        'HUY_DON' AS loai_thao_tac,
        nd.ho_ten AS ten_nguoi_dung,
        dt.ma_don,
        ychd.xu_ly_luc AS thoi_gian
      FROM yeu_cau_huy_don ychd
      JOIN don_thue dt
        ON dt.id = ychd.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = ychd.nguoi_xu_ly_id
      WHERE ychd.trang_thai_id = 1702
        AND ychd.xu_ly_luc IS NOT NULL
        AND dt.huy_luc IS NOT NULL

      UNION ALL

      SELECT
        ('THANH_LY_' || dt.id::text) AS id,
        'THANH_LY' AS loai_thao_tac,
        nd.ho_ten AS ten_nguoi_dung,
        dt.ma_don,
        dt.tra_luc AS thoi_gian
      FROM don_thue dt
      LEFT JOIN nguoi_dung nd
        ON nd.id = dt.nguoi_nhan_tra_id
      WHERE dt.tra_luc IS NOT NULL
    )
    SELECT COUNT(*)::int AS total
    FROM danh_sach_thao_tac
    WHERE (
      ${loaiThaoTac}::text IS NULL
      OR loai_thao_tac = ${loaiThaoTac}::text
    )
      AND (
        ${tuKhoa}::text IS NULL
        OR COALESCE(ten_nguoi_dung, '') ILIKE
          '%' || ${tuKhoa}::text || '%'
        OR COALESCE(ma_don, '') ILIKE
          '%' || ${tuKhoa}::text || '%'
      )
      AND (
        ${from}::date IS NULL
        OR thoi_gian::date >= ${from}::date
      )
      AND (
        ${to}::date IS NULL
        OR thoi_gian::date <= ${to}::date
      )
  `;

  return AdminReportLogModel.mapDanhSachThaoTac({
    danhSach,
    total: Number(demKetQua[0]?.total || 0),
    page,
    limit,
  });
}

async function layChiTietNhatKyThaoTacRepository(id) {
  const danhSach = await prisma.$queryRaw`
    WITH danh_sach_thao_tac AS (
      SELECT
        ('THANH_TOAN_COC_' || tt.id::text) AS id,
        'THANH_TOAN_COC' AS loai_thao_tac,
        'Thanh toán tiền giữ chỗ' AS ten_thao_tac,
        COALESCE(tt.nguoi_thuc_hien_id, dt.khach_hang_id) AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        tt.so_tien::text AS so_tien,
        tt.ghi_chu,
        tt.created_at AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(tt.nguoi_thuc_hien_id, dt.khach_hang_id)
      WHERE tt.loai_dong_tien_id = 2301

      UNION ALL

      SELECT
        ('NHAN_TIEN_THUE_' || tt.id::text) AS id,
        'NHAN_TIEN_THUE' AS loai_thao_tac,
        'Nhận tiền thuê khi bàn giao' AS ten_thao_tac,
        COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id) AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        tt.so_tien::text AS so_tien,
        tt.ghi_chu,
        dt.ban_giao_luc AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id)
      WHERE tt.loai_dong_tien_id = 2302
        AND dt.ban_giao_luc IS NOT NULL

      UNION ALL

      -- Hủy đơn chỉ được ghi nhận khi yêu cầu hủy đã được xác nhận (1702).
      -- Dùng bảng yeu_cau_huy_don để lấy đúng người xử lý, phí hủy và thời điểm xử lý.
      SELECT
        ('HUY_DON_' || ychd.id::text) AS id,
        'HUY_DON' AS loai_thao_tac,
        'Xác nhận hủy đơn' AS ten_thao_tac,
        ychd.nguoi_xu_ly_id AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        ychd.phi_huy::text AS so_tien,
        COALESCE(
          NULLIF(ychd.ghi_chu_xu_ly, ''),
          ychd.ly_do_huy
        ) AS ghi_chu,
        ychd.xu_ly_luc AS thoi_gian
      FROM yeu_cau_huy_don ychd
      JOIN don_thue dt
        ON dt.id = ychd.don_thue_id
      LEFT JOIN nguoi_dung nd
        ON nd.id = ychd.nguoi_xu_ly_id
      WHERE ychd.trang_thai_id = 1702
        AND ychd.xu_ly_luc IS NOT NULL
        AND dt.huy_luc IS NOT NULL

      UNION ALL

      SELECT
        ('THANH_LY_' || dt.id::text) AS id,
        'THANH_LY' AS loai_thao_tac,
        'Thanh lý hợp đồng' AS ten_thao_tac,
        dt.nguoi_nhan_tra_id AS nguoi_dung_id,
        nd.ho_ten AS ten_nguoi_dung,
        nd.email,
        nd.vai_tro,
        dt.ma_don,
        NULL::text AS so_tien,
        dt.ghi_chu_thanh_ly AS ghi_chu,
        dt.tra_luc AS thoi_gian
      FROM don_thue dt
      LEFT JOIN nguoi_dung nd
        ON nd.id = dt.nguoi_nhan_tra_id
      WHERE dt.tra_luc IS NOT NULL
    )
    SELECT *
    FROM danh_sach_thao_tac
    WHERE id = ${id}
    LIMIT 1
  `;

  if (danhSach.length === 0) {
    throw new Error("Không tìm thấy thao tác");
  }

  return AdminReportLogModel.mapThaoTac(danhSach[0]);
}

module.exports = {
  layBaoCaoDoanhThuRepository,
  layBaoCaoTonKhoRepository,
  layDanhSachNhatKyThaoTacRepository,
  layChiTietNhatKyThaoTacRepository,
};
