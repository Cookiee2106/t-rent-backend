const prisma = require("../../utils/prisma");

// ============================================================
// Helper: Lấy hồ sơ khách hàng (nội bộ)
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
// CREATE CHECKOUT SESSION
// ============================================================
async function createCheckoutSession(
  nguoi_dung_id,
  { xac_nhan_dieu_khoan_id, xac_thuc_otp_id }
) {
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  // Kiểm tra khách hàng đã được duyệt xác minh
  if (ho_so.trang_thai_xac_minh !== "DA_DUYET") {
    const error = new Error("Tài khoản chưa được xác minh");
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra xác nhận điều khoản
  const danh_sach_xac_nhan = await prisma.$queryRaw`
    SELECT x.id, x.khach_hang_id, x.dieu_khoan_id, x.don_thue_id, d.phien_ban
    FROM xac_nhan_dieu_khoan x
    JOIN dieu_khoan_thue d ON d.id = x.dieu_khoan_id
    WHERE x.id = ${xac_nhan_dieu_khoan_id} AND x.khach_hang_id = ${ho_so.id}
    LIMIT 1
  `;

  if (!danh_sach_xac_nhan || danh_sach_xac_nhan.length === 0) {
    const error = new Error("Xác nhận điều khoản không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const xac_nhan = danh_sach_xac_nhan[0];

  if (xac_nhan.don_thue_id) {
    const error = new Error("Điều khoản đã được sử dụng");
    error.statusCode = 400;
    throw error;
  }

  // Lấy giỏ hàng
  const danh_sach_gio_hang = await prisma.$queryRaw`
    SELECT id, khach_hang_id, trang_thai
    FROM gio_hang
    WHERE khach_hang_id = ${ho_so.id} AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_gio_hang || danh_sach_gio_hang.length === 0) {
    const error = new Error("Giỏ hàng trống");
    error.statusCode = 400;
    throw error;
  }

  const gio_hang = danh_sach_gio_hang[0];

  // Lấy chi tiết giỏ hàng (dùng snapshot)
  const danh_sach_chi_tiet_gio_hang = await prisma.$queryRaw`
    SELECT c.id, c.mau_thiet_bi_id, c.so_luong, c.ngay_nhan, c.ngay_tra, c.trang_thai,
           c.gia_thue_ngay_snapshot, c.tien_coc_snapshot,
           m.ten_mau, m.trang_thai as mau_trang_thai, m.da_xoa_luc
    FROM chi_tiet_gio_hang c
    JOIN mau_thiet_bi m ON m.id = c.mau_thiet_bi_id
    WHERE c.gio_hang_id = ${gio_hang.id} AND c.trang_thai = 'HOAT_DONG'
    ORDER BY c.created_at ASC
  `;

  if (!danh_sach_chi_tiet_gio_hang || danh_sach_chi_tiet_gio_hang.length === 0) {
    const error = new Error("Giỏ hàng trống");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra từng item
  for (const chi_tiet of danh_sach_chi_tiet_gio_hang) {
    if (chi_tiet.mau_trang_thai !== "HOAT_DONG" || chi_tiet.da_xoa_luc) {
      const error = new Error("Mẫu thiết bị hiện không khả dụng");
      error.statusCode = 400;
      throw error;
    }
    const ngay_bat_dau = new Date(chi_tiet.ngay_nhan);
    const ngay_ket_thuc = new Date(chi_tiet.ngay_tra);
    if (ngay_ket_thuc <= ngay_bat_dau) {
      const error = new Error("Ngày trả phải sau ngày nhận");
      error.statusCode = 400;
      throw error;
    }
    if (chi_tiet.so_luong < 1) {
      const error = new Error("Số lượng phải lớn hơn 0");
      error.statusCode = 400;
      throw error;
    }
  }

  // Kiểm tra phiên cũ đang chờ
  const danh_sach_phien_cu = await prisma.$queryRaw`
    SELECT id, trang_thai, het_han_luc
    FROM phien_thanh_toan
    WHERE gio_hang_id = ${gio_hang.id} AND trang_thai IN ('SAN_SANG_THANH_TOAN', 'DANG_CHO_THANH_TOAN')
    ORDER BY created_at DESC LIMIT 1
  `;

  if (danh_sach_phien_cu && danh_sach_phien_cu.length > 0) {
    const phien_cu = danh_sach_phien_cu[0];
    const da_het_han = phien_cu.het_han_luc && new Date(phien_cu.het_han_luc) < new Date();
    if (!da_het_han) {
      return {
        existingSession: true,
        phien_thanh_toan_id: phien_cu.id,
        trang_thai: phien_cu.trang_thai,
        message: "Đã có phiên thanh toán đang chờ. Vui lòng tiếp tục thanh toán phiên cũ.",
      };
    }
    await prisma.$executeRaw`UPDATE phien_thanh_toan SET trang_thai = 'HET_HAN' WHERE id = ${phien_cu.id}`;
  }

  // Tính toán tiền từ snapshot
  let ngay_bat_dau_min = null, ngay_ket_thuc_max = null;
  let tong_tien_thue = 0, tong_tien_coc = 0;

  for (const chi_tiet of danh_sach_chi_tiet_gio_hang) {
    const ngay_bat_dau = new Date(chi_tiet.ngay_nhan);
    const ngay_ket_thuc = new Date(chi_tiet.ngay_tra);
    if (!ngay_bat_dau_min || ngay_bat_dau < ngay_bat_dau_min) ngay_bat_dau_min = ngay_bat_dau;
    if (!ngay_ket_thuc_max || ngay_ket_thuc > ngay_ket_thuc_max) ngay_ket_thuc_max = ngay_ket_thuc;
    const so_ngay = Math.ceil((ngay_ket_thuc - ngay_bat_dau) / (1000 * 60 * 60 * 24));
    tong_tien_thue += parseFloat(chi_tiet.gia_thue_ngay_snapshot) * chi_tiet.so_luong * so_ngay;
    tong_tien_coc += parseFloat(chi_tiet.tien_coc_snapshot) * chi_tiet.so_luong;
  }

  const tong_tien_thanh_toan = tong_tien_thue + tong_tien_coc;
  const het_han_luc = new Date(Date.now() + 30 * 60 * 1000);

  // Kiểm tra OTP đã được xác thực trong DB
  const danh_sach_otp = await prisma.$queryRaw`
    SELECT
      id,
      nguoi_dung_id,
      xac_nhan_dieu_khoan_id,
      trang_thai,
      xac_thuc_luc
    FROM xac_thuc_otp
    WHERE id = ${xac_thuc_otp_id}
      AND nguoi_dung_id = ${nguoi_dung_id}
      AND xac_nhan_dieu_khoan_id = ${xac_nhan_dieu_khoan_id}
    LIMIT 1
  `;

  if (!danh_sach_otp || danh_sach_otp.length === 0) {
    const error = new Error("OTP không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  const xac_thuc_otp = danh_sach_otp[0];

  if (xac_thuc_otp.trang_thai !== "DA_XAC_THUC") {
    const error = new Error("OTP chưa được xác thực");
    error.statusCode = 400;
    throw error;
  }

  if (!xac_thuc_otp.xac_thuc_luc) {
    const error = new Error("OTP chưa được xác thực");
    error.statusCode = 400;
    throw error;
  }

  // Giới hạn thời gian sử dụng sau khi verify OTP
  const thoi_han_sau_xac_thuc = new Date(xac_thuc_otp.xac_thuc_luc.getTime() + 5 * 60 * 1000);

  if (new Date() > thoi_han_sau_xac_thuc) {
    const error = new Error("OTP đã hết thời gian sử dụng cho checkout");
    error.statusCode = 400;
    throw error;
  }

  // Tạo phiên thanh toán trong transaction
  const ket_qua = await prisma.$transaction(async (tx) => {
    // Tạo phien_thanh_toan (lưu xac_thuc_otp_id)
    const phien_thanh_toan_ket_qua = await tx.$queryRaw`
      INSERT INTO phien_thanh_toan (
        khach_hang_id, gio_hang_id, xac_nhan_dieu_khoan_id, xac_thuc_otp_id,
        trang_thai, tong_tien_thue, tong_tien_coc, tong_tien_thanh_toan,
        het_han_luc, created_at, updated_at
      ) VALUES (
        ${ho_so.id}, ${gio_hang.id}, ${xac_nhan_dieu_khoan_id}, ${xac_thuc_otp_id},
        'SAN_SANG_THANH_TOAN', ${tong_tien_thue}, ${tong_tien_coc}, ${tong_tien_thanh_toan},
        ${het_han_luc}, NOW(), NOW()
      ) RETURNING id, trang_thai
    `;

    const phien_thanh_toan = phien_thanh_toan_ket_qua[0];

    const danh_sach_chi_tiet_tao = [];

    for (const chi_tiet of danh_sach_chi_tiet_gio_hang) {
      const ngay_bat_dau = new Date(chi_tiet.ngay_nhan);
      const ngay_ket_thuc = new Date(chi_tiet.ngay_tra);
      const so_ngay = Math.ceil((ngay_ket_thuc - ngay_bat_dau) / (1000 * 60 * 60 * 24));
      const tien_thue_item = parseFloat(chi_tiet.gia_thue_ngay_snapshot) * chi_tiet.so_luong * so_ngay;
      const tien_coc_item = parseFloat(chi_tiet.tien_coc_snapshot) * chi_tiet.so_luong;

      const chi_tiet_tao = await tx.$queryRaw`
        INSERT INTO chi_tiet_phien_thanh_toan (
          phien_thanh_toan_id, chi_tiet_gio_hang_id, mau_thiet_bi_id, so_luong,
          ngay_nhan, ngay_tra, gia_thue_ngay_snapshot, tien_coc_snapshot,
          tien_thue, tien_coc, created_at
        ) VALUES (
          ${phien_thanh_toan.id}, ${chi_tiet.id}, ${chi_tiet.mau_thiet_bi_id}, ${chi_tiet.so_luong},
          ${chi_tiet.ngay_nhan}, ${chi_tiet.ngay_tra}, ${chi_tiet.gia_thue_ngay_snapshot}, ${chi_tiet.tien_coc_snapshot},
          ${tien_thue_item}, ${tien_coc_item}, NOW()
        )
        RETURNING id, mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra,
                  gia_thue_ngay_snapshot, tien_coc_snapshot, tien_thue, tien_coc
      `;

      danh_sach_chi_tiet_tao.push(chi_tiet_tao[0]);
    }

    return {
      phien_thanh_toan_id: phien_thanh_toan.id,
      trang_thai: "SAN_SANG_THANH_TOAN",
      tong_tien_thue,
      tong_tien_coc,
      tong_tien_thanh_toan,
      het_han_luc,
      chi_tiet_tao: danh_sach_chi_tiet_tao,
    };
  });

  return {
    phien_thanh_toan_id: ket_qua.phien_thanh_toan_id,
    trang_thai: ket_qua.trang_thai,
    tong_tien_thue: ket_qua.tong_tien_thue,
    tong_tien_coc: ket_qua.tong_tien_coc,
    tong_tien_thanh_toan: ket_qua.tong_tien_thanh_toan,
    het_han_luc: ket_qua.het_han_luc,
    chi_tiet_phien_thanh_toan: ket_qua.chi_tiet_tao.map((chi_tiet) => ({
      id: chi_tiet.id,
      mau_thiet_bi_id: chi_tiet.mau_thiet_bi_id,
      so_luong: chi_tiet.so_luong,
      ngay_nhan: chi_tiet.ngay_nhan,
      ngay_tra: chi_tiet.ngay_tra,
      gia_thue_ngay_snapshot: parseFloat(chi_tiet.gia_thue_ngay_snapshot),
      tien_coc_snapshot: parseFloat(chi_tiet.tien_coc_snapshot),
      tien_thue: parseFloat(chi_tiet.tien_thue),
      tien_coc: parseFloat(chi_tiet.tien_coc),
    })),
  };
}

// ============================================================
// GET CHECKOUT SESSION
// ============================================================
async function getCheckoutSession(nguoi_dung_id, phien_thanh_toan_id) {
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  const danh_sach_phien = await prisma.$queryRaw`
    SELECT p.id, p.trang_thai, p.xac_thuc_otp_id, p.tong_tien_thue, p.tong_tien_coc,
           p.tong_tien_thanh_toan, p.het_han_luc, p.da_thanh_toan_luc, p.that_bai_luc, p.created_at,
           x.id as xac_nhan_dieu_khoan_id, d.phien_ban, x.dong_y_luc
    FROM phien_thanh_toan p
    LEFT JOIN xac_nhan_dieu_khoan x ON x.id = p.xac_nhan_dieu_khoan_id
    LEFT JOIN dieu_khoan_thue d ON d.id = x.dieu_khoan_id
    WHERE p.id = ${phien_thanh_toan_id} AND p.khach_hang_id = ${ho_so.id}
    LIMIT 1
  `;

  if (!danh_sach_phien || danh_sach_phien.length === 0) {
    const error = new Error("Không tìm thấy phiên thanh toán");
    error.statusCode = 404;
    throw error;
  }

  const phien = danh_sach_phien[0];

  const danh_sach_chi_tiet = await prisma.$queryRaw`
    SELECT c.id, c.mau_thiet_bi_id, c.so_luong, c.ngay_nhan, c.ngay_tra,
           c.gia_thue_ngay_snapshot, c.tien_coc_snapshot, c.tien_thue, c.tien_coc,
           m.ten_mau, m.anh_url, h.ten_hang
    FROM chi_tiet_phien_thanh_toan c
    JOIN mau_thiet_bi m ON m.id = c.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = m.hang_id
    WHERE c.phien_thanh_toan_id = ${phien_thanh_toan_id}
    ORDER BY c.created_at ASC
  `;

  const da_het_han = phien.het_han_luc && new Date(phien.het_han_luc) < new Date();

  return {
    id: phien.id,
    trang_thai: phien.trang_thai,
    da_het_han,
    tong_tien_thue: parseFloat(phien.tong_tien_thue),
    tong_tien_coc: parseFloat(phien.tong_tien_coc),
    tong_tien_thanh_toan: parseFloat(phien.tong_tien_thanh_toan),
    het_han_luc: phien.het_han_luc,
    da_thanh_toan_luc: phien.da_thanh_toan_luc,
    that_bai_luc: phien.that_bai_luc,
    created_at: phien.created_at,
    xac_nhan_dieu_khoan: phien.xac_nhan_dieu_khoan_id
      ? { id: phien.xac_nhan_dieu_khoan_id, phien_ban: phien.phien_ban, dong_y_luc: phien.dong_y_luc }
      : null,
    chi_tiet_phien_thanh_toan: danh_sach_chi_tiet.map((chi_tiet) => ({
      id: chi_tiet.id,
      mau_thiet_bi_id: chi_tiet.mau_thiet_bi_id,
      so_luong: chi_tiet.so_luong,
      ngay_nhan: chi_tiet.ngay_nhan,
      ngay_tra: chi_tiet.ngay_tra,
      gia_thue_ngay_snapshot: parseFloat(chi_tiet.gia_thue_ngay_snapshot),
      tien_coc_snapshot: parseFloat(chi_tiet.tien_coc_snapshot),
      tien_thue: parseFloat(chi_tiet.tien_thue),
      tien_coc: parseFloat(chi_tiet.tien_coc),
      mau_thiet_bi: {
        id: chi_tiet.mau_thiet_bi_id,
        ten_mau: chi_tiet.ten_mau,
        anh_url: chi_tiet.anh_url,
        hang_thiet_bi: chi_tiet.ten_hang ? { ten_hang: chi_tiet.ten_hang } : null,
      },
    })),
  };
}

module.exports = { createCheckoutSession, getCheckoutSession };
