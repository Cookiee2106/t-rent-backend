const prisma = require("../../config/prisma");

async function layDanhSachHoSoXacMinhService(query) {
  const tuKhoa = query.tu_khoa || "";
  const mauTimKiem = `%${tuKhoa}%`;
  const trangThai = Number(query.trang_thai) || 0;

  const danhSachHoSo = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui

    FROM ho_so_xac_minh hs

    JOIN nguoi_dung nd
      ON nd.id = hs.khach_hang_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = hs.trang_thai

    WHERE nd.da_xoa_luc IS NULL
      AND (
        ${tuKhoa} = ''
        OR nd.ho_ten ILIKE ${mauTimKiem}
        OR nd.email ILIKE ${mauTimKiem}
        OR nd.so_dien_thoai ILIKE ${mauTimKiem}
        OR hs.so_cccd ILIKE ${mauTimKiem}
      )
      AND (
        ${trangThai}::int = 0
        OR hs.trang_thai = ${trangThai}::int
      )

    ORDER BY hs.created_at DESC
  `;

  return danhSachHoSo;
}

async function layChiTietHoSoXacMinhService(hoSoId) {
  const danhSachHoSo = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui

    FROM ho_so_xac_minh hs

    JOIN nguoi_dung nd
      ON nd.id = hs.khach_hang_id

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = hs.trang_thai

    WHERE hs.id = ${hoSoId}::uuid
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (danhSachHoSo.length === 0) {
    throw new Error("Không tìm thấy hồ sơ xác minh");
  }

  return danhSachHoSo[0];
}

async function duyetHoSoXacMinhService(hoSoId, nguoiDuyetId) {
  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể duyệt hồ sơ đang chờ duyệt");
  }

  await prisma.$executeRaw`
    UPDATE ho_so_xac_minh
    SET
      trang_thai = 203,
      ly_do_tu_choi = NULL,
      nguoi_duyet_id = ${nguoiDuyetId}::uuid,
      duyet_luc = NOW()
    WHERE id = ${hoSoId}::uuid
  `;

  await prisma.$executeRaw`
    UPDATE nguoi_dung
    SET
      trang_thai_xac_minh = 203,
      updated_at = NOW()
    WHERE id = ${hoSo.khach_hang_id}::uuid
  `;

  return layChiTietHoSoXacMinhService(hoSoId);
}

async function tuChoiHoSoXacMinhService(hoSoId, nguoiDuyetId, lyDoTuChoi) {
  if (!lyDoTuChoi || !lyDoTuChoi.trim()) {
    throw new Error("Vui lòng nhập lý do từ chối");
  }

  const hoSo = await layChiTietHoSoXacMinhService(hoSoId);

  if (Number(hoSo.trang_thai) !== 202) {
    throw new Error("Chỉ có thể từ chối hồ sơ đang chờ duyệt");
  }

  await prisma.$executeRaw`
    UPDATE ho_so_xac_minh
    SET
      trang_thai = 204,
      ly_do_tu_choi = ${lyDoTuChoi},
      nguoi_duyet_id = ${nguoiDuyetId}::uuid,
      duyet_luc = NOW()
    WHERE id = ${hoSoId}::uuid
  `;

  await prisma.$executeRaw`
    UPDATE nguoi_dung
    SET
      trang_thai_xac_minh = 204,
      updated_at = NOW()
    WHERE id = ${hoSo.khach_hang_id}::uuid
  `;

  return layChiTietHoSoXacMinhService(hoSoId);
}

async function layDanhSachKhachHangService(query) {
  const tuKhoa = query.tu_khoa || "";
  const mauTimKiem = `%${tuKhoa}%`;
  const trangThai = Number(query.trang_thai) || 0;

  const tuNgayGui = query.tu_ngay_gui || null;
  const denNgayGui = query.den_ngay_gui || null;
  const sapXepNgayGui = query.sap_xep_ngay_gui || "moi_nhat";

  const danhSachKhachHang = await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,
      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh,
      hs.id AS ho_so_xac_minh_id,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai AS trang_thai_ho_so,
      tt_hs.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.duyet_luc,
      hs.created_at AS ngay_gui,
      nd.created_at

    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh

    LEFT JOIN LATERAL (
      SELECT *
      FROM ho_so_xac_minh
      WHERE khach_hang_id = nd.id
      ORDER BY created_at DESC
      LIMIT 1
    ) hs ON TRUE

    LEFT JOIN trang_thai_he_thong tt_hs
      ON tt_hs.id = hs.trang_thai

    WHERE nd.vai_tro = 'KHACH_HANG'
      AND nd.da_xoa_luc IS NULL

      AND (
        ${tuKhoa} = ''
        OR nd.ho_ten ILIKE ${mauTimKiem}
        OR nd.email ILIKE ${mauTimKiem}
        OR nd.so_dien_thoai ILIKE ${mauTimKiem}
        OR hs.so_cccd ILIKE ${mauTimKiem}
      )

      AND (
        ${trangThai}::int = 0
        OR nd.trang_thai_xac_minh = ${trangThai}::int
      )

      AND (
        ${tuNgayGui}::date IS NULL
        OR hs.created_at::date >= ${tuNgayGui}::date
      )

      AND (
        ${denNgayGui}::date IS NULL
        OR hs.created_at::date <= ${denNgayGui}::date
      )

    ORDER BY
      CASE 
        WHEN ${sapXepNgayGui} = 'cu_nhat'
        THEN COALESCE(hs.created_at, nd.created_at)
      END ASC,

      CASE 
        WHEN ${sapXepNgayGui} <> 'cu_nhat'
        THEN COALESCE(hs.created_at, nd.created_at)
      END DESC
  `;

  return danhSachKhachHang;
}

