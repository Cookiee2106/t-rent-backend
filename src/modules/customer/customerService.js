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

// ============================================================
// GET CUSTOMER ORDERS (API #4)
// ============================================================
async function getCustomerOrders(nguoi_dung_id, { trang = 1, gioi_han = 20 }) {
  const trang_so = Math.max(1, parseInt(trang, 10) || 1);
  const gioi_han_so = Math.min(100, Math.max(1, parseInt(gioi_han, 10) || 20));
  const vi_tri_bat_dau = (trang_so - 1) * gioi_han_so;

  // Bước 1: Lấy danh sách đơn + phân trang
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.ngay_nhan, dt.ngay_tra, dt.so_ngay_thue,
           dt.tong_tien_thue, dt.tong_tien_coc, dt.trang_thai,
           dt.created_at, dt.updated_at
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    WHERE hs.nguoi_dung_id = ${nguoi_dung_id}
    ORDER BY dt.created_at DESC
    LIMIT ${gioi_han_so} OFFSET ${vi_tri_bat_dau}
  `;

  // Bước 2: Đếm tổng số
  const ket_qua_dem = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS tong_so
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    WHERE hs.nguoi_dung_id = ${nguoi_dung_id}
  `;
  const tong_so = ket_qua_dem[0]?.tong_so || 0;

  if (danh_sach_don.length === 0) {
    return {
      danh_sach: [],
      phan_trang: { trang: trang_so, gioi_han: gioi_han_so, tong_so },
    };
  }

  // Bước 3: Lấy items cho tất cả đơn (batch)
  const danh_sach_don_thue_id = danh_sach_don.map((d) => d.id);

  const danh_sach_chi_tiet = await prisma.$queryRaw`
    SELECT cdt.don_thue_id, cdt.id, cdt.mau_thiet_bi_id, cdt.so_luong,
           mtb.ten_mau, mtb.anh_url
    FROM chi_tiet_don_thue cdt
    JOIN mau_thiet_bi mtb ON mtb.id = cdt.mau_thiet_bi_id
    WHERE cdt.don_thue_id = ANY(${danh_sach_don_thue_id}::uuid[])
  `;

  // Bước 4: Lấy payments cho tất cả đơn (batch)
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT tt.don_thue_id, tt.id, tt.loai_thanh_toan, tt.so_tien,
           tt.phuong_thuc, tt.trang_thai
    FROM thanh_toan tt
    WHERE tt.don_thue_id = ANY(${danh_sach_don_thue_id}::uuid[])
  `;

  // Group items & payments theo don_thue_id
  const chi_tiet_theo_don = {};
  const thanh_toan_theo_don = {};

  for (const ct of danh_sach_chi_tiet) {
    if (!chi_tiet_theo_don[ct.don_thue_id]) chi_tiet_theo_don[ct.don_thue_id] = [];
    chi_tiet_theo_don[ct.don_thue_id].push({
      id: ct.id,
      mau_thiet_bi_id: ct.mau_thiet_bi_id,
      so_luong: ct.so_luong,
      ten_mau: ct.ten_mau,
      anh_url: ct.anh_url,
    });
  }

  for (const tt of danh_sach_thanh_toan) {
    if (!thanh_toan_theo_don[tt.don_thue_id]) thanh_toan_theo_don[tt.don_thue_id] = [];
    thanh_toan_theo_don[tt.don_thue_id].push({
      id: tt.id,
      loai_thanh_toan: tt.loai_thanh_toan,
      so_tien: tt.so_tien,
      phuong_thuc: tt.phuong_thuc,
      trang_thai: tt.trang_thai,
    });
  }

  const danh_sach = danh_sach_don.map((don) => ({
    id: don.id,
    ma_don: don.ma_don,
    ngay_nhan: don.ngay_nhan,
    ngay_tra: don.ngay_tra,
    so_ngay_thue: don.so_ngay_thue,
    tong_tien_thue: don.tong_tien_thue,
    tong_tien_coc: don.tong_tien_coc,
    trang_thai: don.trang_thai,
    created_at: don.created_at,
    updated_at: don.updated_at,
    chi_tiet_don_thue: chi_tiet_theo_don[don.id] || [],
    thanh_toan: thanh_toan_theo_don[don.id] || [],
  }));

  return {
    danh_sach,
    phan_trang: { trang: trang_so, gioi_han: gioi_han_so, tong_so },
  };
}

// ============================================================
// GET CUSTOMER ORDER DETAIL (API #5)
// ============================================================
async function getCustomerOrderDetail(nguoi_dung_id, don_thue_id) {
  // Lấy đơn + khách hàng
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.*, hs.id AS ho_so_id, hs.dia_chi, hs.so_cccd,
           nd.ho_ten, nd.email, nd.so_dien_thoai
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    WHERE dt.id = ${don_thue_id}::uuid AND hs.nguoi_dung_id = ${nguoi_dung_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  // Items
  const danh_sach_chi_tiet = await prisma.$queryRaw`
    SELECT cdt.*, mtb.ten_mau, mtb.anh_url, mtb.gia_thue_ngay, mtb.tien_coc
    FROM chi_tiet_don_thue cdt
    JOIN mau_thiet_bi mtb ON mtb.id = cdt.mau_thiet_bi_id
    WHERE cdt.don_thue_id = ${don_thue_id}::uuid
  `;

  // Payments
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT id, loai_thanh_toan, so_tien, phuong_thuc, trang_thai, da_thanh_toan_luc
    FROM thanh_toan
    WHERE don_thue_id = ${don_thue_id}::uuid
  `;

  // Phiếu bàn giao
  const danh_sach_phieu_ban_giao = await prisma.$queryRaw`
    SELECT pbv.id, pbv.ban_giao_luc, pbv.ghi_chu, nd.ho_ten AS nhan_vien
    FROM phieu_ban_giao pbv
    JOIN nguoi_dung nd ON nd.id = pbv.nhan_vien_id
    WHERE pbv.don_thue_id = ${don_thue_id}::uuid
  `;

  // Phiếu trả
  const danh_sach_phieu_tra = await prisma.$queryRaw`
    SELECT ptt.id, ptt.tra_luc, ptt.ket_qua, nd.ho_ten AS nhan_vien
    FROM phieu_tra_thiet_bi ptt
    JOIN nguoi_dung nd ON nd.id = ptt.nhan_vien_id
    WHERE ptt.don_thue_id = ${don_thue_id}::uuid
  `;

  return {
    id: don.id,
    ma_don: don.ma_don,
    ngay_nhan: don.ngay_nhan,
    ngay_tra: don.ngay_tra,
    so_ngay_thue: don.so_ngay_thue,
    tong_tien_thue: don.tong_tien_thue,
    tong_tien_coc: don.tong_tien_coc,
    trang_thai: don.trang_thai,
    huy_luc: don.huy_luc || null,
    ly_do_huy: don.ly_do_huy || null,
    created_at: don.created_at,
    updated_at: don.updated_at,
    khach_hang: {
      ho_ten: don.ho_ten,
      email: don.email,
      so_dien_thoai: don.so_dien_thoai,
      dia_chi: don.dia_chi,
      so_cccd: don.so_cccd,
    },
    chi_tiet_don_thue: danh_sach_chi_tiet.map((ct) => ({
      id: ct.id,
      mau_thiet_bi_id: ct.mau_thiet_bi_id,
      so_luong: ct.so_luong,
      ten_mau: ct.ten_mau,
      anh_url: ct.anh_url,
      gia_thue_ngay: ct.gia_thue_ngay,
      tien_coc: ct.tien_coc,
      trang_thai: ct.trang_thai,
    })),
    thanh_toan: danh_sach_thanh_toan.map((tt) => ({
      id: tt.id,
      loai_thanh_toan: tt.loai_thanh_toan,
      so_tien: tt.so_tien,
      phuong_thuc: tt.phuong_thuc,
      trang_thai: tt.trang_thai,
      da_thanh_toan_luc: tt.da_thanh_toan_luc,
    })),
    phieu_ban_giao: danh_sach_phieu_ban_giao.length > 0
      ? {
          id: danh_sach_phieu_ban_giao[0].id,
          ban_giao_luc: danh_sach_phieu_ban_giao[0].ban_giao_luc,
          ghi_chu: danh_sach_phieu_ban_giao[0].ghi_chu,
          nhan_vien: danh_sach_phieu_ban_giao[0].nhan_vien,
        }
      : null,
    phieu_tra_thiet_bi: danh_sach_phieu_tra.length > 0
      ? {
          id: danh_sach_phieu_tra[0].id,
          tra_luc: danh_sach_phieu_tra[0].tra_luc,
          ket_qua: danh_sach_phieu_tra[0].ket_qua,
          nhan_vien: danh_sach_phieu_tra[0].nhan_vien,
        }
      : null,
  };
}

