const prisma = require("../../config/prisma");

const {
  taiAnhLenCloudinaryService,
} = require("../uploads/uploadService");

// Cập nhật thông tin cá nhân
async function capNhatThongTinCaNhanService(nguoiDungId, duLieu) {
  const { ho_ten, so_dien_thoai, dia_chi } = duLieu;

  const danhSachTrungSoDienThoai = await prisma.$queryRaw`
    SELECT id
    FROM nguoi_dung
    WHERE so_dien_thoai = ${so_dien_thoai}
      AND id <> ${nguoiDungId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSachTrungSoDienThoai.length > 0) {
    throw new Error("Số điện thoại đã được sử dụng");
  }

  const danhSachNguoiDung = await prisma.$queryRaw`
    WITH nguoi_dung_cap_nhat AS (
      UPDATE nguoi_dung
      SET 
        ho_ten = ${ho_ten},
        so_dien_thoai = ${so_dien_thoai},
        dia_chi = ${dia_chi},
        updated_at = NOW()
      WHERE id = ${nguoiDungId}::uuid
        AND da_xoa_luc IS NULL
      RETURNING
        id,
        ho_ten,
        email,
        so_dien_thoai,
        dia_chi,
        vai_tro,
        trang_thai,
        trang_thai_xac_minh
    )
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.vai_tro,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,
      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh
    FROM nguoi_dung_cap_nhat nd
    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai
    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh
  `;

  if (danhSachNguoiDung.length === 0) {
    throw new Error("Không tìm thấy người dùng");
  }

  return danhSachNguoiDung[0];
}

// Lấy hồ sơ xác minh của tôi
async function layHoSoXacMinhCuaToiService(nguoiDungId) {
  const danhSachHoSo = await prisma.$queryRaw`
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
      hs.created_at AS ngay_gui

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

    WHERE nd.id = ${nguoiDungId}::uuid
      AND nd.da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSachHoSo.length === 0) {
    throw new Error("Không tìm thấy người dùng");
  }

  return danhSachHoSo[0];
}

// Gửi hồ sơ xác minh
async function guiHoSoXacMinhService(nguoiDungId, duLieu) {
  const { so_cccd, anh_mat_truoc, anh_mat_sau, anh_cam_cccd } = duLieu;

  const danhSachNguoiDung = await prisma.$queryRaw`
    SELECT id, trang_thai_xac_minh
    FROM nguoi_dung
    WHERE id = ${nguoiDungId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (danhSachNguoiDung.length === 0) {
    throw new Error("Không tìm thấy người dùng");
  }

  const nguoiDung = danhSachNguoiDung[0];

  if (nguoiDung.trang_thai_xac_minh === 202) {
    throw new Error("Hồ sơ của bạn đang chờ duyệt");
  }

  if (nguoiDung.trang_thai_xac_minh === 203) {
    throw new Error("Hồ sơ của bạn đã được duyệt");
  }

  const ketQuaAnhMatTruoc = await taiAnhLenCloudinaryService(
    anh_mat_truoc,
    "verification"
  );

  const ketQuaAnhMatSau = await taiAnhLenCloudinaryService(
    anh_mat_sau,
    "verification"
  );

  const ketQuaAnhCamCccd = await taiAnhLenCloudinaryService(
    anh_cam_cccd,
    "verification"
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO ho_so_xac_minh (
        khach_hang_id,
        so_cccd,
        anh_mat_truoc_url,
        anh_mat_sau_url,
        anh_cam_cccd_url,
        trang_thai
      )
      VALUES (
        ${nguoiDungId}::uuid,
        ${so_cccd},
        ${ketQuaAnhMatTruoc.url},
        ${ketQuaAnhMatSau.url},
        ${ketQuaAnhCamCccd.url},
        202
      )
    `;

    await tx.$executeRaw`
      UPDATE nguoi_dung
      SET 
        trang_thai_xac_minh = 202,
        updated_at = NOW()
      WHERE id = ${nguoiDungId}::uuid
    `;
  });

  return await layHoSoXacMinhCuaToiService(nguoiDungId);
}

module.exports = {
  capNhatThongTinCaNhanService,
  layHoSoXacMinhCuaToiService,
  guiHoSoXacMinhService,
};