async function layChiTietKhachHangService(khachHangId) {
  const danhSachKhachHang = await prisma.$queryRaw`
    SELECT
      nd.id,
      nd.ho_ten,
      nd.email,
      nd.so_dien_thoai,
      nd.dia_chi,
      nd.trang_thai,
      tt_tk.ten_trang_thai AS ten_trang_thai_tai_khoan,
      nd.trang_thai_xac_minh,
      tt_xm.ten_trang_thai AS ten_trang_thai_xac_minh,
      hs.id AS ho_so_xac_minh_id,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai AS trang_thai_ho_so,
      tt_hs.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      hs.duyet_luc,
      hs.created_at AS ngay_gui,
      nd.created_at

    FROM nguoi_dung nd

    LEFT JOIN trang_thai_he_thong tt_tk
      ON tt_tk.id = nd.trang_thai

    LEFT JOIN trang_thai_he_thong tt_xm
      ON tt_xm.id = nd.trang_thai_xac_minh

    LEFT JOIN LATERAL (
      SELECT *
      FROM ho_so_xac_minh
      WHERE khach_hang_id = nd.id
      ORDER BY created_at DESC
      LIMIT 1
    ) hs ON TRUE

    LEFT JOIN trang_thai_he_thong tt_hs
      ON tt_hs.id = hs.trang_thai

    WHERE nd.id = ${khachHangId}::uuid
      AND nd.vai_tro = 'KHACH_HANG'
      AND nd.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (danhSachKhachHang.length === 0) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return danhSachKhachHang[0];
}

async function layDanhSachNhatKyThaoTacService(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 10, 1);
  const offset = (page - 1) * limit;

  const nguoiDungId = query.nguoi_dung_id || null;
  const hanhDong = (query.hanh_dong || "").trim();
  const from = query.from || null;
  const to = query.to || null;

  if ((from && !to) || (!from && to)) {
    throw new Error("Cần truyền đồng thời cả from và to");
  }

  if (from && to) {
    const ngayBatDau = new Date(from);
    const ngayKetThuc = new Date(to);

    if (
      Number.isNaN(ngayBatDau.getTime()) ||
      Number.isNaN(ngayKetThuc.getTime())
    ) {
      throw new Error("from hoặc to không hợp lệ");
    }

    if (ngayBatDau > ngayKetThuc) {
      throw new Error("from không được lớn hơn to");
    }
  }

  const mauHanhDong = `%${hanhDong}%`;

  const danhSach = await prisma.$queryRaw`
    SELECT
      nk.id,
      nk.nguoi_dung_id,
      nd.ho_ten AS ten_nguoi_dung,
      nd.email,
      nd.vai_tro,
      nk.hanh_dong,
      nk.doi_tuong,
      nk.doi_tuong_id,
      nk.noi_dung,
      nk.ip_address,
      nk.created_at
    FROM nhat_ky_thao_tac nk
    LEFT JOIN nguoi_dung nd ON nd.id = nk.nguoi_dung_id
    WHERE (
      ${nguoiDungId}::uuid IS NULL
      OR nk.nguoi_dung_id = ${nguoiDungId}::uuid
    )
      AND (
        ${hanhDong} = ''
        OR nk.hanh_dong ILIKE ${mauHanhDong}
      )
      AND (
        ${from}::date IS NULL
        OR nk.created_at::date >= ${from}::date
      )
      AND (
        ${to}::date IS NULL
        OR nk.created_at::date <= ${to}::date
      )
    ORDER BY nk.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const demKetQua = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM nhat_ky_thao_tac nk
    WHERE (
      ${nguoiDungId}::uuid IS NULL
      OR nk.nguoi_dung_id = ${nguoiDungId}::uuid
    )
      AND (
        ${hanhDong} = ''
        OR nk.hanh_dong ILIKE ${mauHanhDong}
      )
      AND (
        ${from}::date IS NULL
        OR nk.created_at::date >= ${from}::date
      )
      AND (
        ${to}::date IS NULL
        OR nk.created_at::date <= ${to}::date
      )
  `;

  return {
    data: danhSach,
    total: Number(demKetQua[0]?.total || 0),
    page,
    limit,
  };
}

async function layChiTietNhatKyThaoTacService(nhatKyId) {
  const danhSach = await prisma.$queryRaw`
    SELECT
      nk.id,
      nk.nguoi_dung_id,
      nd.ho_ten AS ten_nguoi_dung,
      nd.email,
      nd.so_dien_thoai,
      nd.vai_tro,
      nk.hanh_dong,
      nk.doi_tuong,
      nk.doi_tuong_id,
      nk.noi_dung,
      nk.du_lieu_truoc,
      nk.du_lieu_sau,
      nk.ip_address,
      nk.created_at
    FROM nhat_ky_thao_tac nk
    LEFT JOIN nguoi_dung nd ON nd.id = nk.nguoi_dung_id
    WHERE nk.id = ${nhatKyId}::uuid
    LIMIT 1
  `;

  if (danhSach.length === 0) {
    throw new Error("Không tìm thấy nhật ký thao tác");
  }

  return danhSach[0];
}

/*
  KHÓA / MỞ KHÓA TÀI KHOẢN KHÁCH HÀNG
*/
async function capNhatTrangThaiKhachHangService(khachHangId, trangThaiMoi) {
  const TRANG_THAI_HOAT_DONG = 101;
  const TRANG_THAI_BI_KHOA = 102;

  const trangThai = Number(trangThaiMoi);

  if (
    trangThai !== TRANG_THAI_HOAT_DONG &&
    trangThai !== TRANG_THAI_BI_KHOA
  ) {
    throw new Error("Trạng thái tài khoản không hợp lệ");
  }

  const danhSachKhachHang = await prisma.$queryRaw`
    UPDATE nguoi_dung
    SET
      trang_thai = ${trangThai},
      updated_at = NOW()
    WHERE id = ${khachHangId}::uuid
      AND vai_tro = 'KHACH_HANG'
      AND da_xoa_luc IS NULL
    RETURNING
      id,
      ho_ten,
      email,
      so_dien_thoai,
      dia_chi,
      trang_thai
  `;

  if (danhSachKhachHang.length === 0) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return danhSachKhachHang[0];
}

async function layBaoCaoDoanhThuService(query = {}) {
  const tuNgay = query.from || null;
  const denNgay = query.to || null;

  if ((tuNgay && !denNgay) || (!tuNgay && denNgay)) {
    throw new Error("Cần truyền đồng thời cả from và to");
  }

  if (tuNgay && denNgay) {
    const ngayBatDau = new Date(tuNgay);
    const ngayKetThuc = new Date(denNgay);

    if (
      Number.isNaN(ngayBatDau.getTime()) ||
      Number.isNaN(ngayKetThuc.getTime())
    ) {
      throw new Error("from hoặc to không hợp lệ");
    }

    if (ngayBatDau > ngayKetThuc) {
      throw new Error("from không được lớn hơn to");
    }
  }

  const danhSachGiaoDich = await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.don_thue_id,
      dt.ma_don,
      dt.trang_thai,
      tths.ten_trang_thai,
      nd.id AS khach_hang_id,
      nd.ho_ten AS ten_khach_hang,
      tt.so_tien::text AS so_tien,
      tt.created_at
    FROM thanh_toan tt
    JOIN don_thue dt ON dt.id = tt.don_thue_id
    JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tths ON tths.id = dt.trang_thai
    WHERE tt.loai_dong_tien_id = 2302
      AND dt.trang_thai IN (1103, 1104)
      AND (
        ${tuNgay}::date IS NULL
        OR tt.created_at::date >= ${tuNgay}::date
      )
      AND (
        ${denNgay}::date IS NULL
        OR tt.created_at::date <= ${denNgay}::date
      )
    ORDER BY tt.created_at DESC
  `;

  const tongDoanhThu = danhSachGiaoDich.reduce((tong, item) => {
    return tong + Number(item.so_tien || 0);
  }, 0);

  const tongDonThue = new Set(
    danhSachGiaoDich.map((item) => item.don_thue_id)
  ).size;

  return {
    from: tuNgay,
    to: denNgay,
    total_revenue: tongDoanhThu,
    total_transactions: danhSachGiaoDich.length,
    total_orders: tongDonThue,
    data: danhSachGiaoDich.map((item) => ({
      ...item,
      so_tien: Number(item.so_tien),
    })),
  };
}

