const prisma = require("../../config/prisma");

// Lấy danh sách hồ sơ xác minh
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
      hs.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
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
      )
      AND (
        ${trangThai}::int = 0
        OR hs.trang_thai = ${trangThai}::int
      )

    ORDER BY hs.created_at DESC
  `;

  return danhSachHoSo;
}

// Lấy chi tiết hồ sơ xác minh
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

// Duyệt hồ sơ xác minh
async function duyetHoSoXacMinhService(hoSoId, nguoiDuyetId) {
  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (hoSo.trang_thai !== 202) {
    throw new Error("Hồ sơ đã được xử lý");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET
        trang_thai = 203,
        nguoi_duyet_id = ${nguoiDuyetId}::uuid,
        duyet_luc = NOW()
      WHERE id = ${hoSoId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE nguoi_dung
      SET
        trang_thai_xac_minh = 203,
        updated_at = NOW()
      WHERE id = ${hoSo.khach_hang_id}::uuid
    `;
  });

  return await layChiTietHoSoXacMinhService(hoSoId);
}

// Từ chối hồ sơ xác minh
async function tuChoiHoSoXacMinhService(hoSoId, nguoiDuyetId, lyDoTuChoi) {
  const lyDo = lyDoTuChoi ? lyDoTuChoi.trim() : "";

  if (!lyDo) {
    throw new Error("Vui lòng nhập lý do từ chối");
  }

  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (hoSo.trang_thai !== 202) {
    throw new Error("Hồ sơ đã được xử lý");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET
        trang_thai = 204,
        ly_do_tu_choi = ${lyDo},
        nguoi_duyet_id = ${nguoiDuyetId}::uuid,
        duyet_luc = NOW()
      WHERE id = ${hoSoId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE nguoi_dung
      SET
        trang_thai_xac_minh = 204,
        updated_at = NOW()
      WHERE id = ${hoSo.khach_hang_id}::uuid
    `;
  });

  return await layChiTietHoSoXacMinhService(hoSoId);
}

module.exports = {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
};