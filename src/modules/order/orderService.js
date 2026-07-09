const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");

// -------------------------------------------------------
// 1. GET /admin/orders — Danh sách đơn thuê
// -------------------------------------------------------
async function layDanhSachDonThueService({ trang_thai, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  let donThue;
  let demKetQua;

  // Tách 2 query rõ ràng thay vì dùng null::int trong điều kiện
  if (trang_thai) {
    donThue = await prisma.$queryRaw`
      SELECT
        dt.id,
        dt.ma_don,
        nd.ho_ten AS ten_khach_hang,
        nd.email AS email_khach_hang,
        nd.so_dien_thoai AS sdt_khach_hang,
        dt.ngay_nhan,
        dt.ngay_tra,
        dt.so_ngay_thue,
        dt.tong_tien_thue::text,
        dt.tong_tien_coc::text,
        dt.trang_thai,
        tths.ten_trang_thai,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        dt.created_at
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      LEFT JOIN trang_thai_he_thong tths ON tths.id = dt.trang_thai
      WHERE dt.trang_thai = ${trang_thai}
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    demKetQua = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total FROM don_thue WHERE trang_thai = ${trang_thai}
    `;
  } else {
    donThue = await prisma.$queryRaw`
      SELECT
        dt.id,
        dt.ma_don,
        nd.ho_ten AS ten_khach_hang,
        nd.email AS email_khach_hang,
        nd.so_dien_thoai AS sdt_khach_hang,
        dt.ngay_nhan,
        dt.ngay_tra,
        dt.so_ngay_thue,
        dt.tong_tien_thue::text,
        dt.tong_tien_coc::text,
        dt.trang_thai,
        tths.ten_trang_thai,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        dt.created_at
      FROM don_thue dt
      JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
      LEFT JOIN trang_thai_he_thong tths ON tths.id = dt.trang_thai
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    demKetQua = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total FROM don_thue
    `;
  }

  return {
    data: donThue.map((r) => ({
      ...r,
      tong_tien_thue: Number(r.tong_tien_thue),
      tong_tien_coc: Number(r.tong_tien_coc),
    })),
    total: demKetQua[0]?.total || 0,
    page: Number(page),
    limit: Number(limit),
  };
}

// -------------------------------------------------------
// 2. GET /admin/orders/:id — Chi tiết đơn thuê
// -------------------------------------------------------
async function layChiTietDonThueService(donThueId) {
  const donResult = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      nd.ho_ten AS ten_khach_hang,
      nd.email AS email_khach_hang,
      nd.so_dien_thoai AS sdt_khach_hang,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text,
      dt.tong_tien_coc::text,
      dt.trang_thai,
      tths.ten_trang_thai,
      dt.huy_luc,
      dt.ly_do_huy,
      dt.ban_giao_luc,
      nd_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,
      dt.tra_luc,
      nd_tr.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,
      dt.phi_phat_sinh_ly_do,
      dt.phi_phat_sinh_tien::text,
      dt.created_at
    FROM don_thue dt
    JOIN nguoi_dung nd ON nd.id = dt.khach_hang_id
    LEFT JOIN trang_thai_he_thong tths ON tths.id = dt.trang_thai
    LEFT JOIN nguoi_dung nd_bg ON nd_bg.id = dt.nguoi_ban_giao_id
    LEFT JOIN nguoi_dung nd_tr ON nd_tr.id = dt.nguoi_nhan_tra_id
    WHERE dt.id = ${donThueId}::uuid
    LIMIT 1
  `;

  if (donResult.length === 0) {
    throw new Error("Đơn thuê không tồn tại");
  }

  const don = donResult[0];

  const chiTiet = await prisma.$queryRaw`
    SELECT
      ctdt.id,
      ctdt.mau_thiet_bi_id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text,
      ctdt.tien_coc_snapshot::text,
      ctdt.tien_thue::text,
      ctdt.tien_coc::text
    FROM chi_tiet_don_thue ctdt
    JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
    WHERE ctdt.don_thue_id = ${donThueId}::uuid
  `;

  const vatPhamBanGiao = await prisma.$queryRaw`
    SELECT
      bgvp.id,
      bgvp.chi_tiet_don_thue_id,
      bgvp.thiet_bi_id,
      tbvl.ma_tai_san,
      tbvl.so_serial,
      bgvp.phu_kien_id,
      pk.ten_phu_kien,
      bgvp.ten_vat_pham_snapshot,
      bgvp.ma_tai_san_snapshot,
      bgvp.so_serial_snapshot,
      bgvp.so_luong_giao,
      bgvp.tinh_trang_truoc
    FROM ban_giao_vat_pham bgvp
    LEFT JOIN thiet_bi_vat_ly tbvl ON tbvl.id = bgvp.thiet_bi_id
    LEFT JOIN phu_kien pk ON pk.id = bgvp.phu_kien_id
    WHERE bgvp.chi_tiet_don_thue_id = ANY(
      SELECT id FROM chi_tiet_don_thue WHERE don_thue_id = ${donThueId}::uuid
    )
  `;

  const thanhToan = await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text,
      tt.loai_dong_tien_id,
      dmhs.ten_danh_muc AS ten_loai_dong_tien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at
    FROM thanh_toan tt
    LEFT JOIN danh_muc_he_thong dmhs ON dmhs.id = tt.loai_dong_tien_id
    WHERE tt.don_thue_id = ${donThueId}::uuid
    ORDER BY tt.created_at ASC
  `;

  return {
    ...don,
    tong_tien_thue: Number(don.tong_tien_thue),
    tong_tien_coc: Number(don.tong_tien_coc),
    phi_phat_sinh_tien: Number(don.phi_phat_sinh_tien),
    chi_tiet: chiTiet.map((c) => ({
      ...c,
      so_luong: Number(c.so_luong),
      gia_thue_ngay_snapshot: Number(c.gia_thue_ngay_snapshot),
      tien_coc_snapshot: Number(c.tien_coc_snapshot),
      tien_thue: Number(c.tien_thue),
      tien_coc: Number(c.tien_coc),
    })),
    vat_pham_ban_giao: vatPhamBanGiao.map((v) => ({
      ...v,
      so_luong_giao: Number(v.so_luong_giao),
    })),
    thanh_toan: thanhToan.map((t) => ({
      ...t,
      so_tien: Number(t.so_tien),
    })),
  };
}

// -------------------------------------------------------
// 3. GET /admin/assets/available — Thiết bị sẵn sàng để bàn giao
// -------------------------------------------------------
async function layThietBiSanSangService({ mau_thiet_bi_id, ngay_nhan, ngay_tra }) {
  if (!mau_thiet_bi_id) {
    throw new Error("Thiếu mau_thiet_bi_id");
  }

  if (ngay_nhan && ngay_tra) {
    const dateNhan = new Date(ngay_nhan);
    const dateTra  = new Date(ngay_tra);

    return await prisma.$queryRaw`
      SELECT
        tbvl.id,
        tbvl.ma_tai_san,
        tbvl.so_serial,
        tbvl.tinh_trang,
        tbvl.vi_tri_luu_tru,
        tbvl.trang_thai,
        tths.ten_trang_thai
      FROM thiet_bi_vat_ly tbvl
      LEFT JOIN trang_thai_he_thong tths ON tths.id = tbvl.trang_thai
      WHERE tbvl.mau_thiet_bi_id = ${mau_thiet_bi_id}::uuid
        AND tbvl.da_xoa_luc IS NULL
        AND tbvl.trang_thai = 501
        AND tbvl.id NOT IN (
          SELECT bgvp.thiet_bi_id
          FROM ban_giao_vat_pham bgvp
          JOIN chi_tiet_don_thue ctdt ON ctdt.id = bgvp.chi_tiet_don_thue_id
          JOIN don_thue dt ON dt.id = ctdt.don_thue_id
          WHERE bgvp.thiet_bi_id IS NOT NULL
            AND dt.trang_thai IN (1102, 1103, 1105)
            AND dt.ngay_nhan < ${dateTra}::timestamptz
            AND dt.ngay_tra  > ${dateNhan}::timestamptz
        )
      ORDER BY tbvl.ma_tai_san
    `;
  }

  return await prisma.$queryRaw`
    SELECT
      tbvl.id,
      tbvl.ma_tai_san,
      tbvl.so_serial,
      tbvl.tinh_trang,
      tbvl.vi_tri_luu_tru,
      tbvl.trang_thai,
      tths.ten_trang_thai
    FROM thiet_bi_vat_ly tbvl
    LEFT JOIN trang_thai_he_thong tths ON tths.id = tbvl.trang_thai
    WHERE tbvl.mau_thiet_bi_id = ${mau_thiet_bi_id}::uuid
      AND tbvl.da_xoa_luc IS NULL
      AND tbvl.trang_thai = 501
    ORDER BY tbvl.ma_tai_san
  `;
}

// -------------------------------------------------------
// 4. POST /admin/orders/:id/handover — Lập phiếu bàn giao
// -------------------------------------------------------
async function lapPhieuBanGiaoService(nhanVienId, donThueId, { ghi_chu_ban_giao, vat_pham }, files) {
  // Kiểm tra đơn tồn tại và đang ở DA_GIU_CHO (1102)
  const donResult = await prisma.$queryRaw`
    SELECT id, trang_thai, tong_tien_thue
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  if (donResult.length === 0) {
    throw new Error("Đơn thuê không tồn tại");
  }

  if (donResult[0].trang_thai !== 1102) {
    throw new Error("Chỉ có thể lập phiếu bàn giao cho đơn ở trạng thái Đã giữ chỗ");
  }

  // Parse vat_pham nếu gửi dạng JSON string (multipart form)
  let danhSachVatPham = vat_pham;
  if (typeof danhSachVatPham === "string") {
    try {
      danhSachVatPham = JSON.parse(danhSachVatPham);
    } catch {
      throw new Error("Dữ liệu vật phẩm bàn giao không hợp lệ");
    }
  }

  if (!Array.isArray(danhSachVatPham) || danhSachVatPham.length === 0) {
    throw new Error("Vui lòng cung cấp ít nhất một vật phẩm bàn giao");
  }

  // Upload file lên Cloudinary
  const hopDongFiles    = files?.hop_dong_giay || [];
  const anhBanGiaoFiles = files?.anh_ban_giao  || [];

  const uploadCloudinary = (file, folder) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `t-rent/${folder}`, resource_type: "auto" },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(file.buffer);
    });

  const hopDongUrls    = await Promise.all(hopDongFiles.map((f) => uploadCloudinary(f, "hop-dong")));
  const anhBanGiaoUrls = await Promise.all(anhBanGiaoFiles.map((f) => uploadCloudinary(f, "anh-ban-giao")));

  // Lấy danh sách thiết bị vật lý để cập nhật trạng thái
  const thietBiIds = danhSachVatPham.filter((v) => v.thiet_bi_id).map((v) => v.thiet_bi_id);

  await prisma.$transaction(async (tx) => {
    // a) Lưu vật phẩm bàn giao
    for (const vp of danhSachVatPham) {
      const thietBiId   = vp.thiet_bi_id   || null;
      const phuKienId   = vp.phu_kien_id   || null;
      const boDiKemId   = vp.bo_di_kem_id  || null;
      const soLuongGiao = vp.so_luong_giao || 1;

      if (thietBiId) {
        await tx.$executeRaw`
          INSERT INTO ban_giao_vat_pham (
            id, chi_tiet_don_thue_id, bo_di_kem_id, thiet_bi_id,
            ten_vat_pham_snapshot, ma_tai_san_snapshot, so_serial_snapshot,
            so_luong_giao, tinh_trang_truoc, ghi_chu_ban_giao, created_at
          ) VALUES (
            gen_random_uuid(), ${vp.chi_tiet_don_thue_id}::uuid, ${boDiKemId}::uuid,
            ${thietBiId}::uuid, ${vp.ten_vat_pham_snapshot},
            ${vp.ma_tai_san_snapshot || null}, ${vp.so_serial_snapshot || null},
            ${soLuongGiao}, ${vp.tinh_trang_truoc || null}, ${ghi_chu_ban_giao || null}, NOW()
          )
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO ban_giao_vat_pham (
            id, chi_tiet_don_thue_id, bo_di_kem_id, phu_kien_id,
            ten_vat_pham_snapshot, so_luong_giao, ghi_chu_ban_giao, created_at
          ) VALUES (
            gen_random_uuid(), ${vp.chi_tiet_don_thue_id}::uuid, ${boDiKemId}::uuid,
            ${phuKienId}::uuid, ${vp.ten_vat_pham_snapshot},
            ${soLuongGiao}, ${ghi_chu_ban_giao || null}, NOW()
          )
        `;
      }
    }

    // b) Lưu file hợp đồng giấy
    for (let i = 0; i < hopDongUrls.length; i++) {
      const r = hopDongUrls[i];
      const f = hopDongFiles[i];
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (id, don_thue_id, muc_dich, ten_file_goc, file_url, loai_file, kich_thuoc_file, uploaded_by, uploaded_at, updated_at)
        VALUES (gen_random_uuid(), ${donThueId}::uuid, 'HOP_DONG_GIAY', ${f.originalname}, ${r.secure_url}, ${f.mimetype}, ${f.size}, ${nhanVienId}::uuid, NOW(), NOW())
      `;
    }

    // c) Lưu ảnh bàn giao
    for (let i = 0; i < anhBanGiaoUrls.length; i++) {
      const r = anhBanGiaoUrls[i];
      const f = anhBanGiaoFiles[i];
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (id, don_thue_id, muc_dich, ten_file_goc, file_url, loai_file, kich_thuoc_file, uploaded_by, uploaded_at, updated_at)
        VALUES (gen_random_uuid(), ${donThueId}::uuid, 'ANH_BAN_GIAO', ${f.originalname}, ${r.secure_url}, ${f.mimetype}, ${f.size}, ${nhanVienId}::uuid, NOW(), NOW())
      `;
    }

    // d) Cập nhật đơn thuê → DANG_THUE (1103)
    await tx.$executeRaw`
      UPDATE don_thue
      SET trang_thai = 1103, ban_giao_luc = NOW(),
          nguoi_ban_giao_id = ${nhanVienId}::uuid,
          ghi_chu_ban_giao = ${ghi_chu_ban_giao || null},
          updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    // e) Cập nhật thiết bị vật lý → DANG_THUE (502)
    for (const tbId of thietBiIds) {
      await tx.$executeRaw`
        UPDATE thiet_bi_vat_ly SET trang_thai = 502, updated_at = NOW()
        WHERE id = ${tbId}::uuid
      `;
    }

    // f) Ghi dòng tiền TIEN_THUE (2302)
    await tx.$executeRaw`
      INSERT INTO thanh_toan (id, don_thue_id, so_tien, loai_dong_tien_id, nguoi_thuc_hien_id, ghi_chu, created_at)
      VALUES (gen_random_uuid(), ${donThueId}::uuid, ${BigInt(donResult[0].tong_tien_thue)}, 2302,
              ${nhanVienId}::uuid, 'Ghi nhận tiền thuê khi bàn giao thiết bị', NOW())
    `;
  });

  return { message: "Lập phiếu bàn giao thành công, đơn thuê chuyển sang ĐANG THUÊ" };
}

