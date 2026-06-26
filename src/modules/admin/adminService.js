const { Prisma } = require("@prisma/client");
const prisma = require("../../utils/prisma");

// ============================================================
// HELPER: Lấy hồ sơ xác minh đang chờ duyệt
// ============================================================
async function lay_ho_so_xac_minh_cho_duyet(nguoi_dung_id) {
  const danh_sach_ho_so = await prisma.$queryRaw`
    SELECT p.id, p.nguoi_dung_id
    FROM ho_so_khach_hang p
    WHERE p.nguoi_dung_id = ${nguoi_dung_id}
      AND p.trang_thai_xac_minh = 'CHO_DUYET'
    LIMIT 1
  `;

  if (!danh_sach_ho_so || danh_sach_ho_so.length === 0) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  const ho_so = danh_sach_ho_so[0];

  const danh_sach_ho_so_xac_minh = await prisma.$queryRaw`
    SELECT id, so_cccd
    FROM ho_so_xac_minh
    WHERE khach_hang_id = ${ho_so.id}
      AND trang_thai = 'CHO_DUYET'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!danh_sach_ho_so_xac_minh || danh_sach_ho_so_xac_minh.length === 0) {
    const error = new Error("Không tìm thấy hồ sơ xác minh đang chờ duyệt");
    error.statusCode = 404;
    throw error;
  }

  return {
    ho_so,
    ho_so_xac_minh: danh_sach_ho_so_xac_minh[0],
  };
}

// ============================================================
// GET CUSTOMER ACCOUNTS
// ============================================================
async function getCustomerAccounts({ trang = 1, gioi_han = 20, tu_khoa, trang_thai_xac_minh }) {
  const trang_hien_tai = parseInt(trang) || 1;
  const so_luong = parseInt(gioi_han) || 20;
  const vi_tri_bat_dau = (trang_hien_tai - 1) * so_luong;

  // Base JOIN voi Prisma.sql
  const base_join = Prisma.sql`
    LEFT JOIN ho_so_khach_hang p ON p.nguoi_dung_id = u.id
    LEFT JOIN LATERAL (
      SELECT
        v.id,
        v.so_cccd,
        v.anh_mat_truoc_url,
        v.anh_mat_sau_url,
        v.trang_thai,
        v.ly_do_tu_choi,
        v.duyet_luc,
        v.created_at
      FROM ho_so_xac_minh v
      WHERE v.khach_hang_id = p.id
      ORDER BY v.created_at DESC
      LIMIT 1
    ) ho_so_xac_minh_moi_nhat ON TRUE
  `;

  // Dieu kien loc dong
  const dieu_kien = [
    Prisma.sql`u.vai_tro = 'KHACH_HANG'`,
    Prisma.sql`u.da_xoa_luc IS NULL`,
  ];

  if (tu_khoa) {
    const mau_tim_kiem = `%${tu_khoa}%`;
    dieu_kien.push(
      Prisma.sql`(
        u.ho_ten ILIKE ${mau_tim_kiem}
        OR u.email ILIKE ${mau_tim_kiem}
        OR u.so_dien_thoai ILIKE ${mau_tim_kiem}
      )`
    );
  }

  if (trang_thai_xac_minh) {
    dieu_kien.push(
      Prisma.sql`p.trang_thai_xac_minh = ${trang_thai_xac_minh}`
    );
  }

  const menh_de_where = Prisma.sql`
    WHERE ${Prisma.join(dieu_kien, " AND ")}
  `;

  // Query danh sach
  const danh_sach_nguoi_dung = await prisma.$queryRaw`
    SELECT
      u.id, u.ho_ten, u.email, u.so_dien_thoai, u.trang_thai, u.created_at,
      p.id as ho_so_khach_hang_id, p.dia_chi, p.so_cccd, p.trang_thai_xac_minh,
      ho_so_xac_minh_moi_nhat.id as ho_so_xac_minh_id,
      ho_so_xac_minh_moi_nhat.so_cccd as ho_so_xac_minh_so_cccd,
      ho_so_xac_minh_moi_nhat.anh_mat_truoc_url as ho_so_xac_minh_anh_mat_truoc_url,
      ho_so_xac_minh_moi_nhat.anh_mat_sau_url as ho_so_xac_minh_anh_mat_sau_url,
      ho_so_xac_minh_moi_nhat.trang_thai as ho_so_xac_minh_trang_thai,
      ho_so_xac_minh_moi_nhat.ly_do_tu_choi as ho_so_xac_minh_ly_do_tu_choi,
      ho_so_xac_minh_moi_nhat.duyet_luc as ho_so_xac_minh_duyet_luc,
      ho_so_xac_minh_moi_nhat.created_at as ho_so_xac_minh_created_at
    FROM nguoi_dung u
    ${base_join}
    ${menh_de_where}
    ORDER BY u.created_at DESC
    LIMIT ${so_luong}
    OFFSET ${vi_tri_bat_dau}
  `;

  // Query dem tong
  const ket_qua_dem = await prisma.$queryRaw`
    SELECT COUNT(*) as tong_so
    FROM nguoi_dung u
    LEFT JOIN ho_so_khach_hang p ON p.nguoi_dung_id = u.id
    ${menh_de_where}
  `;
  const tong_so = parseInt(ket_qua_dem[0]?.tong_so || 0);

  // Response - dung field DB tieng Viet
  const danh_sach = danh_sach_nguoi_dung.map((nguoi_dung) => ({
    id: nguoi_dung.id,
    ho_ten: nguoi_dung.ho_ten,
    email: nguoi_dung.email,
    so_dien_thoai: nguoi_dung.so_dien_thoai,
    trang_thai: nguoi_dung.trang_thai,
    created_at: nguoi_dung.created_at,
    ho_so_khach_hang: nguoi_dung.ho_so_khach_hang_id
      ? {
          id: nguoi_dung.ho_so_khach_hang_id,
          dia_chi: nguoi_dung.dia_chi,
          so_cccd: nguoi_dung.so_cccd,
          trang_thai_xac_minh: nguoi_dung.trang_thai_xac_minh,
          ho_so_xac_minh_moi_nhat: nguoi_dung.ho_so_xac_minh_id
            ? {
                id: nguoi_dung.ho_so_xac_minh_id,
                so_cccd: nguoi_dung.ho_so_xac_minh_so_cccd,
                anh_mat_truoc_url: nguoi_dung.ho_so_xac_minh_anh_mat_truoc_url,
                anh_mat_sau_url: nguoi_dung.ho_so_xac_minh_anh_mat_sau_url,
                trang_thai: nguoi_dung.ho_so_xac_minh_trang_thai,
                ly_do_tu_choi: nguoi_dung.ho_so_xac_minh_ly_do_tu_choi,
                duyet_luc: nguoi_dung.ho_so_xac_minh_duyet_luc,
                created_at: nguoi_dung.ho_so_xac_minh_created_at,
              }
            : null,
        }
      : null,
  }));

  return {
    danh_sach,
    phan_trang: {
      trang_hien_tai,
      so_luong,
      tong: tong_so,
      tong_trang: Math.ceil(tong_so / so_luong),
    },
  };
}

// ============================================================
// GET CUSTOMER ACCOUNT DETAIL
// ============================================================
async function getCustomerAccountDetail(nguoi_dung_id) {
  const danh_sach_dong = await prisma.$queryRaw`
    SELECT
      u.id,
      u.ho_ten,
      u.email,
      u.so_dien_thoai,
      u.trang_thai,
      u.created_at,
      p.id as ho_so_khach_hang_id,
      p.dia_chi,
      p.so_cccd,
      p.trang_thai_xac_minh,
      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', v.id,
              'so_cccd', v.so_cccd,
              'anh_mat_truoc_url', v.anh_mat_truoc_url,
              'anh_mat_sau_url', v.anh_mat_sau_url,
              'trang_thai', v.trang_thai,
              'ly_do_tu_choi', v.ly_do_tu_choi,
              'duyet_luc', v.duyet_luc,
              'created_at', v.created_at
            )
            ORDER BY v.created_at DESC
          )
          FROM ho_so_xac_minh v
          WHERE v.khach_hang_id = p.id
        ),
        '[]'::json
      ) AS danh_sach_xac_minh
    FROM nguoi_dung u
    LEFT JOIN ho_so_khach_hang p ON p.nguoi_dung_id = u.id
    WHERE u.id = ${nguoi_dung_id}
      AND u.vai_tro = 'KHACH_HANG'
      AND u.da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (!danh_sach_dong || danh_sach_dong.length === 0) {
    const error = new Error("Không tìm thấy tài khoản khách hàng");
    error.statusCode = 404;
    throw error;
  }

  const nguoi_dung = danh_sach_dong[0];

  let danh_sach_xac_minh = [];
  if (nguoi_dung.danh_sach_xac_minh) {
    danh_sach_xac_minh = typeof nguoi_dung.danh_sach_xac_minh === 'string'
      ? JSON.parse(nguoi_dung.danh_sach_xac_minh)
      : nguoi_dung.danh_sach_xac_minh;
  }

  return {
    id: nguoi_dung.id,
    ho_ten: nguoi_dung.ho_ten,
    email: nguoi_dung.email,
    so_dien_thoai: nguoi_dung.so_dien_thoai,
    trang_thai: nguoi_dung.trang_thai,
    created_at: nguoi_dung.created_at,
    ho_so_khach_hang: nguoi_dung.ho_so_khach_hang_id
      ? {
          id: nguoi_dung.ho_so_khach_hang_id,
          dia_chi: nguoi_dung.dia_chi,
          so_cccd: nguoi_dung.so_cccd,
          trang_thai_xac_minh: nguoi_dung.trang_thai_xac_minh,
          danh_sach_xac_minh: danh_sach_xac_minh
            .filter((item) => item && item.id)
            .map((ho_so_xac_minh) => ({
              id: ho_so_xac_minh.id,
              so_cccd: ho_so_xac_minh.so_cccd || null,
              anh_mat_truoc_url: ho_so_xac_minh.anh_mat_truoc_url || null,
              anh_mat_sau_url: ho_so_xac_minh.anh_mat_sau_url || null,
              trang_thai: ho_so_xac_minh.trang_thai || null,
              ly_do_tu_choi: ho_so_xac_minh.ly_do_tu_choi || null,
              duyet_luc: ho_so_xac_minh.duyet_luc || null,
              created_at: ho_so_xac_minh.created_at || null,
            })),
        }
      : null,
  };
}