// ============================================================
// CANCEL ORDER (API #6)
// ============================================================
async function cancelOrderCustomer(nguoi_dung_id, don_thue_id) {
  // Tìm đơn thuê theo id + kiểm tra quyền sở hữu
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.trang_thai
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    WHERE dt.id = ${don_thue_id}::uuid AND hs.nguoi_dung_id = ${nguoi_dung_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  // Chỉ cho phép hủy khi trạng thái là DA_GIU_CHO
  if (don.trang_thai !== "DA_GIU_CHO") {
    const error = new Error(
      "Chỉ có thể hủy đơn khi đang ở trạng thái 'Đã giữ chỗ'"
    );
    error.statusCode = 400;
    throw error;
  }

  // Cập nhật trạng thái đơn
  await prisma.$executeRaw`
    UPDATE don_thue
    SET trang_thai = 'DA_HUY',
        huy_luc = NOW(),
        ly_do_huy = 'Khách hàng yêu cầu hủy',
        updated_at = NOW()
    WHERE id = ${don_thue_id}::uuid
  `;

  // Lấy lại đơn sau khi hủy
  const don_da_huy = await prisma.$queryRaw`
    SELECT id, ma_don, trang_thai, huy_luc, ly_do_huy, updated_at
    FROM don_thue
    WHERE id = ${don_thue_id}::uuid
  `;

  return {
    id: don_da_huy[0].id,
    ma_don: don_da_huy[0].ma_don,
    trang_thai: don_da_huy[0].trang_thai,
    huy_luc: don_da_huy[0].huy_luc,
    ly_do_huy: don_da_huy[0].ly_do_huy,
    updated_at: don_da_huy[0].updated_at,
  };
}

module.exports = {
  getCustomerAccount,
  updateCustomerProfile,
  submitVerification,
  getCustomerOrders,
  getCustomerOrderDetail,
  cancelOrderCustomer,
};