async function layBaoCaoTonKhoService() {
  const [tongQuanThietBi] = await prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT mtb.id) FILTER (WHERE mtb.da_xoa_luc IS NULL)::int AS total_models,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL)::int AS total_physical_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 501)::int AS ready_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 502)::int AS renting_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 503)::int AS maintaining_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 504)::int AS liquidated_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 505)::int AS lost_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 506)::int AS damaged_devices
    FROM mau_thiet_bi mtb
    LEFT JOIN thiet_bi_vat_ly tbvl ON tbvl.mau_thiet_bi_id = mtb.id
    WHERE mtb.da_xoa_luc IS NULL
  `;

  const [tongQuanPhuKien] = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE da_xoa_luc IS NULL)::int AS total_accessories,
      COALESCE(SUM(tong_so_luong) FILTER (WHERE da_xoa_luc IS NULL), 0)::int AS total_accessory_units
    FROM phu_kien
  `;

  const danhSachDanhMuc = await prisma.$queryRaw`
    SELECT
      dmtb.id,
      dmtb.ten_danh_muc,
      COUNT(DISTINCT mtb.id)::int AS total_models,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL)::int AS total_physical_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 501)::int AS ready_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 502)::int AS renting_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 503)::int AS maintaining_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 504)::int AS liquidated_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 505)::int AS lost_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 506)::int AS damaged_devices
    FROM danh_muc_thiet_bi dmtb
    LEFT JOIN mau_thiet_bi mtb
      ON mtb.danh_muc_id = dmtb.id
      AND mtb.da_xoa_luc IS NULL
    LEFT JOIN thiet_bi_vat_ly tbvl
      ON tbvl.mau_thiet_bi_id = mtb.id
    WHERE dmtb.da_xoa_luc IS NULL
    GROUP BY dmtb.id, dmtb.ten_danh_muc, dmtb.created_at
    ORDER BY dmtb.created_at ASC
  `;

  const danhSachMau = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dmtb.id AS danh_muc_id,
      dmtb.ten_danh_muc,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL)::int AS total_physical_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 501)::int AS ready_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 502)::int AS renting_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 503)::int AS maintaining_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 504)::int AS liquidated_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 505)::int AS lost_devices,
      COUNT(tbvl.id) FILTER (WHERE tbvl.da_xoa_luc IS NULL AND tbvl.trang_thai = 506)::int AS damaged_devices
    FROM mau_thiet_bi mtb
    JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
    LEFT JOIN thiet_bi_vat_ly tbvl ON tbvl.mau_thiet_bi_id = mtb.id
    WHERE mtb.da_xoa_luc IS NULL
      AND dmtb.da_xoa_luc IS NULL
    GROUP BY
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dmtb.id,
      dmtb.ten_danh_muc,
      mtb.created_at
    ORDER BY mtb.created_at ASC
  `;

  const danhSachTrangThai = await prisma.$queryRaw`
    SELECT
      tbvl.trang_thai,
      tths.ten_trang_thai,
      COUNT(*)::int AS so_luong
    FROM thiet_bi_vat_ly tbvl
    LEFT JOIN trang_thai_he_thong tths ON tths.id = tbvl.trang_thai
    WHERE tbvl.da_xoa_luc IS NULL
    GROUP BY tbvl.trang_thai, tths.ten_trang_thai, tths.thu_tu
    ORDER BY tths.thu_tu ASC, tbvl.trang_thai ASC
  `;

  const danhSachPhuKien = await prisma.$queryRaw`
    SELECT
      id,
      ten_phu_kien,
      ten_hang,
      tong_so_luong,
      vi_tri_luu_tru,
      ghi_chu,
      updated_at
    FROM phu_kien
    WHERE da_xoa_luc IS NULL
    ORDER BY updated_at DESC, ten_phu_kien ASC
  `;

  return {
    summary: {
      total_categories: danhSachDanhMuc.length,
      total_models: Number(tongQuanThietBi?.total_models || 0),
      total_physical_devices: Number(tongQuanThietBi?.total_physical_devices || 0),
      ready_devices: Number(tongQuanThietBi?.ready_devices || 0),
      renting_devices: Number(tongQuanThietBi?.renting_devices || 0),
      maintaining_devices: Number(tongQuanThietBi?.maintaining_devices || 0),
      liquidated_devices: Number(tongQuanThietBi?.liquidated_devices || 0),
      lost_devices: Number(tongQuanThietBi?.lost_devices || 0),
      damaged_devices: Number(tongQuanThietBi?.damaged_devices || 0),
      total_accessories: Number(tongQuanPhuKien?.total_accessories || 0),
      total_accessory_units: Number(tongQuanPhuKien?.total_accessory_units || 0),
    },
    device_status_overview: danhSachTrangThai.map((item) => ({
      ...item,
      so_luong: Number(item.so_luong),
    })),
    categories: danhSachDanhMuc.map((item) => ({
      ...item,
      total_models: Number(item.total_models),
      total_physical_devices: Number(item.total_physical_devices),
      ready_devices: Number(item.ready_devices),
      renting_devices: Number(item.renting_devices),
      maintaining_devices: Number(item.maintaining_devices),
      liquidated_devices: Number(item.liquidated_devices),
      lost_devices: Number(item.lost_devices),
      damaged_devices: Number(item.damaged_devices),
    })),
    models: danhSachMau.map((item) => ({
      ...item,
      total_physical_devices: Number(item.total_physical_devices),
      ready_devices: Number(item.ready_devices),
      renting_devices: Number(item.renting_devices),
      maintaining_devices: Number(item.maintaining_devices),
      liquidated_devices: Number(item.liquidated_devices),
      lost_devices: Number(item.lost_devices),
      damaged_devices: Number(item.damaged_devices),
    })),
    accessories: danhSachPhuKien.map((item) => ({
      ...item,
      tong_so_luong: Number(item.tong_so_luong),
    })),
  };
}

/*
  XEM LỊCH SỬ HỒ SƠ XÁC MINH
*/

/*
async function layLichSuHoSoXacMinhService(khachHangId) {
  const danhSachHoSo = await prisma.$queryRaw`
    SELECT
      hs.id,
      hs.khach_hang_id,
      hs.so_cccd,
      hs.anh_mat_truoc_url,
      hs.anh_mat_sau_url,
      hs.anh_cam_cccd_url,
      hs.trang_thai AS trang_thai_ho_so,
      tt.ten_trang_thai AS ten_trang_thai_ho_so,
      hs.ly_do_tu_choi,
      hs.nguoi_duyet_id,
      nd.ho_ten AS ten_nguoi_duyet,
      hs.duyet_luc,
      hs.created_at AS ngay_gui
    FROM ho_so_xac_minh hs

    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = hs.trang_thai

    LEFT JOIN nguoi_dung nd
      ON nd.id = hs.nguoi_duyet_id

    WHERE hs.khach_hang_id = ${khachHangId}::uuid

    ORDER BY hs.created_at DESC
  `;

  return danhSachHoSo;
}
*/

module.exports = {
  layDanhSachHoSoXacMinhService,
  layChiTietHoSoXacMinhService,
  duyetHoSoXacMinhService,
  tuChoiHoSoXacMinhService,
  layDanhSachKhachHangService,
  layChiTietKhachHangService,
  capNhatTrangThaiKhachHangService,
  layBaoCaoDoanhThuService,
  layBaoCaoTonKhoService,
  layDanhSachNhatKyThaoTacService,
  layChiTietNhatKyThaoTacService,

  // XEM LỊCH SỬ HỒ SƠ XÁC MINH
  // layLichSuHoSoXacMinhService,
};
