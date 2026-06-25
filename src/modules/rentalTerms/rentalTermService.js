const prisma = require("../../utils/prisma");
const crypto = require("crypto");

// ============================================================
// Helper: Lấy profile theo userId (nội bộ)
// ============================================================
async function getCustomerProfile(nguoi_dung_id) {
  const ho_so = await prisma.$queryRaw`
    SELECT id, nguoi_dung_id, trang_thai_xac_minh
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
// GET CURRENT TERMS
// Lấy điều khoản thuê hiện hành
// ============================================================
async function getCurrentTerms() {
  const danh_sach_dieu_khoan = await prisma.$queryRaw`
    SELECT
      id,
      phien_ban,
      noi_dung,
      ma_bam_noi_dung,
      trang_thai,
      created_at
    FROM dieu_khoan_thue
    WHERE trang_thai = 'HOAT_DONG'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!danh_sach_dieu_khoan || danh_sach_dieu_khoan.length === 0) {
    const error = new Error("Không tìm thấy điều khoản thuê hiện hành");
    error.statusCode = 404;
    throw error;
  }

  const dieu_khoan = danh_sach_dieu_khoan[0];

  return {
    id: dieu_khoan.id,
    phien_ban: dieu_khoan.phien_ban,
    noi_dung: dieu_khoan.noi_dung,
    ma_bam_noi_dung: dieu_khoan.ma_bam_noi_dung,
    trang_thai: dieu_khoan.trang_thai,
    created_at: dieu_khoan.created_at,
  };
}

// ============================================================
// ACCEPT TERMS
// Chấp nhận điều khoản thuê
// ============================================================
async function acceptTerms(nguoi_dung_id, dieu_khoan_id, phien_ban, ip_address, user_agent) {
  // Lấy điều khoản
  const danh_sach_dieu_khoan = await prisma.$queryRaw`
    SELECT id, phien_ban, noi_dung, trang_thai, ma_bam_noi_dung
    FROM dieu_khoan_thue
    WHERE id = ${dieu_khoan_id}
      AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_dieu_khoan || danh_sach_dieu_khoan.length === 0) {
    const error = new Error("Điều khoản không tồn tại hoặc đã bị vô hiệu hóa");
    error.statusCode = 404;
    throw error;
  }

  const dieu_khoan = danh_sach_dieu_khoan[0];

  // Kiểm tra phiên bản (chuẩn hóa String để so sánh)
  if (String(dieu_khoan.phien_ban) !== String(phien_ban)) {
    const error = new Error("Phiên bản điều khoản không đúng");
    error.statusCode = 400;
    throw error;
  }

  // Lấy profile và kiểm tra trạng thái xác minh
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  if (ho_so.trang_thai_xac_minh !== "DA_DUYET") {
    const error = new Error("Tài khoản chưa được xác minh, không thể chấp nhận điều khoản thuê");
    error.statusCode = 400;
    throw error;
  }

  // Tính hash của nội dung
  const ma_bam = crypto
    .createHash("sha256")
    .update(dieu_khoan.noi_dung)
    .digest("hex");

  // Kiểm tra hash nội dung với DB
  if (dieu_khoan.ma_bam_noi_dung && dieu_khoan.ma_bam_noi_dung !== ma_bam) {
    const error = new Error("Dữ liệu điều khoản không hợp lệ");
    error.statusCode = 500;
    throw error;
  }

  // Tạo xác nhận điều khoản (LUÔN TẠO MỚI - không reuse term_acceptance cũ)
  // Lưu ip_address và user_agent để audit
  const xac_nhan_ket_qua = await prisma.$queryRaw`
    INSERT INTO xac_nhan_dieu_khoan (
      khach_hang_id,
      dieu_khoan_id,
      dong_y_luc,
      ma_bam_noi_dung_snapshot,
      ip_address,
      user_agent
    )
    VALUES (
      ${ho_so.id},
      ${dieu_khoan_id},
      NOW(),
      ${ma_bam},
      ${ip_address || null},
      ${user_agent || null}
    )
    RETURNING id, dong_y_luc
  `;

  return {
    xac_nhan_dieu_khoan_id: xac_nhan_ket_qua[0].id,
    dieu_khoan_id: dieu_khoan_id,
    khach_hang_id: ho_so.id,
    phien_ban: dieu_khoan.phien_ban,
    ma_bam_noi_dung_snapshot: ma_bam,
    dong_y_luc: xac_nhan_ket_qua[0].dong_y_luc,
  };
}

module.exports = {
  getCurrentTerms,
  acceptTerms,
};