// -------------------------------------------------------
// 5. GET /admin/orders/:id/files — Xem file của đơn thuê
// -------------------------------------------------------
async function layFileDonThueService(donThueId, muc_dich) {
  const donTonTai = await prisma.$queryRaw`
    SELECT id FROM don_thue WHERE id = ${donThueId}::uuid LIMIT 1
  `;
  if (donTonTai.length === 0) {
    throw new Error("Đơn thuê không tồn tại");
  }

  let files;
  if (muc_dich) {
    files = await prisma.$queryRaw`
      SELECT
        tdt.id, tdt.muc_dich, tdt.ten_file_goc, tdt.file_url,
        tdt.loai_file, tdt.kich_thuoc_file::text,
        nd.ho_ten AS ten_nguoi_upload, tdt.uploaded_at
      FROM tep_don_thue tdt
      LEFT JOIN nguoi_dung nd ON nd.id = tdt.uploaded_by
      WHERE tdt.don_thue_id = ${donThueId}::uuid
        AND tdt.muc_dich = ${muc_dich}
      ORDER BY tdt.uploaded_at DESC
    `;
  } else {
    files = await prisma.$queryRaw`
      SELECT
        tdt.id, tdt.muc_dich, tdt.ten_file_goc, tdt.file_url,
        tdt.loai_file, tdt.kich_thuoc_file::text,
        nd.ho_ten AS ten_nguoi_upload, tdt.uploaded_at
      FROM tep_don_thue tdt
      LEFT JOIN nguoi_dung nd ON nd.id = tdt.uploaded_by
      WHERE tdt.don_thue_id = ${donThueId}::uuid
      ORDER BY tdt.uploaded_at DESC
    `;
  }

  return files.map((f) => ({
    ...f,
    kich_thuoc_file: f.kich_thuoc_file ? Number(f.kich_thuoc_file) : null,
  }));
}

module.exports = {
  layDanhSachDonThueService,
  layChiTietDonThueService,
  layThietBiSanSangService,
  lapPhieuBanGiaoService,
  layFileDonThueService,
};
