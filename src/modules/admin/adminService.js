const prisma = require("../../config/prisma");

async function layDanhSachHoSoXacMinhService(query) {
  const tuKhoa = query.tu_khoa || "";
  const mauTimKiem = `%${tuKhoa}%`;
  const trangThai = Number(query.trang_thai) || 0;

  const danhSachHoSo = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui

    FROM ho_so_xac_minh hs

    JOIN nguoi_dung nd
      ON nd.id = hs.khach_hang_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = hs.trang_thai

    WHERE nd.da_xoa_luc IS NULL
      AND (
        ${tuKhoa} = ''
        OR nd.ho_ten ILIKE ${mauTimKiem}
        OR nd.email ILIKE ${mauTimKiem}
        OR nd.so_dien_thoai ILIKE ${mauTimKiem}
        OR hs.so_cccd ILIKE ${mauTimKiem}
      )
      AND (
        ${trangThai}::int = 0
        OR hs.trang_thai = ${trangThai}::int
      )

    ORDER BY hs.created_at DESC
  `;

  return danhSachHoSo;
}

async function layChiTietHoSoXacMinhService(hoSoId) {
  const danhSachHoSo = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui

    FROM ho_so_xac_minh hs

    JOIN nguoi_dung nd
      ON nd.id = hs.khach_hang_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = hs.trang_thai

    WHERE hs.id = ${hoSoId}::uuid
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (danhSachHoSo.length === 0) {
    throw new Error("Không tìm thấy hồ sơ xác minh");
  }

  return danhSachHoSo[0];
}

async function duyetHoSoXacMinhService(hoSoId, nguoiDuyetId) {
  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể duyệt hồ sơ đang chờ duyệt");
  }

  await prisma.$executeRaw`
    UPDATE ho_so_xac_minh
    SET
      trang_thai = 203,
      ly_do_tu_choi = NULL,
      nguoi_duyet_id = ${nguoiDuyetId}::uuid,
      duyet_luc = NOW()
    WHERE id = ${hoSoId}::uuid
  `;

  await prisma.$executeRaw`
    UPDATE nguoi_dung
    SET
      trang_thai_xac_minh = 203,
      updated_at = NOW()
    WHERE id = ${hoSo.khach_hang_id}::uuid
  `;

  return layChiTietHoSoXacMinhService(hoSoId);
}

async function tuChoiHoSoXacMinhService(hoSoId, nguoiDuyetId, lyDoTuChoi) {
  if (!lyDoTuChoi || !lyDoTuChoi.trim()) {
    throw new Error("Vui lòng nhập lý do từ chối");
  }

  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể từ chối hồ sơ đang chờ duyệt");
  }

  await prisma.$executeRaw`
    UPDATE ho_so_xac_minh
    SET
      trang_thai = 204,
      ly_do_tu_choi = ${lyDoTuChoi},
      nguoi_duyet_id = ${nguoiDuyetId}::uuid,
      duyet_luc = NOW()
    WHERE id = ${hoSoId}::uuid
  `;

  await prisma.$executeRaw`
    UPDATE nguoi_dung
    SET
      trang_thai_xac_minh = 204,
      updated_at = NOW()
    WHERE id = ${hoSo.khach_hang_id}::uuid
  `;

  return layChiTietHoSoXacMinhService(hoSoId);
}

async function layDanhSachKhachHangService(query) {
  const tuKhoa = query.tu_khoa || "";
  const mauTimKiem = `%${tuKhoa}%`;
  const trangThai = Number(query.trang_thai) || 0;
  const danhSachKhachHang = await prisma.$queryRaw`
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
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai AS trang_thai_ho_so,
      tt_hs.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
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
      -- AND hs.id IS NOT NULL

      AND (
        ${tuKhoa} = ''
        OR nd.ho_ten ILIKE ${mauTimKiem}
        OR nd.email ILIKE ${mauTimKiem}
        OR nd.so_dien_thoai ILIKE ${mauTimKiem}
      )

      AND (
        ${trangThai}::int = 0
        OR nd.trang_thai_xac_minh = ${trangThai}::int
      )

    ORDER BY COALESCE(hs.created_at, nd.created_at) DESC
  `;

  return danhSachKhachHang;
}

async function layChiTietKhachHangService(khachHangId) {
  const danhSachKhachHang = await prisma.$queryRaw`
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
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
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

  if (danhSachKhachHang.length === 0) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return danhSachKhachHang[0];
}

module.exports = {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
};