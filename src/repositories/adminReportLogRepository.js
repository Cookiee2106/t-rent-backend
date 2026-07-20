const prisma = require("../config/prisma");
const AdminReportLogModel = require("../models/AdminReportLogModel");

async function layBaoCaoDoanhThuRepository({ tuNgay, denNgay }) {
  const danhSachTheoThang = await prisma.$queryRaw`
    SELECT
      DATE_TRUNC('month', tt.created_at) AS thang,
      TO_CHAR(DATE_TRUNC('month', tt.created_at), 'MM/YYYY') AS thang_hien_thi,
      COALESCE(SUM(tt.so_tien), 0)::text AS tong_doanh_thu,
      COUNT(tt.id)::int AS so_giao_dich,
      COUNT(DISTINCT tt.don_thue_id)::int AS so_don_thue
    FROM thanh_toan tt
    JOIN don_thue dt
      ON dt.id = tt.don_thue_id
    WHERE tt.loai_dong_tien_id = 2302
      AND (
        ${tuNgay}::date IS NULL
        OR tt.created_at::date >= ${tuNgay}::date
      )
      AND (
        ${denNgay}::date IS NULL
        OR tt.created_at::date <= ${denNgay}::date
      )
    GROUP BY DATE_TRUNC('month', tt.created_at)
    ORDER BY DATE_TRUNC('month', tt.created_at) DESC
  `;

  return AdminReportLogModel.mapBaoCaoDoanhThu({
    tuNgay,
    denNgay,
    danhSachTheoThang,
  });
}

async function layBaoCaoTonKhoRepository({ hangId, danhMucId }) {
  const [tongQuanThietBi] = await prisma.$queryRaw`
    SELECT
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai NOT IN (505, 506))::int AS tong_thiet_bi,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = 506)::int AS thiet_bi_hu_hong,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = 505)::int AS thiet_bi_bi_mat
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

  const [tongQuanPhuKien] = await prisma.$queryRaw`
    SELECT
      COUNT(pk.id)::int AS tong_phu_kien,
      COALESCE(SUM(pk.tong_so_luong), 0)::int AS tong_so_luong_phu_kien,
      COALESCE(SUM(pk.so_luong_mat_hu_hong), 0)::int AS phu_kien_mat_hu_hong
    FROM phu_kien pk
    WHERE pk.da_xoa_luc IS NULL
      AND (
        ${hangId}::uuid IS NULL
        OR pk.hang_id = ${hangId}::uuid
      )
      AND (
        ${danhMucId}::uuid IS NULL
        OR pk.danh_muc_id = ${danhMucId}::uuid
      )
  `;

  const danhSachThietBiVatLy = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_mau,
      h.ten_hang,
      dmtb.ten_danh_muc,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai NOT IN (505, 506))::int AS tong_so_luong,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = 502)::int AS dang_thue,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai IN (505, 506))::int AS hu_hong_mat,
      COUNT(tbvl.id) FILTER (WHERE tbvl.trang_thai = 501)::int AS san_sang
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

  const danhSachPhuKien = await prisma.$queryRaw`
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
      h.ten_hang,
      dmtb.ten_danh_muc,
      pk.tong_so_luong::int AS tong_so_luong,
      COALESCE(pkdt.dang_thue, 0)::int AS dang_thue,
      COALESCE(pk.so_luong_mat_hu_hong, 0)::int AS hu_hong_mat,
      GREATEST(pk.tong_so_luong - COALESCE(pkdt.dang_thue, 0), 0)::int AS san_sang
    FROM phu_kien pk
    LEFT JOIN hang_thiet_bi h
      ON h.id = pk.hang_id
    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = pk.danh_muc_id
    LEFT JOIN phu_kien_dang_thue pkdt
      ON pkdt.phu_kien_id = pk.id
    WHERE pk.da_xoa_luc IS NULL
      AND (
        ${hangId}::uuid IS NULL
        OR pk.hang_id = ${hangId}::uuid
      )
      AND (
        ${danhMucId}::uuid IS NULL
        OR pk.danh_muc_id = ${danhMucId}::uuid
      )
    ORDER BY pk.ten_phu_kien ASC
  `;

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

async function layDanhSachNhatKyThaoTacRepository({ page, limit, loaiThaoTac, from, to }) {
  const offset = (page - 1) * limit;

  const danhSach = await prisma.$queryRaw`
    WITH danh_sach_thao_tac AS (
      SELECT
        ('THANH_TOAN_COC_' || tt.id::text) AS id,
        'THANH_TOAN_COC' AS loai_thao_tac,
        'Thanh toán tiền cọc' AS ten_thao_tac,
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
        'Bàn giao và nhận tiền thuê' AS ten_thao_tac,
        COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id) AS nguoi_dung_id,
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
        ON nd.id = COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id)
      WHERE tt.loai_dong_tien_id = 2302

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
        tt.created_at AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      WHERE tt.loai_dong_tien_id = 2301

      UNION ALL

      SELECT
        ('NHAN_TIEN_THUE_' || tt.id::text) AS id,
        'NHAN_TIEN_THUE' AS loai_thao_tac,
        tt.created_at AS thoi_gian
      FROM thanh_toan tt
      JOIN don_thue dt
        ON dt.id = tt.don_thue_id
      WHERE tt.loai_dong_tien_id = 2302

      UNION ALL

      SELECT
        ('THANH_LY_' || dt.id::text) AS id,
        'THANH_LY' AS loai_thao_tac,
        dt.tra_luc AS thoi_gian
      FROM don_thue dt
      WHERE dt.tra_luc IS NOT NULL
    )
    SELECT COUNT(*)::int AS total
    FROM danh_sach_thao_tac
    WHERE (
      ${loaiThaoTac}::text IS NULL
      OR loai_thao_tac = ${loaiThaoTac}::text
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
        'Thanh toán tiền cọc' AS ten_thao_tac,
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
        'Bàn giao và nhận tiền thuê' AS ten_thao_tac,
        COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id) AS nguoi_dung_id,
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
        ON nd.id = COALESCE(tt.nguoi_thuc_hien_id, dt.nguoi_ban_giao_id)
      WHERE tt.loai_dong_tien_id = 2302

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
