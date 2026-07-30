const prisma = require("../config/prisma");

const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_HOAN_THANH = 1104;
const TRANG_THAI_QUA_HAN = 1105;

const TRANG_THAI_THIET_BI_SAN_SANG = 501;
const TRANG_THAI_THIET_BI_BAO_TRI = 503;
const TRANG_THAI_THIET_BI_BI_MAT = 505;

const TRANG_THAI_BAO_TRI_DANG_BAO_TRI = 1301;

const LOAI_TIEN_COC = 2301;
const LOAI_TIEN_THUE = 2302;
const LOAI_HOAN_COC = 2303;
const LOAI_KHAU_TRU_COC = 2304;
const LOAI_PHU_THU = 2305;

const MUC_DICH_ANH_KHI_TRA = 2603;

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

async function capNhatDonQuaHan() {
  await prisma.$executeRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_QUA_HAN},
      updated_at = NOW()
    WHERE trang_thai = ${TRANG_THAI_DANG_THUE}
      AND ngay_tra::date < CURRENT_DATE
      AND tra_luc IS NULL
  `;
}

async function demDonThanhLy({ trangThai, tuKhoa }) {
  const tuKhoaTim = `%${tuKhoa || ""}%`;

  const ketQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM don_thue dt
    JOIN nguoi_dung kh ON kh.id = dt.khach_hang_id
    WHERE dt.trang_thai IN (
      ${TRANG_THAI_DANG_THUE},
      ${TRANG_THAI_QUA_HAN},
      ${TRANG_THAI_HOAN_THANH}
    )
      AND (${trangThai}::int IS NULL OR dt.trang_thai = ${trangThai}::int)
      AND (
        ${tuKhoa || ""} = ''
        OR LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
        OR LOWER(kh.ho_ten) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(kh.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
      )
  `;

  return ketQua[0]?.total || 0;
}

async function layDanhSachDonThanhLy({ trangThai, tuKhoa, limit, offset }) {
  const tuKhoaTim = `%${tuKhoa || ""}%`;

  return await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
      (
        SELECT mtb.anh_url
        FROM chi_tiet_don_thue ctdt
        JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
        WHERE ctdt.don_thue_id = dt.id
        ORDER BY ctdt.created_at ASC
        LIMIT 1
      ) AS anh_url_mau_thiet_bi,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_THUE}
      ) AS tien_thue_da_thanh_toan,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    JOIN nguoi_dung kh ON kh.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
    WHERE dt.trang_thai IN (
      ${TRANG_THAI_DANG_THUE},
      ${TRANG_THAI_QUA_HAN},
      ${TRANG_THAI_HOAN_THANH}
    )
      AND (${trangThai}::int IS NULL OR dt.trang_thai = ${trangThai}::int)
      AND (
        ${tuKhoa || ""} = ''
        OR LOWER(dt.ma_don) LIKE LOWER(${tuKhoaTim})
        OR LOWER(kh.ho_ten) LIKE LOWER(${tuKhoaTim})
        OR LOWER(COALESCE(kh.so_dien_thoai, '')) LIKE LOWER(${tuKhoaTim})
      )
    ORDER BY dt.ban_giao_luc DESC NULLS LAST, dt.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

async function layDonThanhLyTheoId(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      dt.phien_thanh_toan_id,
      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,
      kh.dia_chi AS dia_chi_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      tt.ten_trang_thai,
      dt.ban_giao_luc,
      dt.nguoi_ban_giao_id,
      nv_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,
      dt.tra_luc,
      dt.nguoi_nhan_tra_id,
      nv_tra.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_TIEN_THUE}
      ) AS tien_thue_da_thanh_toan,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_HOAN_COC}
      ) AS tien_da_hoan_coc,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_KHAU_TRU_COC}
      ) AS tien_da_khau_tru,
      (
        SELECT COALESCE(SUM(th.so_tien), 0)::text
        FROM thanh_toan th
        WHERE th.don_thue_id = dt.id
          AND th.loai_dong_tien_id = ${LOAI_PHU_THU}
      ) AS tien_da_phu_thu,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt
    JOIN nguoi_dung kh ON kh.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tt ON tt.id = dt.trang_thai
    LEFT JOIN nguoi_dung nv_bg ON nv_bg.id = dt.nguoi_ban_giao_id
    LEFT JOIN nguoi_dung nv_tra ON nv_tra.id = dt.nguoi_nhan_tra_id
    WHERE dt.id = ${donThueId}::uuid
    LIMIT 1
  `;

  return ketQua[0] || null;
}

async function layChiTietDonThanhLy(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      ctdt.id,
      ctdt.mau_thiet_bi_id,
      h.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dm.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc
    FROM chi_tiet_don_thue ctdt
    JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = mtb.hang_id
    LEFT JOIN danh_muc_thiet_bi dm ON dm.id = mtb.danh_muc_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    ORDER BY ctdt.created_at ASC
  `;
}

