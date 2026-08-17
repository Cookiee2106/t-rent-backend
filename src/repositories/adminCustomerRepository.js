const prisma = require("../config/prisma");

async function layDanhSachKhachHang({
  tuKhoa,
  mauTimKiem,
  trangThai,
}) {
  return await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,

      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh,

      hs.id AS ho_so_xac_minh_id,
      hs.so_cccd,
      (
        hs.anh_mat_truoc_public_id IS NOT NULL
        OR hs.anh_mat_truoc_url IS NOT NULL
      ) AS co_anh_mat_truoc,
      (
        hs.anh_mat_sau_public_id IS NOT NULL
        OR hs.anh_mat_sau_url IS NOT NULL
      ) AS co_anh_mat_sau,
      (
        hs.anh_cam_cccd_public_id IS NOT NULL
        OR hs.anh_cam_cccd_url IS NOT NULL
      ) AS co_anh_cam_cccd,
      hs.trang_thai AS trang_thai_ho_so,
      tt_hs.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui,

      nd.created_at
    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh

    LEFT JOIN LATERAL (
      SELECT *
      FROM ho_so_xac_minh
      WHERE khach_hang_id = nd.id
      ORDER BY created_at DESC
      LIMIT 1
    ) hs ON TRUE

    LEFT JOIN trang_thai_he_thong tt_hs
      ON tt_hs.id = hs.trang_thai

    WHERE nd.vai_tro = 'KHACH_HANG'
      AND nd.da_xoa_luc IS NULL

      AND (
        ${tuKhoa} = ''
        OR nd.ho_ten ILIKE ${mauTimKiem}
        OR nd.email ILIKE ${mauTimKiem}
        OR nd.so_dien_thoai ILIKE ${mauTimKiem}
        OR hs.so_cccd ILIKE ${mauTimKiem}
      )

      AND (
        ${trangThai}::int = 0
        OR nd.trang_thai_xac_minh = ${trangThai}::int
      )

    ORDER BY COALESCE(hs.created_at, nd.created_at) DESC
  `;
}

async function layChiTietKhachHang(khachHangId) {
  const rows = await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,

      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh,

      hs.id AS ho_so_xac_minh_id,
      hs.so_cccd,
      (
        hs.anh_mat_truoc_public_id IS NOT NULL
        OR hs.anh_mat_truoc_url IS NOT NULL
      ) AS co_anh_mat_truoc,
      (
        hs.anh_mat_sau_public_id IS NOT NULL
        OR hs.anh_mat_sau_url IS NOT NULL
      ) AS co_anh_mat_sau,
      (
        hs.anh_cam_cccd_public_id IS NOT NULL
        OR hs.anh_cam_cccd_url IS NOT NULL
      ) AS co_anh_cam_cccd,
      hs.trang_thai AS trang_thai_ho_so,
      tt_hs.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui,

      nd.created_at
    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh

    LEFT JOIN LATERAL (
      SELECT *
      FROM ho_so_xac_minh
      WHERE khach_hang_id = nd.id
      ORDER BY created_at DESC
      LIMIT 1
    ) hs ON TRUE

    LEFT JOIN trang_thai_he_thong tt_hs
      ON tt_hs.id = hs.trang_thai

    WHERE nd.id = ${khachHangId}::uuid
      AND nd.vai_tro = 'KHACH_HANG'
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function capNhatTrangThaiKhachHang(khachHangId, trangThai) {
  const rows = await prisma.$queryRaw`
    UPDATE nguoi_dung
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${khachHangId}::uuid
      AND vai_tro = 'KHACH_HANG'
      AND da_xoa_luc IS NULL
    RETURNING id
  `;

  return rows[0] || null;
}

async function layHoSoXacMinhTheoId(hoSoId) {
  const rows = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      hs.trang_thai
    FROM ho_so_xac_minh hs

    JOIN nguoi_dung nd
      ON nd.id = hs.khach_hang_id

    WHERE hs.id = ${hoSoId}::uuid
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  return rows[0] || null;
}

async function duyetHoSoXacMinh(hoSoId, khachHangId, nguoiDuyetId) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET
        trang_thai = 203,
        ly_do_tu_choi = NULL,
        nguoi_duyet_id = ${nguoiDuyetId}::uuid,
        duyet_luc = NOW()
      WHERE id = ${hoSoId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE nguoi_dung
      SET
        trang_thai_xac_minh = 203,
        updated_at = NOW()
      WHERE id = ${khachHangId}::uuid
    `;
  });
}

async function tuChoiHoSoXacMinh(hoSoId, khachHangId, nguoiDuyetId, lyDoTuChoi) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET
        trang_thai = 204,
        ly_do_tu_choi = ${lyDoTuChoi},
        nguoi_duyet_id = ${nguoiDuyetId}::uuid,
        duyet_luc = NOW()
      WHERE id = ${hoSoId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE nguoi_dung
      SET
        trang_thai_xac_minh = 204,
        updated_at = NOW()
      WHERE id = ${khachHangId}::uuid
    `;
  });
}

module.exports = {
  layDanhSachKhachHang,
  layChiTietKhachHang,
  capNhatTrangThaiKhachHang,
  layHoSoXacMinhTheoId,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
};