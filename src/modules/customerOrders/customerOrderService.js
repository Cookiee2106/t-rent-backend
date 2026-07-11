// Import prisma để query database bằng raw SQL.
const prisma = require("../../config/prisma");

// ================= TRẠNG THÁI ĐƠN THUÊ =================

// 1101 = Đã hủy.
const TRANG_THAI_DA_HUY = 1101;

// 1102 = Đã giữ chỗ, đơn vừa tạo sau khi thanh toán cọc thành công.
const TRANG_THAI_DA_GIU_CHO = 1102;

// 1103 = Đang thuê, nghĩa là nhân viên đã bàn giao.
const TRANG_THAI_DANG_THUE = 1103;

// 1104 = Hoàn thành, nghĩa là đã thanh lý/lập phiếu trả.
const TRANG_THAI_HOAN_THANH = 1104;

// 1105 = Quá hạn, nghĩa là đã quá ngày trả nhưng khách chưa trả.
const TRANG_THAI_QUA_HAN = 1105;

// ================= MỤC ĐÍCH FILE ĐƠN THUÊ =================

// 2601 = Hợp đồng giấy.
const MUC_DICH_HOP_DONG_GIAY = 2601;

// 2602 = Ảnh bàn giao.
const MUC_DICH_ANH_BAN_GIAO = 2602;

// 2603 = Ảnh khi trả.
const MUC_DICH_ANH_KHI_TRA = 2603;

// Hàm tự cập nhật đơn đang thuê sang quá hạn nếu đã quá ngày trả.
// Vì đồ án không dùng trigger/job DB nên xử lý ở backend.
async function capNhatDonQuaHanCuaKhach(nguoiDungId) {
  // Chỉ chuyển quá hạn nếu:
  // - đơn thuộc khách đang đăng nhập
  // - đơn đang thuê
  // - đã quá ngày trả
  // - chưa có thời điểm trả thực tế
  await prisma.$executeRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_QUA_HAN},
      updated_at = NOW()
    WHERE khach_hang_id = ${nguoiDungId}::uuid
      AND trang_thai = ${TRANG_THAI_DANG_THUE}
      AND ngay_tra < NOW()
      AND tra_luc IS NULL
  `;
}

// Hàm lấy danh sách đơn thuê của khách đang đăng nhập.
// API: GET /api/me/orders
async function layDanhSachDonCuaToiService(nguoiDungId) {
  // Trước khi lấy danh sách, kiểm tra có đơn nào quá hạn không.
  await capNhatDonQuaHanCuaKhach(nguoiDungId);

  // Lấy danh sách đơn thuê của chính khách hàng.
  const danhSach = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      ttht.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.created_at,
      dt.updated_at
    FROM don_thue dt

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    WHERE dt.khach_hang_id = ${nguoiDungId}::uuid

    ORDER BY dt.created_at DESC
  `;

  // Trả danh sách đơn.
  return danhSach;
}

