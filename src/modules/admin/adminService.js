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
};