// ============================================================
// APPROVE VERIFICATION
// ============================================================
async function approveVerification(nguoi_dung_id, nhan_vien_id) {
  const { ho_so, ho_so_xac_minh } = await lay_ho_so_xac_minh_cho_duyet(nguoi_dung_id);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET trang_thai = 'DA_DUYET',
          nguoi_duyet_id = ${nhan_vien_id},
          duyet_luc = NOW()
      WHERE id = ${ho_so_xac_minh.id}
    `;

    await tx.$executeRaw`
      UPDATE ho_so_khach_hang
      SET trang_thai_xac_minh = 'DA_DUYET',
          so_cccd = ${ho_so_xac_minh.so_cccd},
          updated_at = NOW()
      WHERE id = ${ho_so.id}
    `;
  });

  return {
    message: "Duyệt hồ sơ xác minh thành công",
    trang_thai_xac_minh: "DA_DUYET",
  };
}

// ============================================================
// REJECT VERIFICATION
// ============================================================
async function rejectVerification(nguoi_dung_id, nhan_vien_id, ly_do_tu_choi) {
  const ly_do_tu_choi_su_dung = ly_do_tu_choi ? ly_do_tu_choi.trim() : "";

  if (!ly_do_tu_choi_su_dung) {
    const error = new Error("Bạn chưa nhập lý do từ chối");
    error.statusCode = 400;
    throw error;
  }

  const { ho_so, ho_so_xac_minh } = await lay_ho_so_xac_minh_cho_duyet(nguoi_dung_id);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE ho_so_xac_minh
      SET trang_thai = 'TU_CHOI',
          ly_do_tu_choi = ${ly_do_tu_choi_su_dung},
          nguoi_duyet_id = ${nhan_vien_id},
          duyet_luc = NOW()
      WHERE id = ${ho_so_xac_minh.id}
    `;

    await tx.$executeRaw`
      UPDATE ho_so_khach_hang
      SET trang_thai_xac_minh = 'TU_CHOI',
          updated_at = NOW()
      WHERE id = ${ho_so.id}
    `;
  });

  return {
    message: "Từ chối hồ sơ xác minh thành công",
    trang_thai_xac_minh: "TU_CHOI",
  };
}