// Hàm lấy một đơn thuê và kiểm tra đơn đó có thuộc khách đang đăng nhập không.
async function layDonThuocKhachHang(donThueId, nguoiDungId) {
  // Query theo cả id đơn và khach_hang_id để không xem được đơn của người khác.
  const danhSachDon = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      dt.phien_thanh_toan_id,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      ttht.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,

      dt.ban_giao_luc,
      dt.nguoi_ban_giao_id,
      nv_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,

      dt.tra_luc,
      dt.nguoi_nhan_tra_id,
      nv_tra.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,

      dt.phi_phat_sinh_ly_do,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,

      dt.created_at,
      dt.updated_at
    FROM don_thue dt

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    LEFT JOIN nguoi_dung nv_bg
      ON nv_bg.id = dt.nguoi_ban_giao_id

    LEFT JOIN nguoi_dung nv_tra
      ON nv_tra.id = dt.nguoi_nhan_tra_id

    WHERE dt.id = ${donThueId}::uuid
      AND dt.khach_hang_id = ${nguoiDungId}::uuid

    LIMIT 1
  `;

  // Nếu không tìm thấy thì báo lỗi.
  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  // Trả về đơn thuê.
  return danhSachDon[0];
}

// Hàm lấy file/hình ảnh của đơn thuê theo trạng thái đơn.
// Chỉ lấy từ tep_don_thue, không lấy ảnh mẫu thiết bị.
async function layTepDonThueTheoTrangThai(donThueId, trangThaiDon) {
  // Nếu đơn đang giữ chỗ hoặc đã hủy trước khi bàn giao thì chưa hiển thị file.
  if (
    trangThaiDon === TRANG_THAI_DA_GIU_CHO ||
    trangThaiDon === TRANG_THAI_DA_HUY
  ) {
    return [];
  }

  // Nếu đơn đang thuê hoặc quá hạn:
  // nghĩa là đã bàn giao, nên có thể xem hợp đồng giấy và ảnh bàn giao.
  if (
    trangThaiDon === TRANG_THAI_DANG_THUE ||
    trangThaiDon === TRANG_THAI_QUA_HAN
  ) {
    const danhSachTep = await prisma.$queryRaw`
      SELECT
        tdt.id,
        tdt.muc_dich_id,
        dmht.ma_danh_muc AS ma_muc_dich,
        dmht.ten_danh_muc AS ten_muc_dich,
        tdt.ten_file_goc,
        tdt.file_url,
        tdt.loai_file,
        tdt.kich_thuoc_file::text AS kich_thuoc_file,
        tdt.uploaded_at,
        nd.ho_ten AS nguoi_upload
      FROM tep_don_thue tdt

      LEFT JOIN danh_muc_he_thong dmht
        ON dmht.id = tdt.muc_dich_id

      LEFT JOIN nguoi_dung nd
        ON nd.id = tdt.uploaded_by

      WHERE tdt.don_thue_id = ${donThueId}::uuid
        AND tdt.muc_dich_id IN (${MUC_DICH_HOP_DONG_GIAY}, ${MUC_DICH_ANH_BAN_GIAO})

      ORDER BY tdt.muc_dich_id ASC, tdt.uploaded_at ASC
    `;

    return danhSachTep;
  }

  // Nếu đơn hoàn thành:
  // nghĩa là đã thanh lý, nên có thể xem hợp đồng, ảnh bàn giao và ảnh khi trả.
  if (trangThaiDon === TRANG_THAI_HOAN_THANH) {
    const danhSachTep = await prisma.$queryRaw`
      SELECT
        tdt.id,
        tdt.muc_dich_id,
        dmht.ma_danh_muc AS ma_muc_dich,
        dmht.ten_danh_muc AS ten_muc_dich,
        tdt.ten_file_goc,
        tdt.file_url,
        tdt.loai_file,
        tdt.kich_thuoc_file::text AS kich_thuoc_file,
        tdt.uploaded_at,
        nd.ho_ten AS nguoi_upload
      FROM tep_don_thue tdt

      LEFT JOIN danh_muc_he_thong dmht
        ON dmht.id = tdt.muc_dich_id

      LEFT JOIN nguoi_dung nd
        ON nd.id = tdt.uploaded_by

      WHERE tdt.don_thue_id = ${donThueId}::uuid
        AND tdt.muc_dich_id IN (
          ${MUC_DICH_HOP_DONG_GIAY},
          ${MUC_DICH_ANH_BAN_GIAO},
          ${MUC_DICH_ANH_KHI_TRA}
        )

      ORDER BY tdt.muc_dich_id ASC, tdt.uploaded_at ASC
    `;

    return danhSachTep;
  }

  // Nếu trạng thái khác thì không trả file.
  return [];
}

// Hàm lấy chi tiết đơn thuê.
// API này trả toàn bộ dữ liệu để FE mở popup chi tiết.
async function layChiTietDonCuaToiService(nguoiDungId, donThueId) {
  // Trước khi xem chi tiết, cập nhật đơn quá hạn nếu có.
  await capNhatDonQuaHanCuaKhach(nguoiDungId);

  // Lấy thông tin chính của đơn và kiểm tra quyền sở hữu.
  const donThue = await layDonThuocKhachHang(donThueId, nguoiDungId);

  // Lấy danh sách mẫu thiết bị trong đơn.
  // Không lấy mtb.anh_url vì chi tiết đơn không hiển thị ảnh mẫu thiết bị.
  const chiTietDon = await prisma.$queryRaw`
    SELECT
      ctdt.id,
      ctdt.mau_thiet_bi_id,
      mtb.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc,
      ctdt.created_at,
      ctdt.updated_at
    FROM chi_tiet_don_thue ctdt

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE ctdt.don_thue_id = ${donThueId}::uuid

    ORDER BY ctdt.created_at ASC
  `;

  // Lấy các dòng thanh toán của đơn.
  const thanhToan = await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dmht.ma_danh_muc AS ma_loai_dong_tien,
      dmht.ten_danh_muc AS ten_loai_dong_tien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at
    FROM thanh_toan tt

    LEFT JOIN danh_muc_he_thong dmht
      ON dmht.id = tt.loai_dong_tien_id

    WHERE tt.don_thue_id = ${donThueId}::uuid

    ORDER BY tt.created_at ASC
  `;

  // Lấy file/hình ảnh của đơn thuê theo trạng thái đơn.
  const tepDonThue = await layTepDonThueTheoTrangThai(
    donThueId,
    donThue.trang_thai
  );

//   // Lấy vật phẩm đã bàn giao nếu có.
//   // DB mới dùng ban_giao_vat_pham, không dùng thiet_bi_gan_voi_don/phu_kien_gan_voi_don.
//   const vatPhamBanGiao = await prisma.$queryRaw`
//     SELECT
//       bgvp.id,
//       bgvp.chi_tiet_don_thue_id,
//       bgvp.bo_di_kem_id,
//       bgvp.thiet_bi_id,
//       bgvp.phu_kien_id,
//       bgvp.ten_vat_pham_snapshot,
//       bgvp.ma_tai_san_snapshot,
//       bgvp.so_serial_snapshot,
//       bgvp.so_luong_giao,
//       bgvp.tinh_trang_truoc,
//       bgvp.ghi_chu_ban_giao,
//       bgvp.created_at
//     FROM ban_giao_vat_pham bgvp

//     JOIN chi_tiet_don_thue ctdt
//       ON ctdt.id = bgvp.chi_tiet_don_thue_id

//     WHERE ctdt.don_thue_id = ${donThueId}::uuid

//     ORDER BY bgvp.created_at ASC
//   `;

  // Trả dữ liệu cho popup chi tiết.
  return {
    don_thue: donThue,
    chi_tiet_don: chiTietDon,
    thanh_toan: thanhToan,
    tep_don_thue: tepDonThue,
    // vat_pham_ban_giao: vatPhamBanGiao,
  };
}

