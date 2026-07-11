// Import prisma để query PostgreSQL bằng raw SQL.
const prisma = require("../../config/prisma");

// Import cấu hình Cloudinary.
const cloudinaryConfig = require("../../config/cloudinary");

// Lấy object cloudinary.
// Dòng này hỗ trợ cả kiểu export trực tiếp và export { cloudinary }.
const cloudinary = cloudinaryConfig.uploader
  ? cloudinaryConfig
  : cloudinaryConfig.cloudinary;

// ================= TRẠNG THÁI ĐƠN THUÊ =================

// 1103 = Đang thuê.
const TRANG_THAI_DANG_THUE = 1103;

// 1104 = Hoàn thành.
const TRANG_THAI_HOAN_THANH = 1104;

// 1105 = Quá hạn.
const TRANG_THAI_QUA_HAN = 1105;

// ================= TRẠNG THÁI THIẾT BỊ =================

// 501 = Sẵn sàng.
const THIET_BI_SAN_SANG = 501;

// ================= LOẠI DÒNG TIỀN =================

// 2301 = Tiền cọc khách đã thanh toán online.
const LOAI_TIEN_COC = 2301;

// 2303 = Hoàn cọc.
const LOAI_HOAN_COC = 2303;

// 2304 = Khấu trừ cọc.
const LOAI_KHAU_TRU_COC = 2304;

// 2305 = Phụ thu.
const LOAI_PHU_THU = 2305;

// ================= MỤC ĐÍCH FILE ĐƠN THUÊ =================

// 2601 = Hợp đồng giấy.
const MUC_DICH_HOP_DONG_GIAY = 2601;

// 2602 = Ảnh bàn giao.
const MUC_DICH_ANH_BAN_GIAO = 2602;

// 2603 = Ảnh khi trả.
const MUC_DICH_ANH_KHI_TRA = 2603;

