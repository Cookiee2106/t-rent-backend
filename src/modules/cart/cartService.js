const prisma = require("../../utils/prisma");

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
// Helper: Lấy hoặc tạo giỏ hàng trong transaction
// ============================================================
async function lay_hoac_tao_gio_hang(tx, ho_so_khach_hang_id) {
  const danh_sach_gio_hang = await tx.$queryRaw`
    SELECT id, khach_hang_id, trang_thai
    FROM gio_hang
    WHERE khach_hang_id = ${ho_so_khach_hang_id}
      AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (danh_sach_gio_hang && danh_sach_gio_hang.length > 0) {
    return danh_sach_gio_hang[0];
  }

  const danh_sach_gio_hang_moi = await tx.$queryRaw`
    INSERT INTO gio_hang (khach_hang_id, trang_thai, created_at, updated_at)
    VALUES (${ho_so_khach_hang_id}, 'HOAT_DONG', NOW(), NOW())
    RETURNING id, khach_hang_id, trang_thai
  `;

  return danh_sach_gio_hang_moi[0];
}

// ============================================================
// ADD CART ITEM
// ============================================================
async function addCartItem(nguoi_dung_id, { mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra }) {
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  // Chỉ khách đã xác minh mới được thêm giỏ
  if (ho_so.trang_thai_xac_minh !== "DA_DUYET") {
    const error = new Error("Tài khoản chưa được xác minh, không thể thêm sản phẩm vào giỏ hàng");
    error.statusCode = 400;
    throw error;
  }

  // Kiem tra mau thiet bi ton tai
  const danh_sach_mau_thiet_bi = await prisma.$queryRaw`
    SELECT
      id, ten_mau, anh_url, gia_thue_ngay, tien_coc, trang_thai, da_xoa_luc
    FROM mau_thiet_bi
    WHERE id = ${mau_thiet_bi_id}
    LIMIT 1
  `;

  if (!danh_sach_mau_thiet_bi || danh_sach_mau_thiet_bi.length === 0) {
    const error = new Error("Mẫu thiết bị không tồn tại");
    error.statusCode = 404;
    throw error;
  }

  const mau_thiet_bi = danh_sach_mau_thiet_bi[0];

  // Kiểm tra trạng thái mẫu thiết bị
  if (mau_thiet_bi.trang_thai !== "HOAT_DONG" || mau_thiet_bi.da_xoa_luc) {
    const error = new Error("Mẫu thiết bị hiện không khả dụng");
    error.statusCode = 400;
    throw error;
  }

  // Parse va validate ngay
  const ngay_bat_dau = new Date(ngay_nhan);
  const ngay_ket_thuc = new Date(ngay_tra);

  if (isNaN(ngay_bat_dau.getTime()) || isNaN(ngay_ket_thuc.getTime())) {
    const error = new Error("Ngày nhận và ngày trả không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  if (ngay_ket_thuc <= ngay_bat_dau) {
    const error = new Error("Ngày trả phải sau ngày nhận");
    error.statusCode = 400;
    throw error;
  }

  if (so_luong < 1) {
    const error = new Error("Số lượng phải lớn hơn 0");
    error.statusCode = 400;
    throw error;
  }

  // Lấy hoặc tạo giỏ hàng trong transaction
  const ket_qua = await prisma.$transaction(async (tx) => {
    const gio_hang = await lay_hoac_tao_gio_hang(tx, ho_so.id);

    // Kiem tra item da ton tai chua
    const danh_sach_chi_tiet_ton_tai = await tx.$queryRaw`
      SELECT id, so_luong
      FROM chi_tiet_gio_hang
      WHERE gio_hang_id = ${gio_hang.id}
        AND mau_thiet_bi_id = ${mau_thiet_bi_id}
        AND ngay_nhan = ${ngay_bat_dau}
        AND ngay_tra = ${ngay_ket_thuc}
        AND trang_thai = 'HOAT_DONG'
      LIMIT 1
    `;

    let chi_tiet_gio_hang;
    if (danh_sach_chi_tiet_ton_tai && danh_sach_chi_tiet_ton_tai.length > 0) {
      // Update so luong neu item da ton tai
      const chi_tiet_gio_hang_cu = danh_sach_chi_tiet_ton_tai[0];
      await tx.$executeRaw`
        UPDATE chi_tiet_gio_hang
        SET so_luong = ${chi_tiet_gio_hang_cu.so_luong + so_luong},
            updated_at = NOW()
        WHERE id = ${chi_tiet_gio_hang_cu.id}
      `;

      // Lay lai item sau update
      const danh_sach_chi_tiet_cap_nhat = await tx.$queryRaw`
        SELECT
          c.id,
          c.so_luong,
          c.ngay_nhan,
          c.ngay_tra,
          c.gia_thue_ngay_snapshot,
          c.tien_coc_snapshot,
          m.ten_mau,
          m.anh_url
        FROM chi_tiet_gio_hang c
        JOIN mau_thiet_bi m ON m.id = c.mau_thiet_bi_id
        WHERE c.id = ${chi_tiet_gio_hang_cu.id}
        LIMIT 1
      `;
      chi_tiet_gio_hang = danh_sach_chi_tiet_cap_nhat[0];
    } else {
      // Tao item moi
      const danh_sach_chi_tiet_moi = await tx.$queryRaw`
        INSERT INTO chi_tiet_gio_hang (
          gio_hang_id, mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra,
          gia_thue_ngay_snapshot, tien_coc_snapshot, trang_thai, created_at, updated_at
        )
        VALUES (
          ${gio_hang.id}, ${mau_thiet_bi_id}, ${so_luong}, ${ngay_bat_dau}, ${ngay_ket_thuc},
          ${mau_thiet_bi.gia_thue_ngay}, ${mau_thiet_bi.tien_coc}, 'HOAT_DONG', NOW(), NOW()
        )
        RETURNING id, so_luong, ngay_nhan, ngay_tra, gia_thue_ngay_snapshot, tien_coc_snapshot
      `;

      // Lay thong tin mau thiet bi
      const danh_sach_chi_tiet_voi_mau = await tx.$queryRaw`
        SELECT
          c.id,
          c.so_luong,
          c.ngay_nhan,
          c.ngay_tra,
          c.gia_thue_ngay_snapshot,
          c.tien_coc_snapshot,
          m.ten_mau,
          m.anh_url
        FROM chi_tiet_gio_hang c
        JOIN mau_thiet_bi m ON m.id = c.mau_thiet_bi_id
        WHERE c.id = ${danh_sach_chi_tiet_moi[0].id}
        LIMIT 1
      `;
      chi_tiet_gio_hang = danh_sach_chi_tiet_voi_mau[0];
    }

    return {
      gio_hang_id: gio_hang.id,
      chi_tiet: chi_tiet_gio_hang,
    };
  });

  // Response - dung field DB tieng Viet
  return {
    id: ket_qua.chi_tiet.id,
    mau_thiet_bi: {
      id: mau_thiet_bi_id,
      ten_mau: ket_qua.chi_tiet.ten_mau,
      anh_url: ket_qua.chi_tiet.anh_url,
    },
    so_luong: ket_qua.chi_tiet.so_luong,
    ngay_nhan: ket_qua.chi_tiet.ngay_nhan,
    ngay_tra: ket_qua.chi_tiet.ngay_tra,
    gia_thue_ngay_snapshot: parseFloat(ket_qua.chi_tiet.gia_thue_ngay_snapshot),
    tien_coc_snapshot: parseFloat(ket_qua.chi_tiet.tien_coc_snapshot),
  };
}

// ============================================================
// GET CART
// Lấy thông tin giỏ hàng
// ============================================================
async function getCart(nguoi_dung_id) {
  // Lấy profile
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  // Lấy giỏ hàng đang hoạt động với items
  const danh_sach_gio_hang = await prisma.$queryRaw`
    SELECT id, khach_hang_id, trang_thai, created_at, updated_at
    FROM gio_hang
    WHERE khach_hang_id = ${ho_so.id}
      AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_gio_hang || danh_sach_gio_hang.length === 0) {
    return {
      gio_hang: null,
      chi_tiet_gio_hang: [],
    };
  }

  const gio_hang = danh_sach_gio_hang[0];

  // Lấy chi tiết giỏ hàng với thông tin mẫu thiết bị
  const danh_sach_chi_tiet_gio_hang = await prisma.$queryRaw`
    SELECT
      c.id,
      c.so_luong,
      c.ngay_nhan,
      c.ngay_tra,
      c.gia_thue_ngay_snapshot,
      c.tien_coc_snapshot,
      c.trang_thai,
      c.created_at,
      m.id as mau_thiet_bi_id,
      m.ten_mau,
      m.anh_url,
      m.gia_thue_ngay,
      m.tien_coc,
      h.id as hang_id,
      h.ten_hang,
      d.id as danh_muc_id,
      d.ten_danh_muc
    FROM chi_tiet_gio_hang c
    JOIN mau_thiet_bi m ON m.id = c.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h ON h.id = m.hang_id
    LEFT JOIN danh_muc_thiet_bi d ON d.id = m.danh_muc_id
    WHERE c.gio_hang_id = ${gio_hang.id}
      AND c.trang_thai = 'HOAT_DONG'
    ORDER BY c.created_at DESC
  `;

  const chi_tiet_gio_hang = danh_sach_chi_tiet_gio_hang.map((chi_tiet) => ({
    id: chi_tiet.id,
    mau_thiet_bi_id: chi_tiet.mau_thiet_bi_id,
    so_luong: chi_tiet.so_luong,
    ngay_nhan: chi_tiet.ngay_nhan,
    ngay_tra: chi_tiet.ngay_tra,
    gia_thue_ngay_snapshot: parseFloat(chi_tiet.gia_thue_ngay_snapshot),
    tien_coc_snapshot: parseFloat(chi_tiet.tien_coc_snapshot),
    trang_thai: chi_tiet.trang_thai,
    mau_thiet_bi: {
      id: chi_tiet.mau_thiet_bi_id,
      ten_mau: chi_tiet.ten_mau,
      anh_url: chi_tiet.anh_url,
      gia_thue_ngay: parseFloat(chi_tiet.gia_thue_ngay),
      tien_coc: parseFloat(chi_tiet.tien_coc),
      hang_thiet_bi: chi_tiet.hang_id
        ? { id: chi_tiet.hang_id, ten_hang: chi_tiet.ten_hang }
        : null,
      danh_muc_thiet_bi: chi_tiet.danh_muc_id
        ? { id: chi_tiet.danh_muc_id, ten_danh_muc: chi_tiet.ten_danh_muc }
        : null,
    },
  }));

  return {
    gio_hang: {
      id: gio_hang.id,
      khach_hang_id: gio_hang.khach_hang_id,
      trang_thai: gio_hang.trang_thai,
      created_at: gio_hang.created_at,
      updated_at: gio_hang.updated_at,
    },
    chi_tiet_gio_hang,
  };
}