// Hàm hủy đơn thuê của khách.
// Chỉ cho hủy khi đơn còn ở trạng thái 1102 - Đã giữ chỗ.
async function huyDonCuaToiService(nguoiDungId, donThueId, body) {
  // Lấy lý do hủy từ body.
  const lyDoHuy = body.ly_do_huy;

  // Kiểm tra lý do hủy không được rỗng.
  if (!lyDoHuy || lyDoHuy.trim() === "") {
    throw new Error("Vui lòng nhập lý do hủy đơn");
  }

  // Trước khi hủy, cập nhật đơn quá hạn nếu có.
  await capNhatDonQuaHanCuaKhach(nguoiDungId);

  // Lấy đơn và kiểm tra đơn thuộc khách đang đăng nhập.
  const donThue = await layDonThuocKhachHang(donThueId, nguoiDungId);

  // Nếu đơn đã hủy rồi thì không cho hủy lại.
  if (donThue.trang_thai === TRANG_THAI_DA_HUY) {
    throw new Error("Đơn thuê này đã bị hủy trước đó");
  }

  // Nếu đơn đã bàn giao thì không cho hủy.
  if (donThue.trang_thai === TRANG_THAI_DANG_THUE) {
    throw new Error("Đơn đã bàn giao, không thể hủy");
  }

  // Nếu đơn đã hoàn thành thì không cho hủy.
  if (donThue.trang_thai === TRANG_THAI_HOAN_THANH) {
    throw new Error("Đơn đã hoàn thành, không thể hủy");
  }

  // Nếu đơn đã quá hạn thì không cho hủy.
  if (donThue.trang_thai === TRANG_THAI_QUA_HAN) {
    throw new Error("Đơn đã quá hạn, không thể hủy");
  }

  // Chỉ cho hủy nếu đơn đang là đã giữ chỗ.
  if (donThue.trang_thai !== TRANG_THAI_DA_GIU_CHO) {
    throw new Error("Chỉ được hủy đơn khi đơn còn ở trạng thái đã giữ chỗ");
  }

  // Cập nhật đơn sang trạng thái đã hủy.
  const ketQua = await prisma.$queryRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_DA_HUY},
      huy_luc = NOW(),
      ly_do_huy = ${lyDoHuy.trim()},
      updated_at = NOW()
    WHERE id = ${donThueId}::uuid
      AND khach_hang_id = ${nguoiDungId}::uuid
    RETURNING
      id,
      ma_don,
      trang_thai,
      huy_luc,
      ly_do_huy,
      updated_at
  `;

  // Trả kết quả sau khi hủy.
  return ketQua[0];
}

// Export service để controller dùng.
module.exports = {
  layDanhSachDonCuaToiService,
  layChiTietDonCuaToiService,
  huyDonCuaToiService,
};