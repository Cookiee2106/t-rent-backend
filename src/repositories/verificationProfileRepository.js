const prisma = require("../config/prisma");

async function layHoSoXacMinhCuaKhachHang(nguoiDungId) {
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

  return rows[0] || null;
}

async function layTrangThaiXacMinhNguoiDung(nguoiDungId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      trang_thai_xac_minh
    FROM nguoi_dung
    WHERE id = ${nguoiDungId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function timHoSoDangChoDuyetHoacDaDuyetTheoSoCccd(nguoiDungId, soCccd) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM ho_so_xac_minh
    WHERE so_cccd = ${soCccd}
      AND khach_hang_id <> ${nguoiDungId}::uuid
      AND trang_thai IN (202, 203)
    LIMIT 1
  `;

  return rows[0] || null;
}

async function taoHoSoXacMinhVaCapNhatTrangThai({
  nguoiDungId,
  soCccd,
  anhMatTruocUrl,
  anhMatSauUrl,
  anhCamCccdUrl,
}) {
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
        ${soCccd},
        ${anhMatTruocUrl},
        ${anhMatSauUrl},
        ${anhCamCccdUrl},
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
}

module.exports = {
  layHoSoXacMinhCuaKhachHang,
  layTrangThaiXacMinhNguoiDung,
  timHoSoDangChoDuyetHoacDaDuyetTheoSoCccd,
  taoHoSoXacMinhVaCapNhatTrangThai,
};