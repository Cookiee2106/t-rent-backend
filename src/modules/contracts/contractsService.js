const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

// ============================================================
// UPLOAD CONTRACT (API #10)
// ============================================================
async function uploadContract(don_thue_id, nhan_vien_id, file) {
  // Kiểm tra đơn thuê tồn tại
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.trang_thai, dt.khach_hang_id
    FROM don_thue dt
    WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  // Kiểm tra trạng thái đơn
  if (don.trang_thai !== "DA_GIU_CHO" && don.trang_thai !== "DANG_THUE") {
    const error = new Error("Đơn thuê không ở trạng thái cho phép upload hợp đồng");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra file
  if (!file) {
    const error = new Error("Vui lòng upload file hợp đồng");
    error.statusCode = 400;
    throw error;
  }

  // Upload file lên Cloudinary
  const ket_qua_upload = await uploadBufferToCloudinary(file.buffer, "t-rent/contracts", "auto");

  // Kiểm tra hop_dong_giay đã tồn tại chưa
  const danh_sach_hop_dong = await prisma.$queryRaw`
    SELECT id, ma_hop_dong
    FROM hop_dong_giay
    WHERE don_thue_id = ${don_thue_id}::uuid
    LIMIT 1
  `;

  let hop_dong;

  if (danh_sach_hop_dong.length > 0) {
    // Đã có hợp đồng giấy — chỉ thêm file mới
    hop_dong = danh_sach_hop_dong[0];
  } else {
    // Tạo mã hợp đồng
    const now = new Date();
    const ngay = String(now.getDate()).padStart(2, "0");
    const thang = String(now.getMonth() + 1).padStart(2, "0");

    const ket_qua_dem = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS so_luong
      FROM hop_dong_giay
      WHERE created_at >= CURRENT_DATE
        AND created_at < CURRENT_DATE + INTERVAL '1 day'
    `;
    const so_luong_hom_nay = ket_qua_dem[0]?.so_luong || 0;

    const ma_hop_dong = `HD-${ngay}${thang}-${String(so_luong_hom_nay + 1).padStart(3, "0")}`;

    // Insert hop_dong_giay
    const ket_qua_tao = await prisma.$queryRaw`
      INSERT INTO hop_dong_giay (id, ma_hop_dong, don_thue_id, khach_hang_id, nhan_vien_id, created_at, updated_at)
      VALUES (gen_random_uuid(), ${ma_hop_dong}, ${don_thue_id}::uuid, ${don.khach_hang_id}::uuid, ${nhan_vien_id}::uuid, NOW(), NOW())
      RETURNING id, ma_hop_dong
    `;

    hop_dong = ket_qua_tao[0];
  }

  // Insert tep_hop_dong
  await prisma.$executeRaw`
    INSERT INTO tep_hop_dong (id, hop_dong_id, ten_file_goc, file_url, loai_file, kich_thuoc_file, uploaded_by, uploaded_at)
    VALUES (gen_random_uuid(), ${hop_dong.id}::uuid, ${file.originalname}, ${ket_qua_upload.secure_url}, ${file.mimetype}, ${file.size}, ${nhan_vien_id}::uuid, NOW())
  `;

  return {
    id: hop_dong.id,
    ma_hop_dong: hop_dong.ma_hop_dong,
    file_url: ket_qua_upload.secure_url,
  };
}

module.exports = {
  uploadContract,
};