async function layVatPhamBanGiao(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      bgvp.id,
      ctdt.id AS chi_tiet_don_thue_id,
      ctdt.so_luong AS so_luong_dat,
      h.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dm.ten_danh_muc,
      bgvp.bo_di_kem_id,
      bgvp.thiet_bi_id,
      bgvp.phu_kien_id,
      pk.ten_phu_kien,
      bgvp.ten_vat_pham_snapshot,
      tb.so_serial,
      bgvp.so_serial_snapshot,
      vt.ten_vi_tri AS ten_vi_tri_kho,
      bgvp.so_luong_giao,
      bgvp.ghi_chu_ban_giao,
      bgvp.created_at
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = mtb.hang_id
    LEFT JOIN danh_muc_thiet_bi dm ON dm.id = mtb.danh_muc_id
    LEFT JOIN thiet_bi_vat_ly tb ON tb.id = bgvp.thiet_bi_id
    LEFT JOIN vi_tri_kho vt ON vt.id = tb.vi_tri_kho_id
    LEFT JOIN phu_kien pk ON pk.id = bgvp.phu_kien_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
    ORDER BY mtb.ten_mau ASC, bgvp.created_at ASC
  `;
}

async function layThanhToanCuaDon(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dm.ten_danh_muc AS ten_loai_dong_tien,
      COALESCE(nd.ho_ten, kh.ho_ten) AS ten_nguoi_thuc_hien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at
    FROM thanh_toan tt
    JOIN don_thue dt ON dt.id = tt.don_thue_id
    JOIN nguoi_dung kh ON kh.id = dt.khach_hang_id
    LEFT JOIN nguoi_dung nd ON nd.id = tt.nguoi_thuc_hien_id
    LEFT JOIN danh_muc_he_thong dm ON dm.id = tt.loai_dong_tien_id
    WHERE tt.don_thue_id = ${donThueId}::uuid
    ORDER BY tt.created_at ASC
  `;
}

async function layTepDonThue(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      tdt.id,
      tdt.muc_dich_id,
      dm.ten_danh_muc AS ten_muc_dich,
      tdt.ten_file_goc,
      tdt.file_url,
      tdt.loai_file,
      tdt.kich_thuoc_file::text AS kich_thuoc_file,
      nd.ho_ten AS ten_nguoi_upload,
      tdt.uploaded_at
    FROM tep_don_thue tdt
    LEFT JOIN danh_muc_he_thong dm ON dm.id = tdt.muc_dich_id
    LEFT JOIN nguoi_dung nd ON nd.id = tdt.uploaded_by
    WHERE tdt.don_thue_id = ${donThueId}::uuid
    ORDER BY tdt.muc_dich_id ASC, tdt.uploaded_at ASC
  `;
}

async function layTienCocDaThanhToan(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT COALESCE(SUM(so_tien), 0)::text AS tong_tien_coc
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id = ${LOAI_TIEN_COC}
  `;

  return Number(ketQua[0]?.tong_tien_coc || 0);
}

async function kiemTraDaCoThanhLy(donThueId) {
  const ketQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS so_dong
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id IN (
        ${LOAI_HOAN_COC},
        ${LOAI_KHAU_TRU_COC},
        ${LOAI_PHU_THU}
      )
  `;

  return Number(ketQua[0]?.so_dong || 0) > 0;
}

async function layThietBiDaBanGiao(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      bgvp.thiet_bi_id,
      bgvp.chi_tiet_don_thue_id,
      bgvp.bo_di_kem_id,
      tb.so_serial
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    JOIN thiet_bi_vat_ly tb ON tb.id = bgvp.thiet_bi_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
      AND bgvp.thiet_bi_id IS NOT NULL
  `;
}

async function layPhuKienDaBanGiao(donThueId) {
  return await prisma.$queryRaw`
    SELECT
      ctdt.id AS chi_tiet_don_thue_id,
      bgvp.bo_di_kem_id,
      bgvp.phu_kien_id,
      SUM(bgvp.so_luong_giao)::int AS so_luong_giao
    FROM ban_giao_vat_pham bgvp
    JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
      AND bgvp.phu_kien_id IS NOT NULL
    GROUP BY ctdt.id, bgvp.bo_di_kem_id, bgvp.phu_kien_id
  `;
}

