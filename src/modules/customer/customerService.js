const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

// ============================================================
// HELPER: Kiểm tra số CCCD đã được sử dụng chưa
// ============================================================
async function kiem_tra_so_cccd_da_duoc_su_dung(so_cccd, ho_so_id, thong_bao_loi) {
  if (!so_cccd) return;

  const danh_sach_ho_so = await prisma.$queryRaw`
    SELECT id
    FROM ho_so_khach_hang
    WHERE so_cccd = ${so_cccd}
      AND id != ${ho_so_id}
    LIMIT 1
  `;

  if (danh_sach_ho_so && danh_sach_ho_so.length > 0) {
    const error = new Error(thong_bao_loi);
    error.statusCode = 409;
    throw error;
  }
}

// ============================================================
// HELPER: Upload ảnh xác minh lên Cloudinary
// ============================================================
async function tai_anh_xac_minh_len_cloudinary(file, ten_anh) {
  try {
    const ket_qua_upload = await uploadBufferToCloudinary(
      file.buffer,
      "t-rent/verifications",
      "image"
    );

    return ket_qua_upload.secure_url;
  } catch (loi_upload) {
    const error = new Error(`Upload ${ten_anh} thất bại: ${loi_upload.message}`);
    error.statusCode = 500;
    throw error;
  }
}

// ============================================================
// GET CUSTOMER PROFILE (helper dùng chung)
// ============================================================
async function getCustomerProfile(nguoi_dung_id) {
  const ho_so = await prisma.$queryRaw`
    SELECT id, nguoi_dung_id, dia_chi, so_cccd, trang_thai_xac_minh, created_at, updated_at
    FROM ho_so_khach_hang
    WHERE nguoi_dung_id = ${nguoi_dung_id}
    LIMIT 1
  `;

  if (!ho_so || ho_so.length === 0) {
    const error = new Error("Không tìm thấy hồ sơ khách hàng");
    error.statusCode = 404;
    throw error;
  }

  return ho_so[0];
}