// Tự cập nhật đơn đang thuê thành quá hạn nếu đã quá ngày trả.
async function capNhatDonQuaHanNoiBo() {
  await prisma.$executeRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_QUA_HAN},
      updated_at = NOW()
    WHERE trang_thai = ${TRANG_THAI_DANG_THUE}
      AND ngay_tra < NOW()
      AND tra_luc IS NULL
  `;
}

// Upload ảnh khi trả lên Cloudinary.
async function uploadAnhKhiTra(file) {
  // Cloudinary upload_stream dùng callback, nên bọc bằng Promise.
  return new Promise((resolve, reject) => {
    // Tạo stream upload ảnh.
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "t-rent/orders/returns",
        resource_type: "image",
      },
      (loi, ketQua) => {
        // Nếu upload lỗi thì reject.
        if (loi) {
          reject(loi);
          return;
        }

        // Nếu upload thành công thì resolve kết quả.
        resolve(ketQua);
      }
    );

    // Đẩy file buffer từ multer vào stream.
    stream.end(file.buffer);
  });
}

// Lấy tiền cọc đã thanh toán online của đúng đơn.
async function layTienCocDaThanhToan(tx, donThueId) {
  // Chỉ lấy tiền cọc của đúng don_thue_id và đúng loại 2301.
  const ketQua = await tx.$queryRaw`
    SELECT COALESCE(SUM(so_tien), 0)::text AS tong_tien_coc
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id = ${LOAI_TIEN_COC}
  `;

  // Trả số tiền cọc dạng number.
  return Number(ketQua[0].tong_tien_coc || 0);
}

// Kiểm tra đơn đã có dòng tiền thanh lý chưa.
async function kiemTraDaCoThanhLy(tx, donThueId) {
  // Nếu đã có hoàn cọc/khấu trừ/phụ thu thì không cho thanh lý lại.
  const ketQua = await tx.$queryRaw`
    SELECT COUNT(*)::int AS so_dong
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id IN (
        ${LOAI_HOAN_COC},
        ${LOAI_KHAU_TRU_COC},
        ${LOAI_PHU_THU}
      )
  `;

  // true nghĩa là đã có dòng tiền thanh lý.
  return Number(ketQua[0].so_dong || 0) > 0;
}

// Ghi một dòng tiền vào bảng thanh_toan.
async function taoDongTien(tx, donThue, nguoiDungId, soTien, loaiDongTienId, ghiChu) {
  // Nếu số tiền <= 0 thì không cần insert.
  if (soTien <= 0) {
    return;
  }

  // Insert dòng tiền hoàn cọc/khấu trừ/phụ thu.
  await tx.$executeRaw`
    INSERT INTO thanh_toan (
      don_thue_id,
      phien_thanh_toan_id,
      so_tien,
      loai_dong_tien_id,
      nguoi_thuc_hien_id,
      ghi_chu
    )
    VALUES (
      ${donThue.id}::uuid,
      ${donThue.phien_thanh_toan_id}::uuid,
      ${soTien},
      ${loaiDongTienId},
      ${nguoiDungId}::uuid,
      ${ghiChu}
    )
  `;
}

// Tạo object vật phẩm bàn giao.
// Giữ đúng tên cột trong DB: ten_vat_pham_snapshot, so_serial_snapshot...
function taoVatPhamBanGiao(dong) {
  return {
    ten_vat_pham_snapshot: dong.ten_vat_pham_snapshot,
    ma_tai_san_snapshot: dong.ma_tai_san_snapshot,
    so_serial_snapshot: dong.so_serial_snapshot,
    so_luong_giao: Number(dong.so_luong_giao || 1),
    tinh_trang_truoc: dong.tinh_trang_truoc,
    ghi_chu_ban_giao: dong.ghi_chu_ban_giao,
  };
}

// Gom dữ liệu bàn giao theo mẫu thiết bị.
// Cách mặc định:
// - 1 mẫu thiết bị = 1 object.
// - Nếu Canon thuê số lượng 2 thì vẫn trả 1 object Canon.
// - thiet_bi_chinh là mảng, có thể có 2 thiết bị chính.
// - bo_di_kem là mảng bộ đi kèm của mẫu đó.
function gomSanPhamKemSerial(danhSachBanGiao) {
  // Map dùng để gom theo chi_tiet_don_thue_id.
  const mapMau = new Map();

  // Duyệt từng dòng bàn giao.
  for (const dong of danhSachBanGiao) {
    // Mỗi chi_tiet_don_thue_id là một mẫu thiết bị trong đơn.
    const key = dong.chi_tiet_don_thue_id;

    // Nếu chưa có mẫu này thì tạo mới.
    if (!mapMau.has(key)) {
      mapMau.set(key, {
        chi_tiet_don_thue_id: dong.chi_tiet_don_thue_id,
        ten_hang: dong.ten_hang,
        ten_mau: dong.ten_mau,
        ten_danh_muc: dong.ten_danh_muc,
        so_luong_dat: Number(dong.so_luong_dat || 1),
        thiet_bi_chinh: [],
        bo_di_kem: [],
      });
    }

    // Lấy mẫu hiện tại trong map.
    const mau = mapMau.get(key);

    // Thiết bị chính là dòng có thiet_bi_id và không có bo_di_kem_id.
    const laThietBiChinh = dong.thiet_bi_id && !dong.bo_di_kem_id;

    // Nếu là thiết bị chính thì thêm vào mảng thiet_bi_chinh.
    if (laThietBiChinh) {
      mau.thiet_bi_chinh.push(taoVatPhamBanGiao(dong));
    } else {
      // Còn lại là bộ đi kèm.
      mau.bo_di_kem.push(taoVatPhamBanGiao(dong));
    }
  }

  // Trả về mảng mẫu thiết bị đã gom.
  return Array.from(mapMau.values());
}

// Hàm phụ: tách từng thiết bị chính thành từng object riêng.
// Hiện tại KHÔNG dùng mặc định.
// Khi thầy yêu cầu:
// Canon EOS R6 Mark II thuê số lượng 2
// thì API trả:
// - Canon EOS R6 Mark II #1
// - Canon EOS R6 Mark II #2
//
// Muốn dùng thì đổi dòng gọi hàm trong layChiTietThanhLyService.
function gomSanPhamKemSerialTachTungThietBi(danhSachBanGiao) {
  // Map dùng để gom dữ liệu thô theo chi_tiet_don_thue_id.
  const mapMau = new Map();

  // Duyệt từng dòng bàn giao.
  for (const dong of danhSachBanGiao) {
    // Mỗi chi_tiet_don_thue_id là một mẫu thiết bị trong đơn.
    const key = dong.chi_tiet_don_thue_id;

    // Nếu mẫu chưa tồn tại thì tạo mới.
    if (!mapMau.has(key)) {
      mapMau.set(key, {
        chi_tiet_don_thue_id: dong.chi_tiet_don_thue_id,
        ten_hang: dong.ten_hang,
        ten_mau: dong.ten_mau,
        ten_danh_muc: dong.ten_danh_muc,
        so_luong_dat: Number(dong.so_luong_dat || 1),
        thiet_bi_chinh: [],
        bo_di_kem: [],
      });
    }

    // Lấy mẫu hiện tại.
    const mau = mapMau.get(key);

    // Thiết bị chính là dòng có thiet_bi_id và không có bo_di_kem_id.
    const laThietBiChinh = dong.thiet_bi_id && !dong.bo_di_kem_id;

    // Nếu là thiết bị chính thì lưu vào thiet_bi_chinh.
    if (laThietBiChinh) {
      mau.thiet_bi_chinh.push(dong);
    } else {
      // Còn lại là bộ đi kèm.
      mau.bo_di_kem.push(dong);
    }
  }

  // Mảng kết quả sau khi tách.
  const ketQua = [];

  // Duyệt từng mẫu thiết bị.
  for (const mau of mapMau.values()) {
    // Số bảng/card cần tạo.
    // Nếu có 2 thiết bị chính thì tạo 2 bảng/card.
    const soBang = Math.max(mau.thiet_bi_chinh.length, mau.so_luong_dat);

    // Gom bộ đi kèm theo từng loại.
    const mapBoDiKem = new Map();

    // Duyệt các dòng bộ đi kèm.
    for (const dong of mau.bo_di_kem) {
      // Ưu tiên gom theo bo_di_kem_id.
      // Nếu không có thì gom theo phu_kien_id.
      // Nếu vẫn không có thì gom theo tên snapshot.
      const key =
        dong.bo_di_kem_id ||
        dong.phu_kien_id ||
        dong.ten_vat_pham_snapshot;

      // Nếu chưa có nhóm này thì tạo mảng.
      if (!mapBoDiKem.has(key)) {
        mapBoDiKem.set(key, []);
      }

      // Thêm dòng bộ đi kèm vào nhóm.
      mapBoDiKem.get(key).push(dong);
    }

    // Tạo từng bảng/card.
    for (let i = 0; i < soBang; i++) {
      // Lấy thiết bị chính theo vị trí.
      const thietBiChinhDong = mau.thiet_bi_chinh[i];

      // Mảng bộ đi kèm của bảng/card hiện tại.
      const boDiKemCuaBang = [];

      // Duyệt từng nhóm bộ đi kèm.
      for (const nhomBoDiKem of mapBoDiKem.values()) {
        // Kiểm tra nhóm này có serial hoặc mã tài sản không.
        const coSerial = nhomBoDiKem.some(
          (item) => item.so_serial_snapshot || item.ma_tai_san_snapshot
        );

        // Nếu có serial/mã tài sản thì lấy theo đúng vị trí bảng.
        // Ví dụ lens #1 vào Canon #1, lens #2 vào Canon #2.
        if (coSerial) {
          const dongTheoBang = nhomBoDiKem[i];

          // Nếu có item cho bảng này thì thêm vào.
          if (dongTheoBang) {
            boDiKemCuaBang.push(taoVatPhamBanGiao(dongTheoBang));
          }
        } else {
          // Nếu không có serial thì là phụ kiện số lượng.
          // Ví dụ 2 túi cho 2 Canon thì mỗi bảng hiện 1 túi.
          const dongDaiDien = nhomBoDiKem[0];

          // Tính tổng số lượng của phụ kiện này.
          const tongSoLuong = nhomBoDiKem.reduce((tong, item) => {
            return tong + Number(item.so_luong_giao || 0);
          }, 0);

          // Chia số lượng phụ kiện cho từng bảng.
          const soLuongMoiBang =
            tongSoLuong >= soBang
              ? Math.ceil(tongSoLuong / soBang)
              : tongSoLuong;

          // Tạo object phụ kiện.
          const vatPham = taoVatPhamBanGiao(dongDaiDien);

          // Gán lại số lượng đã chia.
          vatPham.so_luong_giao = soLuongMoiBang;

          // Thêm phụ kiện vào bảng/card hiện tại.
          boDiKemCuaBang.push(vatPham);
        }
      }

      // Thêm một object đã tách vào kết quả.
      ketQua.push({
        chi_tiet_don_thue_id: mau.chi_tiet_don_thue_id,
        ten_hang: mau.ten_hang,
        ten_mau: mau.ten_mau,
        ten_danh_muc: mau.ten_danh_muc,

        // Sau khi tách thì mỗi object đại diện cho 1 thiết bị chính.
        so_luong_dat: 1,

        // FE có thể dùng dòng này làm tiêu đề bảng/card.
        ten_hien_thi: `${mau.ten_mau} #${i + 1}`,

        // Sau khi tách thì thiet_bi_chinh vẫn để dạng mảng cho FE ít phải sửa.
        thiet_bi_chinh: thietBiChinhDong
          ? [taoVatPhamBanGiao(thietBiChinhDong)]
          : [],

        // Bộ đi kèm tương ứng với thiết bị chính này.
        bo_di_kem: boDiKemCuaBang,
      });
    }
  }

  // Trả kết quả đã tách.
  return ketQua;
}