// ============================================================
// REMOVE CART ITEM
// Xóa sản phẩm khỏi giỏ hàng
// ============================================================
async function removeCartItem(nguoi_dung_id, chi_tiet_gio_hang_id) {
  // Lấy profile
  const ho_so = await getCustomerProfile(nguoi_dung_id);

  // Lấy giỏ hàng của user
  const danh_sach_gio_hang = await prisma.$queryRaw`
    SELECT id, khach_hang_id
    FROM gio_hang
    WHERE khach_hang_id = ${ho_so.id}
      AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_gio_hang || danh_sach_gio_hang.length === 0) {
    const error = new Error("Không tìm thấy giỏ hàng");
    error.statusCode = 404;
    throw error;
  }

  const gio_hang = danh_sach_gio_hang[0];

  // Kiểm tra item thuộc giỏ hàng này
  const danh_sach_chi_tiet = await prisma.$queryRaw`
    SELECT id
    FROM chi_tiet_gio_hang
    WHERE id = ${chi_tiet_gio_hang_id}
      AND gio_hang_id = ${gio_hang.id}
      AND trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_chi_tiet || danh_sach_chi_tiet.length === 0) {
    const error = new Error("Không tìm thấy sản phẩm trong giỏ hàng");
    error.statusCode = 404;
    throw error;
  }

  // Soft delete - cập nhật trạng thái
  await prisma.$executeRaw`
    UPDATE chi_tiet_gio_hang
    SET trang_thai = 'DA_XOA',
        updated_at = NOW()
    WHERE id = ${chi_tiet_gio_hang_id}
  `;

  return { message: "Đã xóa sản phẩm khỏi giỏ hàng" };
}

module.exports = {
  addCartItem,
  getCart,
  removeCartItem,
};
