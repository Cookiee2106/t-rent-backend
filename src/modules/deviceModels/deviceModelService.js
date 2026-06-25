const { Prisma } = require("@prisma/client");
const prisma = require("../../utils/prisma");

// ============================================================
// GET DEVICE MODELS
// Lấy danh sách mẫu thiết bị (chỉ HOAT_DONG)
// ============================================================
async function getDeviceModels({
  trang = 1,
  gioi_han = 20,
  tu_khoa,
  hang_id,
  danh_muc_id,
  ten_hang,
  ten_danh_muc,
}) {
  const trang_hien_tai = parseInt(trang) || 1;
  const so_luong = parseInt(gioi_han) || 20;
  const vi_tri_bat_dau = (trang_hien_tai - 1) * so_luong;

  // Base JOIN luon luon co
  const base_join = Prisma.sql`
    LEFT JOIN hang_thiet_bi h ON h.id = m.hang_id
    LEFT JOIN danh_muc_thiet_bi d ON d.id = m.danh_muc_id
  `;

  // Dieu kien loc dong - chi lay mau thiet bi HOAT_DONG
  const dieu_kien = [
    Prisma.sql`m.da_xoa_luc IS NULL`,
    Prisma.sql`m.trang_thai = 'HOAT_DONG'`,
  ];

  if (tu_khoa) {
    const mau_tim_kiem = `%${tu_khoa}%`;
    dieu_kien.push(
      Prisma.sql`(m.ten_mau ILIKE ${mau_tim_kiem} OR m.mo_ta ILIKE ${mau_tim_kiem})`
    );
  }

  if (hang_id) {
    dieu_kien.push(Prisma.sql`m.hang_id = ${hang_id}`);
  }

  if (danh_muc_id) {
    dieu_kien.push(Prisma.sql`m.danh_muc_id = ${danh_muc_id}`);
  }

  if (ten_hang) {
    const mau_ten_hang = `%${ten_hang}%`;
    dieu_kien.push(Prisma.sql`h.ten_hang ILIKE ${mau_ten_hang}`);
  }

  if (ten_danh_muc) {
    const mau_ten_danh_muc = `%${ten_danh_muc}%`;
    dieu_kien.push(Prisma.sql`d.ten_danh_muc ILIKE ${mau_ten_danh_muc}`);
  }

  const menh_de_where = Prisma.sql`
    WHERE ${Prisma.join(dieu_kien, " AND ")}
  `;

  // Query danh sach
  const danh_sach_mau_thiet_bi = await prisma.$queryRaw`
    SELECT
      m.id,
      m.ten_mau,
      m.mo_ta,
      m.anh_url,
      m.gia_thue_ngay,
      m.tien_coc,
      m.trang_thai,
      m.created_at,
      m.updated_at,
      h.id as hang_id,
      h.ten_hang,
      d.id as danh_muc_id,
      d.ten_danh_muc
    FROM mau_thiet_bi m
    ${base_join}
    ${menh_de_where}
    ORDER BY m.created_at DESC
    LIMIT ${so_luong}
    OFFSET ${vi_tri_bat_dau}
  `;

  // Query dem tong
  const ket_qua_dem = await prisma.$queryRaw`
    SELECT COUNT(*) as tong_so
    FROM mau_thiet_bi m
    ${base_join}
    ${menh_de_where}
  `;
  const tong_so = parseInt(ket_qua_dem[0]?.tong_so || 0);

  // Response - dung field DB tieng Viet
  const danh_sach = danh_sach_mau_thiet_bi.map((mau) => ({
    id: mau.id,
    ten_mau: mau.ten_mau,
    mo_ta: mau.mo_ta,
    anh_url: mau.anh_url,
    gia_thue_ngay: parseFloat(mau.gia_thue_ngay),
    tien_coc: parseFloat(mau.tien_coc),
    trang_thai: mau.trang_thai,
    created_at: mau.created_at,
    updated_at: mau.updated_at,
    hang_thiet_bi: mau.hang_id
      ? {
          id: mau.hang_id,
          ten_hang: mau.ten_hang,
        }
      : null,
    danh_muc_thiet_bi: mau.danh_muc_id
      ? {
          id: mau.danh_muc_id,
          ten_danh_muc: mau.ten_danh_muc,
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
// GET DEVICE MODEL DETAIL
// Lấy chi tiết một mẫu thiết bị (chỉ HOAT_DONG)
// ============================================================
async function getDeviceModelDetail(mau_thiet_bi_id) {
  // Lấy mẫu thiết bị với hãng và danh mục
  const danh_sach_mau_thiet_bi = await prisma.$queryRaw`
    SELECT
      m.id,
      m.ten_mau,
      m.mo_ta,
      m.anh_url,
      m.gia_thue_ngay,
      m.tien_coc,
      m.trang_thai,
      m.created_at,
      m.updated_at,
      h.id as hang_id,
      h.ten_hang,
      d.id as danh_muc_id,
      d.ten_danh_muc
    FROM mau_thiet_bi m
    LEFT JOIN hang_thiet_bi h ON h.id = m.hang_id
    LEFT JOIN danh_muc_thiet_bi d ON d.id = m.danh_muc_id
    WHERE m.id = ${mau_thiet_bi_id}
      AND m.da_xoa_luc IS NULL
      AND m.trang_thai = 'HOAT_DONG'
    LIMIT 1
  `;

  if (!danh_sach_mau_thiet_bi || danh_sach_mau_thiet_bi.length === 0) {
    const error = new Error("Không tìm thấy mẫu thiết bị");
    error.statusCode = 404;
    throw error;
  }

  const mau_thiet_bi = danh_sach_mau_thiet_bi[0];

  // Lấy bộ đi kèm (bo_di_kem)
  const danh_sach_bo_di_kem = await prisma.$queryRaw`
    SELECT
      b.id,
      COALESCE(pk.ten_phu_kien, mtb.ten_mau, b.ten_thanh_phan) as ten_thanh_phan,
      b.so_luong,
      b.loai_quan_ly,
      b.bat_buoc,
      b.ghi_chu
    FROM bo_di_kem b
    LEFT JOIN phu_kien pk ON pk.id = b.phu_kien_id
    LEFT JOIN mau_thiet_bi mtb ON mtb.id = b.mau_thiet_bi_thanh_phan_id
    WHERE b.mau_thiet_bi_id = ${mau_thiet_bi_id}
    ORDER BY b.so_luong DESC
  `;

  // Map bo_di_kem - dung field tieng Viet theo DB
  const bo_di_kem = danh_sach_bo_di_kem.map((thanh_phan) => ({
    id: thanh_phan.id,
    ten_thanh_phan: thanh_phan.ten_thanh_phan,
    so_luong: thanh_phan.so_luong,
    loai_quan_ly: thanh_phan.loai_quan_ly,
    bat_buoc: thanh_phan.bat_buoc,
    ghi_chu: thanh_phan.ghi_chu,
  }));

  return {
    id: mau_thiet_bi.id,
    ten_mau: mau_thiet_bi.ten_mau,
    mo_ta: mau_thiet_bi.mo_ta,
    anh_url: mau_thiet_bi.anh_url,
    gia_thue_ngay: parseFloat(mau_thiet_bi.gia_thue_ngay),
    tien_coc: parseFloat(mau_thiet_bi.tien_coc),
    trang_thai: mau_thiet_bi.trang_thai,
    created_at: mau_thiet_bi.created_at,
    updated_at: mau_thiet_bi.updated_at,
    hang_thiet_bi: mau_thiet_bi.hang_id
      ? {
          id: mau_thiet_bi.hang_id,
          ten_hang: mau_thiet_bi.ten_hang,
        }
      : null,
    danh_muc_thiet_bi: mau_thiet_bi.danh_muc_id
      ? {
          id: mau_thiet_bi.danh_muc_id,
          ten_danh_muc: mau_thiet_bi.ten_danh_muc,
        }
      : null,
    bo_di_kem,
  };
}

module.exports = {
  getDeviceModels,
  getDeviceModelDetail,
};