// Lấy danh sách đơn thanh lý.
async function layDanhSachThanhLyService() {
  // Cập nhật đơn quá hạn trước khi lấy danh sách.
  await capNhatDonQuaHanNoiBo();

  // Lấy danh sách đơn đang thuê, quá hạn và hoàn thành.
  const danhSach = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      ttht.ten_trang_thai,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
      dt.created_at,

      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan

    FROM don_thue dt

    JOIN nguoi_dung kh
      ON kh.id = dt.khach_hang_id

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    WHERE dt.trang_thai IN (
      ${TRANG_THAI_DANG_THUE},
      ${TRANG_THAI_QUA_HAN},
      ${TRANG_THAI_HOAN_THANH}
    )

    ORDER BY dt.created_at DESC
  `;

  // Trả danh sách cho controller.
  return danhSach;
}

// Lấy chi tiết đơn thanh lý.
async function layChiTietThanhLyService(donThueId) {
  // Cập nhật quá hạn trước khi xem chi tiết.
  await capNhatDonQuaHanNoiBo();

  // Lấy thông tin đơn, khách hàng, bàn giao, thanh lý và các tổng tiền.
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

      dt.ban_giao_luc,
      nv_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,

      dt.tra_luc,
      nv_tra.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,

      dt.phi_phat_sinh_ly_do,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,

      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,
      kh.dia_chi AS dia_chi_khach_hang,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_HOAN_COC}
      ) AS tien_da_hoan_coc,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_KHAU_TRU_COC}
      ) AS tien_da_khau_tru,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_PHU_THU}
      ) AS tien_da_phu_thu

    FROM don_thue dt

    JOIN nguoi_dung kh
      ON kh.id = dt.khach_hang_id

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    LEFT JOIN nguoi_dung nv_bg
      ON nv_bg.id = dt.nguoi_ban_giao_id

    LEFT JOIN nguoi_dung nv_tra
      ON nv_tra.id = dt.nguoi_nhan_tra_id

    WHERE dt.id = ${donThueId}::uuid

    LIMIT 1
  `;

  // Nếu không tìm thấy đơn thì báo lỗi.
  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  // Lấy đơn đầu tiên.
  const donThue = danhSachDon[0];

  // Chỉ đơn đã bàn giao mới được xem ở chức năng thanh lý.
  if (
    donThue.trang_thai !== TRANG_THAI_DANG_THUE &&
    donThue.trang_thai !== TRANG_THAI_QUA_HAN &&
    donThue.trang_thai !== TRANG_THAI_HOAN_THANH
  ) {
    throw new Error("Đơn này chưa bàn giao nên chưa thể thanh lý");
  }

  // Lấy chi tiết mẫu thiết bị trong đơn.
  const chiTietDon = await prisma.$queryRaw`
    SELECT
      ctdt.id,
      mtb.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc
    FROM chi_tiet_don_thue ctdt

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE ctdt.don_thue_id = ${donThueId}::uuid

    ORDER BY ctdt.created_at ASC
  `;

  // Lấy vật phẩm đã bàn giao theo đúng tên cột DB.
  const danhSachBanGiao = await prisma.$queryRaw`
    SELECT
      ctdt.id AS chi_tiet_don_thue_id,
      ctdt.so_luong AS so_luong_dat,

      mtb.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,

      bgvp.bo_di_kem_id,
      bgvp.thiet_bi_id,
      bgvp.phu_kien_id,
      bgvp.ten_vat_pham_snapshot,
      bgvp.ma_tai_san_snapshot,
      bgvp.so_serial_snapshot,
      bgvp.so_luong_giao,
      bgvp.tinh_trang_truoc,
      bgvp.ghi_chu_ban_giao,
      bgvp.created_at
    FROM ban_giao_vat_pham bgvp

    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE ctdt.don_thue_id = ${donThueId}::uuid

    ORDER BY
      mtb.ten_mau ASC,
      bgvp.created_at ASC
  `;

  // ================= CÁCH GOM MẶC ĐỊNH =================
  // Mặc định: 1 mẫu thiết bị = 1 object.
  // Ví dụ Canon thuê số lượng 2 thì Canon vẫn là 1 object,
  // bên trong thiet_bi_chinh có 2 dòng.
  const sanPhamKemSerial = gomSanPhamKemSerial(danhSachBanGiao);

  // ================= CÁCH GOM PHỤ KHI THẦY YÊU CẦU =================
  // Nếu thầy yêu cầu tách từng thiết bị chính thành từng bảng/card riêng,
  // thì comment dòng mặc định ở trên lại và mở dòng dưới ra.
  //
  // Ví dụ:
  // Canon EOS R6 Mark II #1
  // Canon EOS R6 Mark II #2
  // Sony A7 IV #1
  //
  // const sanPhamKemSerial = gomSanPhamKemSerialTachTungThietBi(danhSachBanGiao);

  // Lấy file/ảnh của đơn thuê:
  // 2601 = Hợp đồng giấy.
  // 2602 = Ảnh bàn giao.
  // 2603 = Ảnh khi trả.
  const tepDonThue = await prisma.$queryRaw`
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

  // Lấy toàn bộ dòng tiền của đúng đơn.
  const thanhToan = await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dmht.ma_danh_muc AS ma_loai_dong_tien,
      dmht.ten_danh_muc AS ten_loai_dong_tien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at,
      nd.ho_ten AS nguoi_thuc_hien
    FROM thanh_toan tt

    LEFT JOIN danh_muc_he_thong dmht
      ON dmht.id = tt.loai_dong_tien_id

    LEFT JOIN nguoi_dung nd
      ON nd.id = tt.nguoi_thuc_hien_id

    WHERE tt.don_thue_id = ${donThueId}::uuid

    ORDER BY tt.created_at ASC
  `;

  // Trả dữ liệu chi tiết cho FE.
  return {
    don_thue: donThue,
    chi_tiet_don: chiTietDon,
    san_pham_kem_serial: sanPhamKemSerial,
    tep_don_thue: tepDonThue,
    thanh_toan: thanhToan,
  };
}

