const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");

const VAI_TRO_NOI_BO = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];
const VAI_TRO_KHACH_HANG = "KHACH_HANG";

const MUC_DICH_HOP_DONG_GIAY = 2601;
const MUC_DICH_ANH_BAN_GIAO = 2602;
const MUC_DICH_ANH_KHI_TRA = 2603;
const MUC_DICH_ANH_BIEN_BAN_BAN_GIAO = 2604;

function taoLoi(message, statusCode) {
  const loi = new Error(message);
  loi.statusCode = statusCode;
  return loi;
}

function laVaiTroNoiBo(vaiTro) {
  return VAI_TRO_NOI_BO.includes(String(vaiTro || ""));
}

function cungId(a, b) {
  return String(a || "") === String(b || "");
}

function kiemTraUuid(giaTri) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(giaTri || "")
  );
}

function kiemTraIdBatBuoc(id, tenDoiTuong) {
  if (!kiemTraUuid(id)) {
    throw taoLoi(`${tenDoiTuong} không hợp lệ`, 400);
  }
}

async function layNguoiDungHienTai(nguoiDungId) {
  kiemTraIdBatBuoc(nguoiDungId, "Mã người dùng");

  const rows = await prisma.$queryRaw`
    SELECT
      id,
      vai_tro,
      trang_thai
    FROM nguoi_dung
    WHERE id = ${nguoiDungId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  const nguoiDung = rows[0] || null;

  if (!nguoiDung || Number(nguoiDung.trang_thai) !== 101) {
    throw taoLoi("Tài khoản không còn quyền xem ảnh", 403);
  }

  return nguoiDung;
}

async function layHoSoXacMinh(hoSoId) {
  kiemTraIdBatBuoc(hoSoId, "Mã hồ sơ xác minh");

  const rows = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.anh_mat_truoc_public_id,
      hs.anh_mat_sau_public_id,
      hs.anh_cam_cccd_public_id
    FROM ho_so_xac_minh hs
    WHERE hs.id = ${hoSoId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

function layAnhXacMinhTheoLoai(hoSo, loaiAnh) {
  if (loaiAnh === "front") {
    return {
      public_id: hoSo.anh_mat_truoc_public_id,
      file_url: hoSo.anh_mat_truoc_url,
    };
  }

  if (loaiAnh === "back") {
    return {
      public_id: hoSo.anh_mat_sau_public_id,
      file_url: hoSo.anh_mat_sau_url,
    };
  }

  if (loaiAnh === "holding") {
    return {
      public_id: hoSo.anh_cam_cccd_public_id,
      file_url: hoSo.anh_cam_cccd_url,
    };
  }

  throw taoLoi("Loại ảnh xác minh không hợp lệ", 400);
}

async function layTepDonThue(fileId) {
  kiemTraIdBatBuoc(fileId, "Mã file đơn thuê");

  const rows = await prisma.$queryRaw`
    SELECT
      tdt.id,
      tdt.don_thue_id,
      tdt.muc_dich_id,
      tdt.file_url,
      tdt.loai_file,
      tdt.cloudinary_public_id,
      tdt.cloudinary_resource_type,
      tdt.cloudinary_delivery_type,
      dt.khach_hang_id,
      dt.ban_giao_luc,
      dt.tra_luc
    FROM tep_don_thue tdt
    JOIN don_thue dt ON dt.id = tdt.don_thue_id
    WHERE tdt.id = ${fileId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

function kiemTraQuyenXemHoSo(hoSo, nguoiDung) {
  if (laVaiTroNoiBo(nguoiDung?.vai_tro)) {
    return;
  }

  if (
    String(nguoiDung?.vai_tro || "") === VAI_TRO_KHACH_HANG &&
    cungId(hoSo.khach_hang_id, nguoiDung.id)
  ) {
    return;
  }

  throw taoLoi("Không có quyền truy cập ảnh xác minh", 403);
}

function kiemTraQuyenXemTepDon(tep, nguoiDung) {
  if (laVaiTroNoiBo(nguoiDung?.vai_tro)) {
    return;
  }

  if (
    String(nguoiDung?.vai_tro || "") !== VAI_TRO_KHACH_HANG ||
    !cungId(tep.khach_hang_id, nguoiDung.id)
  ) {
    throw taoLoi("Không có quyền truy cập file đơn thuê", 403);
  }

  const mucDich = Number(tep.muc_dich_id);

  if (
    [
      MUC_DICH_HOP_DONG_GIAY,
      MUC_DICH_ANH_BAN_GIAO,
      MUC_DICH_ANH_BIEN_BAN_BAN_GIAO,
    ].includes(mucDich)
  ) {
    if (!tep.ban_giao_luc) {
      throw taoLoi("Tài liệu chỉ được xem sau khi đơn đã bàn giao", 403);
    }

    return;
  }

  if (mucDich === MUC_DICH_ANH_KHI_TRA) {
    if (!tep.tra_luc) {
      throw taoLoi("Ảnh hoàn trả chỉ được xem sau khi đơn đã hoàn trả", 403);
    }

    return;
  }

  throw taoLoi("Khách hàng không có quyền xem loại file này", 403);
}

function taoCloudinarySignedUrl({ public_id, resource_type, delivery_type }) {
  return cloudinary.url(public_id, {
    secure: true,
    sign_url: true,
    resource_type: resource_type || "image",
    type: delivery_type || "authenticated",
  });
}

// Lấy nguồn ảnh xác minh sau khi kiểm JWT user và quyền hiện tại.
// URL Cloudinary chỉ tồn tại trong Backend, không trả cho Frontend.
async function layNguonAnhXacMinhBaoVe(nguoiDungJwt, hoSoId, loaiAnh) {
  const nguoiDung = await layNguoiDungHienTai(nguoiDungJwt?.id);
  const hoSo = await layHoSoXacMinh(hoSoId);

  if (!hoSo) {
    throw taoLoi("Không tìm thấy hồ sơ xác minh", 404);
  }

  kiemTraQuyenXemHoSo(hoSo, nguoiDung);

  const anh = layAnhXacMinhTheoLoai(hoSo, loaiAnh);

  if (anh.public_id) {
    return {
      source_url: taoCloudinarySignedUrl({
        public_id: anh.public_id,
        resource_type: "image",
        delivery_type: "authenticated",
      }),
      content_type: "image/*",
    };
  }

  // Fallback ảnh cũ chưa migrate: Backend tự fetch URL cũ sau khi kiểm quyền.
  if (anh.file_url) {
    return {
      source_url: anh.file_url,
      content_type: "image/*",
    };
  }

  throw taoLoi("Không tìm thấy ảnh xác minh", 404);
}

// Lấy nguồn file đơn thuê sau khi kiểm JWT user, chủ sở hữu và trạng thái nghiệp vụ.
// Frontend chỉ nhận binary từ controller, không nhận source_url.
async function layNguonTepDonThueBaoVe(nguoiDungJwt, fileId) {
  const nguoiDung = await layNguoiDungHienTai(nguoiDungJwt?.id);
  const tep = await layTepDonThue(fileId);

  if (!tep) {
    throw taoLoi("Không tìm thấy file đơn thuê", 404);
  }

  kiemTraQuyenXemTepDon(tep, nguoiDung);

  if (tep.cloudinary_public_id) {
    return {
      source_url: taoCloudinarySignedUrl({
        public_id: tep.cloudinary_public_id,
        resource_type: tep.cloudinary_resource_type || "image",
        delivery_type: tep.cloudinary_delivery_type || "authenticated",
      }),
      content_type: tep.loai_file || "image/*",
    };
  }

  // Fallback file cũ chưa migrate.
  if (tep.file_url) {
    return {
      source_url: tep.file_url,
      content_type: tep.loai_file || "image/*",
    };
  }

  throw taoLoi("Không tìm thấy dữ liệu file", 404);
}

module.exports = {
  layNguonAnhXacMinhBaoVe,
  layNguonTepDonThueBaoVe,
};