async function luuThanhLy({
  donThueId,
  nguoiDungId,
  phienThanhToanId,
  ghiChuThanhLy,
  phiPhatSinhTien,
  danhSachThietBiCapNhat,
  tienHoanCoc,
  tienKhauTru,
  tienPhuThu,
  danhSachAnhKhiTra,
  danhSachPhuKienThieu = [],
}) {
  await prisma.$transaction(async (tx) => {
    for (const item of danhSachThietBiCapNhat) {
      await tx.$executeRaw`
        UPDATE thiet_bi_vat_ly
        SET
          trang_thai = ${item.trang_thai_sau_tra},
          updated_at = NOW()
        WHERE id = ${item.thiet_bi_id}::uuid
      `;

      if (Number(item.trang_thai_sau_tra) === TRANG_THAI_THIET_BI_BAO_TRI) {
        const phieuDangBaoTri = await tx.$queryRaw`
          SELECT id
          FROM phieu_bao_tri
          WHERE thiet_bi_id = ${item.thiet_bi_id}::uuid
            AND trang_thai = ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI}
          LIMIT 1
        `;

        if (phieuDangBaoTri.length === 0) {
          const maPhieu = await taoMaPhieuBaoTri(tx);

          await tx.$executeRaw`
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
              ${item.thiet_bi_id}::uuid,
              ${donThueId}::uuid,
              ${item.ly_do_bao_tri},
              ${nguoiDungId}::uuid,
              ${TRANG_THAI_BAO_TRI_DANG_BAO_TRI},
              NOW()
            )
          `;
        }
      }
    }

    for (const phuKien of danhSachPhuKienThieu) {
      const soLuongThieu = Number(phuKien.so_luong_thieu || 0);

      if (soLuongThieu <= 0) continue;

      const soDongCapNhat = await tx.$executeRaw`
        UPDATE phu_kien
        SET
          tong_so_luong = tong_so_luong - ${soLuongThieu},
          so_luong_mat_hu_hong = so_luong_mat_hu_hong + ${soLuongThieu},
          updated_at = NOW()
        WHERE id = ${phuKien.phu_kien_id}::uuid
          AND tong_so_luong >= ${soLuongThieu}
      `;

      if (soDongCapNhat === 0) {
        throw new Error("Không thể trừ số lượng phụ kiện bị thiếu");
      }
    }

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        tra_luc = NOW(),
        nguoi_nhan_tra_id = ${nguoiDungId}::uuid,
        ghi_chu_thanh_ly = ${ghiChuThanhLy},
        phi_phat_sinh_tien = ${phiPhatSinhTien},
        trang_thai = ${TRANG_THAI_HOAN_THANH},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    async function taoDongTien(soTien, loaiDongTienId, ghiChu) {
      if (Number(soTien || 0) <= 0) return;

      await tx.$executeRaw`
        INSERT INTO thanh_toan (
          id,
          don_thue_id,
          phien_thanh_toan_id,
          so_tien,
          loai_dong_tien_id,
          nguoi_thuc_hien_id,
          ghi_chu,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${donThueId}::uuid,
          ${phienThanhToanId}::uuid,
          ${Number(soTien)},
          ${loaiDongTienId},
          ${nguoiDungId}::uuid,
          ${ghiChu},
          NOW()
        )
      `;
    }

    await taoDongTien(tienKhauTru, LOAI_KHAU_TRU_COC, ghiChuThanhLy || "Khấu trừ cọc khi thanh lý");
    await taoDongTien(tienHoanCoc, LOAI_HOAN_COC, ghiChuThanhLy || "Hoàn cọc khi thanh lý");
    await taoDongTien(tienPhuThu, LOAI_PHU_THU, ghiChuThanhLy || "Phụ thu khi thanh lý");

    for (const file of danhSachAnhKhiTra) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          id,
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${donThueId}::uuid,
          ${MUC_DICH_ANH_KHI_TRA},
          ${file.ten_file_goc},
          ${file.file_url},
          ${file.loai_file},
          ${file.kich_thuoc_file},
          ${nguoiDungId}::uuid,
          NOW(),
          NOW()
        )
      `;
    }
  });
}

module.exports = {
  TRANG_THAI_DANG_THUE,
  TRANG_THAI_HOAN_THANH,
  TRANG_THAI_QUA_HAN,
  TRANG_THAI_THIET_BI_SAN_SANG,
  TRANG_THAI_THIET_BI_BAO_TRI,
  TRANG_THAI_THIET_BI_BI_MAT,
  LOAI_TIEN_COC,
  LOAI_HOAN_COC,
  LOAI_KHAU_TRU_COC,
  LOAI_PHU_THU,

  taoMaPhieuBaoTri,
  capNhatDonQuaHan,
  demDonThanhLy,
  layDanhSachDonThanhLy,
  layDonThanhLyTheoId,
  layChiTietDonThanhLy,
  layVatPhamBanGiao,
  layThanhToanCuaDon,
  layTepDonThue,
  layTienCocDaThanhToan,
  kiemTraDaCoThanhLy,
  layThietBiDaBanGiao,
  layPhuKienDaBanGiao,
  luuThanhLy,
};
