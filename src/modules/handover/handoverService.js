const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

// ============================================================
// UPLOAD HANDOVER IMAGES (API #11)
// ============================================================
async function uploadHandoverImages(don_thue_id, files, body_image_urls) {
  // Kiểm tra đơn thuê tồn tại
  const danh_sach_don = await prisma.$queryRaw`
    SELECT id FROM don_thue WHERE id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const danh_sach_anh = [];

  // 1. Upload file lên Cloudinary (nếu có)
  if (files && files.length > 0) {
    for (const file of files) {
      const ket_qua = await uploadBufferToCloudinary(file.buffer, "t-rent/handover", "image");
      danh_sach_anh.push({
        file_url: ket_qua.secure_url,
        ten_file_goc: file.originalname,
        loai_file: file.mimetype,
        kich_thuoc_file: file.size,
      });
    }
  }

  // 2. Nếu có URL ảnh từ body → dùng trực tiếp
  if (body_image_urls && body_image_urls.length > 0) {
    for (const url of body_image_urls) {
      danh_sach_anh.push({
        file_url: typeof url === "string" ? url : url.file_url,
        ten_file_goc: typeof url === "string" ? "handover-image" : url.ten_file_goc || "handover-image",
        loai_file: typeof url === "string" ? null : url.loai_file || null,
        kich_thuoc_file: typeof url === "string" ? null : url.kich_thuoc_file || null,
      });
    }
  }

  if (danh_sach_anh.length === 0) {
    const error = new Error("Vui lòng upload ít nhất 1 ảnh hoặc cung cấp URL ảnh");
    error.statusCode = 400;
    throw error;
  }

  return { danh_sach_anh };
}

// ============================================================
// CREATE HANDOVER (API #12)
// ============================================================
async function createHandover(don_thue_id, nhan_vien_id, du_lieu) {
  const { danh_sach_tai_san, danh_sach_anh_url, ghi_chu } = du_lieu;

  // Kiểm tra đơn thuê
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.trang_thai
    FROM don_thue dt
    WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  if (don.trang_thai !== "DA_GIU_CHO") {
    const error = new Error("Đơn thuê phải ở trạng thái 'Đã giữ chỗ' để bàn giao");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra chưa có phiếu bàn giao
  const phieu_ban_giao_cu = await prisma.$queryRaw`
    SELECT id FROM phieu_ban_giao WHERE don_thue_id = ${don_thue_id}::uuid LIMIT 1
  `;

  if (phieu_ban_giao_cu.length > 0) {
    const error = new Error("Đơn thuê này đã được bàn giao");
    error.statusCode = 400;
    throw error;
  }

  if (!danh_sach_tai_san || danh_sach_tai_san.length === 0) {
    const error = new Error("Vui lòng chọn tài sản để bàn giao");
    error.statusCode = 400;
    throw error;
  }

  // Lấy tất cả asset IDs từ request
  const tat_ca_tai_san_id = danh_sach_tai_san.flatMap((ts) => ts.danh_sach_tai_san_id);

  // Kiểm tra tài sản tồn tại và SAN_SANG
  const danh_sach_thiet_bi = await prisma.$queryRaw`
    SELECT id, ma_tai_san, so_serial, trang_thai, vi_tri_hien_tai_id, ghi_chu_tinh_trang
    FROM thiet_bi_vat_ly
    WHERE id = ANY(${tat_ca_tai_san_id}::uuid[])
  `;

  if (danh_sach_thiet_bi.length !== tat_ca_tai_san_id.length) {
    const error = new Error("Một số tài sản không tồn tại");
    error.statusCode = 400;
    throw error;
  }

  const tai_san_khong_san_sang = danh_sach_thiet_bi.filter((tb) => tb.trang_thai !== "SAN_SANG");
  if (tai_san_khong_san_sang.length > 0) {
    const error = new Error(
      `Tài sản ${tai_san_khong_san_sang.map((tb) => tb.ma_tai_san).join(", ")} không sẵn sàng`
    );
    error.statusCode = 400;
    throw error;
  }

  // Lấy chi tiết đơn thuê để kiểm tra số lượng
  const danh_sach_chi_tiet_don = await prisma.$queryRaw`
    SELECT id, mau_thiet_bi_id, so_luong
    FROM chi_tiet_don_thue
    WHERE don_thue_id = ${don_thue_id}::uuid
  `;

  for (const item of danh_sach_tai_san) {
    const chi_tiet = danh_sach_chi_tiet_don.find(
      (ct) => ct.mau_thiet_bi_id === item.mau_thiet_bi_id
    );
    if (!chi_tiet) {
      const error = new Error(`Mẫu thiết bị ${item.mau_thiet_bi_id} không có trong đơn thuê`);
      error.statusCode = 400;
      throw error;
    }
    if (item.danh_sach_tai_san_id.length < chi_tiet.so_luong) {
      const error = new Error(
        `Mẫu thiết bị ${item.mau_thiet_bi_id} cần chọn ít nhất ${chi_tiet.so_luong} tài sản`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Transaction
  const ket_qua = await prisma.$transaction(async (tx) => {
    // 1. INSERT phieu_ban_giao
    const phieu_moi = await tx.$queryRaw`
      INSERT INTO phieu_ban_giao (id, don_thue_id, nhan_vien_id, ban_giao_luc, ghi_chu, trang_thai, created_at, updated_at)
      VALUES (gen_random_uuid(), ${don_thue_id}::uuid, ${nhan_vien_id}::uuid, NOW(), ${ghi_chu || null}, 'HOAN_THANH', NOW(), NOW())
      RETURNING id
    `;
    const phieu_ban_giao_id = phieu_moi[0].id;

    let so_luong_chi_tiet = 0;

    for (const item of danh_sach_tai_san) {
      const chi_tiet = danh_sach_chi_tiet_don.find(
        (ct) => ct.mau_thiet_bi_id === item.mau_thiet_bi_id
      );

      for (const tai_san_id of item.danh_sach_tai_san_id) {
        const thiet_bi = danh_sach_thiet_bi.find((tb) => tb.id === tai_san_id);

        // 2. INSERT thiet_bi_gan_voi_don
        const thiet_bi_gan = await tx.$queryRaw`
          INSERT INTO thiet_bi_gan_voi_don (id, don_thue_id, chi_tiet_don_thue_id, thiet_bi_id, ma_tai_san_snapshot, so_serial_snapshot, ghi_chu_tinh_trang_snapshot, trang_thai, created_at, updated_at)
          VALUES (gen_random_uuid(), ${don_thue_id}::uuid, ${chi_tiet?.id || null}::uuid, ${tai_san_id}::uuid, ${thiet_bi.ma_tai_san}, ${thiet_bi.so_serial}, ${thiet_bi.ghi_chu_tinh_trang}, 'DA_GIAO', NOW(), NOW())
          RETURNING id
        `;

        // 3. INSERT chi_tiet_ban_giao
        await tx.$executeRaw`
          INSERT INTO chi_tiet_ban_giao (id, phieu_ban_giao_id, don_thue_id, thiet_bi_gan_id, so_luong_giao, ghi_chu_tinh_trang, created_at)
          VALUES (gen_random_uuid(), ${phieu_ban_giao_id}::uuid, ${don_thue_id}::uuid, ${thiet_bi_gan[0].id}::uuid, 1, ${item.tinh_trang || null}, NOW())
        `;

        // 4. INSERT lich_su_di_chuyen_thiet_bi
        await tx.$executeRaw`
          INSERT INTO lich_su_di_chuyen_thiet_bi (id, thiet_bi_id, don_thue_lien_quan_id, tu_vi_tri_id, trang_thai_truoc, trang_thai_sau, loai_di_chuyen, ghi_chu, nguoi_thuc_hien_id, created_at)
          VALUES (gen_random_uuid(), ${tai_san_id}::uuid, ${don_thue_id}::uuid, ${thiet_bi.vi_tri_hien_tai_id}::uuid, 'SAN_SANG', 'DANG_THUE', 'BAN_GIAO', ${"Bàn giao cho đơn " + don.ma_don}, ${nhan_vien_id}::uuid, NOW())
        `;

        so_luong_chi_tiet++;
      }
    }

    // 5. UPDATE don_thue → DANG_THUE
    await tx.$executeRaw`
      UPDATE don_thue
      SET trang_thai = 'DANG_THUE', updated_at = NOW()
      WHERE id = ${don_thue_id}::uuid
    `;

    // 6. UPDATE chi_tiet_don_thue → DA_GIAO
    await tx.$executeRaw`
      UPDATE chi_tiet_don_thue
      SET trang_thai = 'DA_GIAO', updated_at = NOW()
      WHERE don_thue_id = ${don_thue_id}::uuid
    `;

    // 7. UPDATE thiet_bi_vat_ly → DANG_THUE
    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET trang_thai = 'DANG_THUE', updated_at = NOW()
      WHERE id = ANY(${tat_ca_tai_san_id}::uuid[])
    `;

    // 8. INSERT tep_don_thue (ảnh bàn giao) nếu có
    if (danh_sach_anh_url && danh_sach_anh_url.length > 0) {
      for (const anh_url of danh_sach_anh_url) {
        const ten_file = typeof anh_url === "string" ? "handover-image" : anh_url.ten_file_goc || "handover-image";
        const url = typeof anh_url === "string" ? anh_url : anh_url.file_url;

        await tx.$executeRaw`
          INSERT INTO tep_don_thue (id, don_thue_id, muc_dich, ten_file_goc, file_url, uploaded_by, uploaded_at)
          VALUES (gen_random_uuid(), ${don_thue_id}::uuid, 'ANH_BAN_GIAO', ${ten_file}, ${url}, ${nhan_vien_id}::uuid, NOW())
        `;
      }
    }

    return {
      id: phieu_ban_giao_id,
      so_luong_chi_tiet,
    };
  });

  return ket_qua;
}

module.exports = {
  uploadHandoverImages,
  createHandover,
};