// ============================================================
// GET CUSTOMER ACCOUNT
// ============================================================
async function getCustomerAccount(nguoi_dung_id) {
  const danh_sach_nguoi_dung = await prisma.$queryRaw`
    SELECT
      u.id,
      u.ho_ten,
      u.email,
      u.so_dien_thoai,
      u.vai_tro,
      u.trang_thai,
      u.da_xoa_luc,
      u.created_at,
      u.updated_at,
      p.id as ho_so_khach_hang_id,
      p.dia_chi,
      p.so_cccd,
      p.trang_thai_xac_minh,
      p.created_at as ho_so_created_at,
      p.updated_at as ho_so_updated_at
    FROM nguoi_dung u
    LEFT JOIN ho_so_khach_hang p ON p.nguoi_dung_id = u.id
    WHERE u.id = ${nguoi_dung_id}
    LIMIT 1
  `;

  if (!danh_sach_nguoi_dung || danh_sach_nguoi_dung.length === 0) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const nguoi_dung = danh_sach_nguoi_dung[0];

  // Lấy ho_so_xac_minh gần nhất
  const danh_sach_ho_so_xac_minh = await prisma.$queryRaw`
    SELECT
      id,
      so_cccd,
      trang_thai,
      ly_do_tu_choi,
      duyet_luc,
      created_at
    FROM ho_so_xac_minh
    WHERE khach_hang_id = ${nguoi_dung.ho_so_khach_hang_id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const ho_so_xac_minh_moi_nhat = danh_sach_ho_so_xac_minh && danh_sach_ho_so_xac_minh.length > 0 ? danh_sach_ho_so_xac_minh[0] : null;

  // Response - dùng field DB tiếng Việt
  return {
    id: nguoi_dung.id,
    ho_ten: nguoi_dung.ho_ten,
    email: nguoi_dung.email,
    so_dien_thoai: nguoi_dung.so_dien_thoai,
    vai_tro: nguoi_dung.vai_tro,
    trang_thai: nguoi_dung.trang_thai,
    created_at: nguoi_dung.created_at,
    updated_at: nguoi_dung.updated_at,
    ho_so_khach_hang: nguoi_dung.ho_so_khach_hang_id
      ? {
          id: nguoi_dung.ho_so_khach_hang_id,
          dia_chi: nguoi_dung.dia_chi,
          so_cccd: nguoi_dung.so_cccd,
          trang_thai_xac_minh: nguoi_dung.trang_thai_xac_minh,
          created_at: nguoi_dung.ho_so_created_at,
          updated_at: nguoi_dung.ho_so_updated_at,
          ho_so_xac_minh_moi_nhat: ho_so_xac_minh_moi_nhat && ho_so_xac_minh_moi_nhat.id
            ? {
                id: ho_so_xac_minh_moi_nhat.id,
                so_cccd: ho_so_xac_minh_moi_nhat.so_cccd || null,
                trang_thai: ho_so_xac_minh_moi_nhat.trang_thai || null,
                ly_do_tu_choi: ho_so_xac_minh_moi_nhat.ly_do_tu_choi || null,
                duyet_luc: ho_so_xac_minh_moi_nhat.duyet_luc || null,
                created_at: ho_so_xac_minh_moi_nhat.created_at || null,
              }
            : null,
        }
      : null,
  };
}

// ============================================================
// UPDATE CUSTOMER PROFILE
// ============================================================
async function updateCustomerProfile(nguoi_dung_id, du_lieu_cap_nhat) {
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  if (ho_so.trang_thai_xac_minh === "DA_DUYET") {
    const error = new Error("Hồ sơ đã được duyệt, không thể cập nhật thông tin cá nhân");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra so_cccd đã được sử dụng chưa (nếu có thay đổi)
  const so_cccd_moi = du_lieu_cap_nhat.so_cccd;
  if (so_cccd_moi && so_cccd_moi !== ho_so.so_cccd) {
    await kiem_tra_so_cccd_da_duoc_su_dung(
      so_cccd_moi,
      ho_so.id,
      "Số định danh đã được sử dụng"
    );
  }

  // Update hồ sơ khách hàng
  const dia_chi_moi = du_lieu_cap_nhat.dia_chi;
  await prisma.$executeRaw`
    UPDATE ho_so_khach_hang
    SET
      dia_chi = ${dia_chi_moi !== undefined ? dia_chi_moi : ho_so.dia_chi},
      so_cccd = ${so_cccd_moi !== undefined ? so_cccd_moi : ho_so.so_cccd},
      updated_at = NOW()
    WHERE id = ${ho_so.id}
  `;

  // Lấy lại profile sau khi update
  const danh_sach_ho_so_cap_nhat = await prisma.$queryRaw`
    SELECT id, dia_chi, so_cccd, trang_thai_xac_minh
    FROM ho_so_khach_hang
    WHERE id = ${ho_so.id}
    LIMIT 1
  `;

  const ho_so_da_cap_nhat = danh_sach_ho_so_cap_nhat[0];

  return {
    id: ho_so_da_cap_nhat.id,
    dia_chi: ho_so_da_cap_nhat.dia_chi,
    so_cccd: ho_so_da_cap_nhat.so_cccd,
    trang_thai_xac_minh: ho_so_da_cap_nhat.trang_thai_xac_minh,
  };
}

// ============================================================
// SUBMIT VERIFICATION
// ============================================================
async function submitVerification(nguoi_dung_id, files, so_cccd) {
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  // Kiểm tra trạng thái xác minh hiện tại
  if (ho_so.trang_thai_xac_minh === "CHO_DUYET") {
    const error = new Error("Hồ sơ xác minh đang được xử lý, vui lòng chờ duyệt");
    error.statusCode = 400;
    throw error;
  }

  if (ho_so.trang_thai_xac_minh === "DA_DUYET") {
    const error = new Error("Tài khoản đã được xác minh");
    error.statusCode = 400;
    throw error;
  }

  // Dùng so_cccd từ body hoặc từ profile hiện tại
  const so_cccd_su_dung = so_cccd || ho_so.so_cccd;

  if (!so_cccd_su_dung) {
    const error = new Error("Vui lòng cung cấp số CCCD");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra so_cccd đã được sử dụng bởi tài khoản khác chưa (nếu thay đổi)
  if (so_cccd_su_dung !== ho_so.so_cccd) {
    await kiem_tra_so_cccd_da_duoc_su_dung(
      so_cccd_su_dung,
      ho_so.id,
      "Số định danh đã được sử dụng bởi tài khoản khác"
    );
  }

  if (
    !files ||
    !files.anh_mat_truoc ||
    !files.anh_mat_truoc[0] ||
    !files.anh_mat_truoc[0].buffer ||
    !files.anh_mat_sau ||
    !files.anh_mat_sau[0] ||
    !files.anh_mat_sau[0].buffer
  ) {
    const error = new Error("Vui lòng upload đầy đủ ảnh mặt trước và mặt sau CCCD");
    error.statusCode = 400;
    throw error;
  }

  // Upload ảnh lên Cloudinary
  const anh_mat_truoc_url = await tai_anh_xac_minh_len_cloudinary(
    files.anh_mat_truoc[0],
    "ảnh mặt trước"
  );

  const anh_mat_sau_url = await tai_anh_xac_minh_len_cloudinary(
    files.anh_mat_sau[0],
    "ảnh mặt sau"
  );

  // Transaction: tạo ho_so_xac_minh + cập nhật profile
  const ket_qua = await prisma.$transaction(async (tx) => {
    const ket_qua_tao = await tx.$queryRaw`
      INSERT INTO ho_so_xac_minh (khach_hang_id, so_cccd, anh_mat_truoc_url, anh_mat_sau_url, trang_thai, created_at)
      VALUES (${ho_so.id}, ${so_cccd_su_dung}, ${anh_mat_truoc_url}, ${anh_mat_sau_url}, 'CHO_DUYET', NOW())
      RETURNING id, so_cccd, anh_mat_truoc_url, anh_mat_sau_url, trang_thai, created_at
    `;

    const ho_so_xac_minh = ket_qua_tao[0];

    // Update ho_so_khach_hang - gộp thành 1 câu UPDATE
    await tx.$executeRaw`
      UPDATE ho_so_khach_hang
      SET trang_thai_xac_minh = 'CHO_DUYET',
          so_cccd = ${so_cccd_su_dung},
          updated_at = NOW()
      WHERE id = ${ho_so.id}
    `;

    return ho_so_xac_minh;
  });

  return {
    id: ket_qua.id,
    so_cccd: ket_qua.so_cccd,
    anh_mat_truoc_url: ket_qua.anh_mat_truoc_url,
    anh_mat_sau_url: ket_qua.anh_mat_sau_url,
    trang_thai: ket_qua.trang_thai,
    created_at: ket_qua.created_at,
  };
}

module.exports = {
  getCustomerAccount,
  updateCustomerProfile,
  submitVerification,
};