module.exports = {
  getCustomerAccounts,
  getCustomerAccountDetail,
  approveVerification,
  rejectVerification,
  getAdminOrders,
  getAdminOrderDetail,
  getAvailableAssets,
};

// ============================================================
// GET ADMIN ORDERS (API #7)
// ============================================================
async function getAdminOrders({ trang = 1, gioi_han = 20, trang_thai, tu_khoa }) {
  const trang_so = Math.max(1, parseInt(trang, 10) || 1);
  const gioi_han_so = Math.min(100, Math.max(1, parseInt(gioi_han, 10) || 20));
  const vi_tri_bat_dau = (trang_so - 1) * gioi_han_so;

  // Xây dựng điều kiện WHERE động
  const dieu_kien = [];

  if (trang_thai) {
    dieu_kien.push(Prisma.sql`dt.trang_thai = ${trang_thai}`);
  }

  if (tu_khoa) {
    const mau_tim_kiem = `%${tu_khoa}%`;
    dieu_kien.push(
      Prisma.sql`(nd.ho_ten ILIKE ${mau_tim_kiem} OR dt.ma_don ILIKE ${mau_tim_kiem})`
    );
  }

  const menh_de_where = dieu_kien.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(dieu_kien, " AND ")}`
    : Prisma.empty;

  // Danh sách đơn + phân trang
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.ngay_nhan, dt.ngay_tra, dt.tong_tien_thue, dt.tong_tien_coc,
           dt.trang_thai, dt.created_at, dt.updated_at,
           hs.id AS ho_so_id, hs.trang_thai_xac_minh,
           nd.ho_ten, nd.email, nd.so_dien_thoai
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    ${menh_de_where}
    ORDER BY dt.created_at DESC
    LIMIT ${gioi_han_so} OFFSET ${vi_tri_bat_dau}
  `;

  // Đếm tổng
  const ket_qua_dem = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS tong_so
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    ${menh_de_where}
  `;
  const tong_so = ket_qua_dem[0]?.tong_so || 0;

  if (danh_sach_don.length === 0) {
    return {
      danh_sach: [],
      phan_trang: { trang: trang_so, gioi_han: gioi_han_so, tong_so },
    };
  }

  // Items (batch)
  const danh_sach_don_thue_id = danh_sach_don.map((d) => d.id);

  const danh_sach_chi_tiet = await prisma.$queryRaw`
    SELECT cdt.don_thue_id, cdt.id, cdt.mau_thiet_bi_id, cdt.so_luong, cdt.trang_thai,
           mtb.ten_mau, mtb.anh_url
    FROM chi_tiet_don_thue cdt
    JOIN mau_thiet_bi mtb ON mtb.id = cdt.mau_thiet_bi_id
    WHERE cdt.don_thue_id = ANY(${danh_sach_don_thue_id}::uuid[])
  `;

  // Payments (batch)
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT tt.don_thue_id, tt.id, tt.loai_thanh_toan, tt.so_tien, tt.phuong_thuc, tt.trang_thai
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
      trang_thai: ct.trang_thai,
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
    tong_tien_thue: don.tong_tien_thue,
    tong_tien_coc: don.tong_tien_coc,
    trang_thai: don.trang_thai,
    created_at: don.created_at,
    updated_at: don.updated_at,
    khach_hang: {
      ho_ten: don.ho_ten,
      email: don.email,
      so_dien_thoai: don.so_dien_thoai,
      trang_thai_xac_minh: don.trang_thai_xac_minh,
    },
    chi_tiet_don_thue: chi_tiet_theo_don[don.id] || [],
    thanh_toan: thanh_toan_theo_don[don.id] || [],
  }));

  return {
    danh_sach,
    phan_trang: { trang: trang_so, gioi_han: gioi_han_so, tong_so },
  };
}

// ============================================================
// GET ADMIN ORDER DETAIL (API #8)
// ============================================================
async function getAdminOrderDetail(don_thue_id) {
  // Đơn + khách hàng
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.*, hs.id AS ho_so_id, hs.dia_chi, hs.so_cccd, hs.trang_thai_xac_minh,
           nd.ho_ten, nd.email, nd.so_dien_thoai
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    WHERE dt.id = ${don_thue_id}::uuid
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

  // Thiết bị gán
  const danh_sach_thiet_bi_gan = await prisma.$queryRaw`
    SELECT tbgvd.*, tbvl.ma_tai_san, tbvl.so_serial, tbvl.ghi_chu_tinh_trang
    FROM thiet_bi_gan_voi_don tbgvd
    JOIN thiet_bi_vat_ly tbvl ON tbvl.id = tbgvd.thiet_bi_id
    WHERE tbgvd.don_thue_id = ${don_thue_id}::uuid
  `;

  // Phiếu bàn giao + chi tiết
  const danh_sach_phieu_ban_giao = await prisma.$queryRaw`
    SELECT pbv.*, nd.ho_ten AS nhan_vien
    FROM phieu_ban_giao pbv
    JOIN nguoi_dung nd ON nd.id = pbv.nhan_vien_id
    WHERE pbv.don_thue_id = ${don_thue_id}::uuid
  `;

  let danh_sach_chi_tiet_ban_giao = [];
  if (danh_sach_phieu_ban_giao.length > 0) {
    danh_sach_chi_tiet_ban_giao = await prisma.$queryRaw`
      SELECT ctbg.* FROM chi_tiet_ban_giao ctbg
      JOIN phieu_ban_giao pbv ON pbv.id = ctbg.phieu_ban_giao_id
      WHERE pbv.don_thue_id = ${don_thue_id}::uuid
    `;
  }

  // Phiếu trả + chi tiết + phí phát sinh
  const danh_sach_phieu_tra = await prisma.$queryRaw`
    SELECT ptt.*, nd.ho_ten AS nhan_vien
    FROM phieu_tra_thiet_bi ptt
    JOIN nguoi_dung nd ON nd.id = ptt.nhan_vien_id
    WHERE ptt.don_thue_id = ${don_thue_id}::uuid
  `;

  let danh_sach_chi_tiet_tra = [];
  let danh_sach_phi_phat_sinh = [];
  if (danh_sach_phieu_tra.length > 0) {
    danh_sach_chi_tiet_tra = await prisma.$queryRaw`
      SELECT cttb.* FROM chi_tiet_tra_thiet_bi cttb
      JOIN phieu_tra_thiet_bi ptt ON ptt.id = cttb.phieu_tra_id
      WHERE ptt.don_thue_id = ${don_thue_id}::uuid
    `;

    danh_sach_phi_phat_sinh = await prisma.$queryRaw`
      SELECT pps.* FROM phi_phat_sinh pps
      JOIN phieu_tra_thiet_bi ptt ON ptt.id = pps.phieu_tra_id
      WHERE ptt.don_thue_id = ${don_thue_id}::uuid
    `;
  }

  // Hợp đồng giấy
  const danh_sach_hop_dong = await prisma.$queryRaw`
    SELECT hdg.*, thd.ten_file_goc, thd.file_url
    FROM hop_dong_giay hdg
    LEFT JOIN tep_hop_dong thd ON thd.hop_dong_id = hdg.id
    WHERE hdg.don_thue_id = ${don_thue_id}::uuid
  `;

  // Thanh toán
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT id, loai_thanh_toan, so_tien, phuong_thuc, trang_thai, da_thanh_toan_luc
    FROM thanh_toan
    WHERE don_thue_id = ${don_thue_id}::uuid
  `;

  // Ảnh bàn giao + ảnh khi trả
  const danh_sach_tep = await prisma.$queryRaw`
    SELECT tdt.* FROM tep_don_thue tdt
    WHERE tdt.don_thue_id = ${don_thue_id}::uuid
      AND tdt.muc_dich IN ('ANH_BAN_GIAO', 'ANH_KHI_TRA')
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
      trang_thai_xac_minh: don.trang_thai_xac_minh,
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
    thiet_bi_gan_voi_don: danh_sach_thiet_bi_gan.map((tb) => ({
      id: tb.id,
      thiet_bi_id: tb.thiet_bi_id,
      ma_tai_san: tb.ma_tai_san,
      so_serial: tb.so_serial,
      trang_thai: tb.trang_thai,
      ghi_chu_tinh_trang: tb.ghi_chu_tinh_trang,
    })),
    phieu_ban_giao: danh_sach_phieu_ban_giao.length > 0
      ? {
          id: danh_sach_phieu_ban_giao[0].id,
          nhan_vien: danh_sach_phieu_ban_giao[0].nhan_vien,
          ban_giao_luc: danh_sach_phieu_ban_giao[0].ban_giao_luc,
          ghi_chu: danh_sach_phieu_ban_giao[0].ghi_chu,
          chi_tiet_ban_giao: danh_sach_chi_tiet_ban_giao,
        }
      : null,
    phieu_tra_thiet_bi: danh_sach_phieu_tra.length > 0
      ? {
          id: danh_sach_phieu_tra[0].id,
          nhan_vien: danh_sach_phieu_tra[0].nhan_vien,
          tra_luc: danh_sach_phieu_tra[0].tra_luc,
          ket_qua: danh_sach_phieu_tra[0].ket_qua,
          ket_qua_tien_coc: danh_sach_phieu_tra[0].ket_qua_tien_coc,
          so_tien_hoan_coc: danh_sach_phieu_tra[0].so_tien_hoan_coc,
          so_tien_khau_tru: danh_sach_phieu_tra[0].so_tien_khau_tru,
          chi_tiet_tra_thiet_bi: danh_sach_chi_tiet_tra,
          phi_phat_sinh: danh_sach_phi_phat_sinh,
        }
      : null,
    hop_dong_giay: danh_sach_hop_dong.length > 0
      ? {
          id: danh_sach_hop_dong[0].id,
          ma_hop_dong: danh_sach_hop_dong[0].ma_hop_dong,
          tep_hop_dong: danh_sach_hop_dong
            .filter((hd) => hd.file_url)
            .map((hd) => ({
              ten_file_goc: hd.ten_file_goc,
              file_url: hd.file_url,
            })),
        }
      : null,
    thanh_toan: danh_sach_thanh_toan.map((tt) => ({
      id: tt.id,
      loai_thanh_toan: tt.loai_thanh_toan,
      so_tien: tt.so_tien,
      phuong_thuc: tt.phuong_thuc,
      trang_thai: tt.trang_thai,
      da_thanh_toan_luc: tt.da_thanh_toan_luc,
    })),
    tep_don_thue: danh_sach_tep.map((tep) => ({
      id: tep.id,
      file_url: tep.file_url,
      ten_file_goc: tep.ten_file_goc,
      muc_dich: tep.muc_dich,
    })),
  };
}

// ============================================================
// GET AVAILABLE ASSETS (API #9)
// ============================================================
async function getAvailableAssets(don_thue_id) {
  // Kiểm tra đơn thuê tồn tại
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id FROM don_thue dt WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  // Lấy model IDs + số lượng từ đơn
  const danh_sach_mat_hang = await prisma.$queryRaw`
    SELECT cdt.mau_thiet_bi_id, cdt.so_luong, mtb.ten_mau, mtb.anh_url
    FROM chi_tiet_don_thue cdt
    JOIN mau_thiet_bi mtb ON mtb.id = cdt.mau_thiet_bi_id
    WHERE cdt.don_thue_id = ${don_thue_id}::uuid
  `;

  if (danh_sach_mat_hang.length === 0) {
    return {
      don_thue_id,
      danh_sach_mat_hang: [],
      tai_san_san_sang: [],
    };
  }

  // Lấy thiết bị sẵn sàng
  const danh_sach_model_id = danh_sach_mat_hang.map((mh) => mh.mau_thiet_bi_id);

  const tai_san_san_sang = await prisma.$queryRaw`
    SELECT tbvl.id, tbvl.ma_tai_san, tbvl.ten_tai_san, tbvl.so_serial,
           tbvl.mau_thiet_bi_id, tbvl.vi_tri_hien_tai_id, tbvl.ghi_chu_tinh_trang
    FROM thiet_bi_vat_ly tbvl
    WHERE tbvl.mau_thiet_bi_id = ANY(${danh_sach_model_id}::uuid[])
      AND tbvl.trang_thai = 'SAN_SANG'
      AND tbvl.da_xoa_luc IS NULL
  `;

  return {
    don_thue_id,
    danh_sach_mat_hang: danh_sach_mat_hang.map((mh) => ({
      mau_thiet_bi_id: mh.mau_thiet_bi_id,
      so_luong: mh.so_luong,
      ten_mau: mh.ten_mau,
      anh_url: mh.anh_url,
    })),
    tai_san_san_sang: tai_san_san_sang.map((ts) => ({
      id: ts.id,
      ma_tai_san: ts.ma_tai_san,
      ten_tai_san: ts.ten_tai_san,
      so_serial: ts.so_serial,
      mau_thiet_bi_id: ts.mau_thiet_bi_id,
      vi_tri_hien_tai_id: ts.vi_tri_hien_tai_id,
      ghi_chu_tinh_trang: ts.ghi_chu_tinh_trang,
    })),
  };
}