// Lập phiếu trả / thanh lý đơn.
async function lapPhieuTraService(nguoiDungId, donThueId, body, files) {
  // Cập nhật quá hạn trước khi xử lý.
  await capNhatDonQuaHanNoiBo();

  // Lấy đơn cần thanh lý.
  const danhSachDon = await prisma.$queryRaw`
    SELECT
      id,
      ma_don,
      phien_thanh_toan_id,
      trang_thai
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  // Nếu không có đơn thì báo lỗi.
  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  // Lấy đơn đầu tiên.
  const donThue = danhSachDon[0];

  // Nếu đơn đã hoàn thành thì không cho thanh lý lại.
  if (donThue.trang_thai === TRANG_THAI_HOAN_THANH) {
    throw new Error("Đơn thuê đã thanh lý trước đó");
  }

  // Chỉ đơn đang thuê hoặc quá hạn mới được thanh lý.
  if (
    donThue.trang_thai !== TRANG_THAI_DANG_THUE &&
    donThue.trang_thai !== TRANG_THAI_QUA_HAN
  ) {
    throw new Error("Chỉ được thanh lý đơn đang thuê hoặc quá hạn");
  }

  // Bắt buộc upload ít nhất 1 ảnh khi trả.
  if (!files || files.length === 0) {
    throw new Error("Vui lòng upload ít nhất 1 ảnh khi trả");
  }

  // Lấy hình thức xử lý cọc từ body.
  const hinhThuc = body.hinh_thuc_xu_ly_coc;

  // Lấy số tiền nhập từ body.
  const soTienNhap = Number(body.so_tien || 0);

  // Lấy lý do phát sinh nếu có.
  const lyDoPhatSinh = body.phi_phat_sinh_ly_do
    ? body.phi_phat_sinh_ly_do.trim()
    : null;

  // Lấy ghi chú thanh lý.
  const ghiChuThanhLy = body.ghi_chu_thanh_ly
    ? body.ghi_chu_thanh_ly.trim()
    : "";

  // Ghi chú thanh lý bắt buộc nhập.
  if (!ghiChuThanhLy) {
    throw new Error("Vui lòng nhập ghi chú thanh lý");
  }

  // Hình thức xử lý cọc phải hợp lệ.
  if (
    hinhThuc !== "HOAN_COC" &&
    hinhThuc !== "KHAU_TRU_COC" &&
    hinhThuc !== "PHU_THU"
  ) {
    throw new Error("Vui lòng chọn hình thức xử lý cọc");
  }

  // Nếu là khấu trừ hoặc phụ thu thì bắt buộc nhập số tiền và lý do.
  if (hinhThuc !== "HOAN_COC") {
    if (soTienNhap <= 0) {
      throw new Error("Vui lòng nhập số tiền khấu trừ/phụ thu");
    }

    if (!lyDoPhatSinh) {
      throw new Error("Vui lòng nhập lý do phát sinh");
    }
  }

  // Mảng lưu ảnh sau khi upload Cloudinary.
  const danhSachAnh = [];

  // Upload từng ảnh khi trả.
  for (const file of files) {
    // Upload ảnh lên Cloudinary.
    const upload = await uploadAnhKhiTra(file);

    // Lưu thông tin ảnh đã upload.
    danhSachAnh.push({
      ten_file_goc: file.originalname,
      file_url: upload.secure_url,
      loai_file: file.mimetype,
      kich_thuoc_file: file.size || null,
    });
  }

  // Dùng transaction để đảm bảo dữ liệu đồng bộ.
  const ketQua = await prisma.$transaction(async (tx) => {
    // Lấy tiền cọc thật đã thanh toán của đúng đơn.
    const tienCocDaThanhToan = await layTienCocDaThanhToan(tx, donThueId);

    // Nếu không có tiền cọc thì không thể thanh lý.
    if (tienCocDaThanhToan <= 0) {
      throw new Error("Đơn này chưa có tiền cọc đã thanh toán");
    }

    // Kiểm tra đơn đã có dòng tiền thanh lý chưa.
    const daThanhLy = await kiemTraDaCoThanhLy(tx, donThueId);

    // Nếu đã thanh lý rồi thì không cho thanh lý lại.
    if (daThanhLy) {
      throw new Error("Đơn này đã có dòng tiền thanh lý");
    }

    // Khởi tạo tiền hoàn cọc.
    let tienHoanCoc = 0;

    // Khởi tạo tiền khấu trừ.
    let tienKhauTru = 0;

    // Khởi tạo tiền phụ thu.
    let tienPhuThu = 0;

    // Khởi tạo tổng phí phát sinh.
    let tongPhiPhatSinh = 0;

    // Hoàn cọc: hoàn toàn bộ tiền cọc đã thanh toán.
    if (hinhThuc === "HOAN_COC") {
      tienHoanCoc = tienCocDaThanhToan;
    }

    // Khấu trừ cọc: trừ một phần, phần còn lại hoàn.
    if (hinhThuc === "KHAU_TRU_COC") {
      if (soTienNhap > tienCocDaThanhToan) {
        throw new Error(
          "Số tiền khấu trừ không được lớn hơn tiền cọc. Nếu vượt cọc thì chọn phụ thu"
        );
      }

      tienKhauTru = soTienNhap;
      tienHoanCoc = tienCocDaThanhToan - soTienNhap;
      tongPhiPhatSinh = tienKhauTru;
    }

    // Phụ thu: giữ toàn bộ cọc và thu thêm số tiền nhập.
    if (hinhThuc === "PHU_THU") {
      tienKhauTru = tienCocDaThanhToan;
      tienPhuThu = soTienNhap;
      tongPhiPhatSinh = tienCocDaThanhToan + soTienNhap;
    }

    // Cập nhật thông tin thanh lý vào đơn thuê.
    const donCapNhat = await tx.$queryRaw`
      UPDATE don_thue
      SET
        tra_luc = NOW(),
        nguoi_nhan_tra_id = ${nguoiDungId}::uuid,
        ghi_chu_thanh_ly = ${ghiChuThanhLy},
        phi_phat_sinh_tien = ${tongPhiPhatSinh},
        phi_phat_sinh_ly_do = ${lyDoPhatSinh},
        trang_thai = ${TRANG_THAI_HOAN_THANH},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
      RETURNING
        id,
        ma_don,
        trang_thai,
        tra_luc,
        ghi_chu_thanh_ly,
        phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
        phi_phat_sinh_ly_do
    `;

    // Ghi dòng tiền khấu trừ nếu có.
    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienKhauTru,
      LOAI_KHAU_TRU_COC,
      lyDoPhatSinh || "Khấu trừ tiền cọc"
    );

    // Ghi dòng tiền hoàn cọc nếu có.
    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienHoanCoc,
      LOAI_HOAN_COC,
      ghiChuThanhLy
    );

    // Ghi dòng tiền phụ thu nếu có.
    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienPhuThu,
      LOAI_PHU_THU,
      lyDoPhatSinh || "Phụ thu khi thanh lý"
    );

    // Lưu từng ảnh khi trả vào bảng tep_don_thue.
    for (const anh of danhSachAnh) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at,
          updated_at
        )
        VALUES (
          ${donThueId}::uuid,
          ${MUC_DICH_ANH_KHI_TRA},
          ${anh.ten_file_goc},
          ${anh.file_url},
          ${anh.loai_file},
          ${anh.kich_thuoc_file},
          ${nguoiDungId}::uuid,
          NOW(),
          NOW()
        )
      `;
    }

    // Cập nhật thiết bị vật lý đã trả về sẵn sàng.
    // Phần hư hỏng/bảo trì sẽ làm sau.
    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET
        trang_thai = ${THIET_BI_SAN_SANG},
        updated_at = NOW()
      WHERE id IN (
        SELECT bgvp.thiet_bi_id
        FROM ban_giao_vat_pham bgvp

        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id

        WHERE ctdt.don_thue_id = ${donThueId}::uuid
          AND bgvp.thiet_bi_id IS NOT NULL
      )
    `;

    // Trả kết quả sau khi thanh lý.
    return {
      don_thue: donCapNhat[0],
      tien_coc_da_thanh_toan: tienCocDaThanhToan,
      tien_hoan_coc: tienHoanCoc,
      tien_khau_tru: tienKhauTru,
      tien_phu_thu: tienPhuThu,
      tong_phi_phat_sinh: tongPhiPhatSinh,
      so_anh_khi_tra: danhSachAnh.length,
    };
  });

  // Trả kết quả transaction.
  return ketQua;
}

// Export service cho controller dùng.
module.exports = {
  layDanhSachThanhLyService,
  layChiTietThanhLyService,
  lapPhieuTraService,
};