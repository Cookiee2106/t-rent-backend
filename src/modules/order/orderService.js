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
        dt.nguoi_ban_giao_id,
        dt.nguoi_nhan_tra_id,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        (
          SELECT mtb.anh_url
          FROM chi_tiet_don_thue ctdt
          JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
          WHERE ctdt.don_thue_id = dt.id
          ORDER BY ctdt.created_at ASC
          LIMIT 1
        ) AS anh_url_mau_thiet_bi,
        (
          SELECT nd_tt.ho_ten
          FROM thanh_toan tt
          LEFT JOIN nguoi_dung nd_tt ON nd_tt.id = tt.nguoi_thuc_hien_id
          WHERE tt.don_thue_id = dt.id
          ORDER BY tt.created_at DESC
          LIMIT 1
        ) AS ten_nguoi_thanh_toan,
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
        dt.nguoi_ban_giao_id,
        dt.nguoi_nhan_tra_id,
        dt.ban_giao_luc,
        dt.tra_luc,
        dt.huy_luc,
        (
          SELECT mtb.anh_url
          FROM chi_tiet_don_thue ctdt
          JOIN mau_thiet_bi mtb ON mtb.id = ctdt.mau_thiet_bi_id
          WHERE ctdt.don_thue_id = dt.id
          ORDER BY ctdt.created_at ASC
          LIMIT 1
        ) AS anh_url_mau_thiet_bi,
        (
          SELECT nd_tt.ho_ten
          FROM thanh_toan tt
          LEFT JOIN nguoi_dung nd_tt ON nd_tt.id = tt.nguoi_thuc_hien_id
          WHERE tt.don_thue_id = dt.id
          ORDER BY tt.created_at DESC
          LIMIT 1
        ) AS ten_nguoi_thanh_toan,
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
      bgvp.so_luong_giao
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

  const files = await prisma.$queryRaw`
    SELECT
      tdt.id, tdt.muc_dich_id, tdt.ten_file_goc, tdt.file_url,
      tdt.loai_file, tdt.kich_thuoc_file::text,
      nd.ho_ten AS ten_nguoi_upload, tdt.uploaded_at
    FROM tep_don_thue tdt
    LEFT JOIN nguoi_dung nd ON nd.id = tdt.uploaded_by
    WHERE tdt.don_thue_id = ${donThueId}::uuid
    ORDER BY tdt.uploaded_at DESC
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
    tep_don_thue: files.map((f) => ({
      ...f,
      kich_thuoc_file: f.kich_thuoc_file ? Number(f.kich_thuoc_file) : null,
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
  // 1. Bắt buộc có file hợp đồng giấy và ảnh bàn giao
  const hopDongFiles    = files?.hop_dong_giay || [];
  const anhBanGiaoFiles = files?.anh_ban_giao  || [];

  if (hopDongFiles.length === 0) {
    throw new Error("Bắt buộc phải tải lên tệp hợp đồng giấy");
  }
  if (anhBanGiaoFiles.length === 0) {
    throw new Error("Bắt buộc phải tải lên ảnh bàn giao");
  }

  // 2. Kiểm tra đơn tồn tại và đang ở DA_GIU_CHO (1102)
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

  // 3. Đơn phải có tiền cọc 2301
  const cocResult = await prisma.$queryRaw`
    SELECT id FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid AND loai_dong_tien_id = 2301
    LIMIT 1
  `;
  if (cocResult.length === 0) {
    throw new Error("Đơn thuê chưa nộp tiền cọc (mã loại 2301)");
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

  // 4. Lấy toàn bộ chi_tiet_don_thue của đơn hàng này để đối chiếu
  const chiTietDonThue = await prisma.$queryRaw`
    SELECT id, mau_thiet_bi_id, so_luong
    FROM chi_tiet_don_thue
    WHERE don_thue_id = ${donThueId}::uuid
  `;
  const chiTietMap = new Map(chiTietDonThue.map(ct => [ct.id, ct]));

  // 5. Lấy toàn bộ cấu hình bo_di_kem của các mẫu chính trong đơn hàng
  const mauChinhIds = chiTietDonThue.map(ct => ct.mau_thiet_bi_id);
  let boDiKemConfig = [];
  if (mauChinhIds.length > 0) {
    boDiKemConfig = await prisma.$queryRaw`
      SELECT id, mau_thiet_bi_chinh_id, mau_thiet_bi_phu_id, phu_kien_id, so_luong
      FROM bo_di_kem
      WHERE mau_thiet_bi_chinh_id = ANY(${mauChinhIds}::uuid[])
    `;
  }
  // Group boDiKem by mau_thiet_bi_chinh_id
  const boDiKemMap = new Map();
  for (const bdk of boDiKemConfig) {
    if (!boDiKemMap.has(bdk.mau_thiet_bi_chinh_id)) {
      boDiKemMap.set(bdk.mau_thiet_bi_chinh_id, []);
    }
    boDiKemMap.get(bdk.mau_thiet_bi_chinh_id).push(bdk);
  }

  // 6. Theo dõi số lượng bàn giao thực tế để đối chiếu
  const mainDelivered = new Map();
  const bdkDelivered = new Map();
  const usedPhysicalDevices = new Set();

  const itemsToInsert = [];
  const physicalDevicesToUpdate = [];

  for (const vp of danhSachVatPham) {
    const { chi_tiet_don_thue_id, bo_di_kem_id } = vp;

    const ct = chiTietMap.get(chi_tiet_don_thue_id);
    if (!ct) {
      throw new Error(`Vật phẩm bàn giao có chi_tiet_don_thue_id "${chi_tiet_don_thue_id}" không thuộc đơn thuê này`);
    }

    if (!bo_di_kem_id) {
      // BÀN GIAO THIẾT BỊ CHÍNH
      const thietBiId = vp.thiet_bi_id;
      if (!thietBiId) {
        throw new Error("Bàn giao thiết bị chính yêu cầu cung cấp thiet_bi_id");
      }

      if (usedPhysicalDevices.has(thietBiId)) {
        throw new Error(`Thiết bị vật lý "${thietBiId}" bị bàn giao trùng lặp trong phiếu`);
      }
      usedPhysicalDevices.add(thietBiId);

      // Query database để kiểm tra mẫu mã và trạng thái thiết bị vật lý (Không tin snapshot FE)
      const tbResult = await prisma.$queryRaw`
        SELECT tb.id, tb.mau_thiet_bi_id, tb.ma_tai_san, tb.so_serial, tb.trang_thai,
               mtb.ten_hang, mtb.ten_mau
        FROM thiet_bi_vat_ly tb
        JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
        WHERE tb.id = ${thietBiId}::uuid AND tb.da_xoa_luc IS NULL
        LIMIT 1
      `;
      if (tbResult.length === 0) {
        throw new Error(`Thiết bị vật lý "${thietBiId}" không tồn tại hoặc đã bị xóa`);
      }
      const tb = tbResult[0];

      if (tb.trang_thai !== 501) {
        throw new Error(`Thiết bị "${tb.ma_tai_san}" (S/N: ${tb.so_serial}) không ở trạng thái Sẵn sàng (501)`);
      }
      if (tb.mau_thiet_bi_id !== ct.mau_thiet_bi_id) {
        throw new Error(`Thiết bị "${tb.ma_tai_san}" không thuộc đúng mẫu của chi tiết đơn thuê`);
      }

      const soLuongGiao = vp.so_luong_giao || 1;
      if (soLuongGiao !== 1) {
        throw new Error("Số lượng bàn giao của mỗi thiết bị vật lý phải là 1");
      }

      mainDelivered.set(ct.id, (mainDelivered.get(ct.id) || 0) + 1);

      itemsToInsert.push({
        chi_tiet_don_thue_id: ct.id,
        bo_di_kem_id: null,
        thiet_bi_id: thietBiId,
        phu_kien_id: null,
        ten_vat_pham_snapshot: `${tb.ten_hang || ""} ${tb.ten_mau}`.trim(),
        ma_tai_san_snapshot: tb.ma_tai_san,
        so_serial_snapshot: tb.so_serial,
        so_luong_giao: 1
      });

      physicalDevicesToUpdate.push(thietBiId);

    } else {
      // BÀN GIAO BỘ ĐI KÈM
      const configList = boDiKemMap.get(ct.mau_thiet_bi_id) || [];
      const bdk = configList.find(c => c.id === bo_di_kem_id);
      if (!bdk) {
        throw new Error(`Bộ đi kèm "${bo_di_kem_id}" không hợp lệ cho mẫu thiết bị chính của đơn hàng`);
      }

      if (bdk.mau_thiet_bi_phu_id) {
        // Bộ đi kèm là thiết bị phụ
        const thietBiId = vp.thiet_bi_id;
        if (!thietBiId) {
          throw new Error(`Bàn giao thiết bị phụ thuộc bộ đi kèm "${bo_di_kem_id}" yêu cầu cung cấp thiet_bi_id`);
        }

        if (usedPhysicalDevices.has(thietBiId)) {
          throw new Error(`Thiết bị vật lý "${thietBiId}" bị bàn giao trùng lặp trong phiếu`);
        }
        usedPhysicalDevices.add(thietBiId);

        const tbResult = await prisma.$queryRaw`
          SELECT tb.id, tb.mau_thiet_bi_id, tb.ma_tai_san, tb.so_serial, tb.trang_thai,
                 mtb.ten_hang, mtb.ten_mau
          FROM thiet_bi_vat_ly tb
          JOIN mau_thiet_bi mtb ON mtb.id = tb.mau_thiet_bi_id
          WHERE tb.id = ${thietBiId}::uuid AND tb.da_xoa_luc IS NULL
          LIMIT 1
        `;
        if (tbResult.length === 0) {
          throw new Error(`Thiết bị vật lý phụ "${thietBiId}" không tồn tại hoặc đã bị xóa`);
        }
        const tb = tbResult[0];

        if (tb.trang_thai !== 501) {
          throw new Error(`Thiết bị phụ "${tb.ma_tai_san}" (S/N: ${tb.so_serial}) không ở trạng thái Sẵn sàng (501)`);
        }
        if (tb.mau_thiet_bi_id !== bdk.mau_thiet_bi_phu_id) {
          throw new Error(`Thiết bị phụ "${tb.ma_tai_san}" không thuộc đúng mẫu phụ của bộ đi kèm`);
        }

        const soLuongGiao = vp.so_luong_giao || 1;
        if (soLuongGiao !== 1) {
          throw new Error("Số lượng bàn giao của mỗi thiết bị vật lý phụ phải là 1");
        }

        const bdkKey = `${ct.id}_${bdk.id}`;
        bdkDelivered.set(bdkKey, (bdkDelivered.get(bdkKey) || 0) + 1);

        itemsToInsert.push({
          chi_tiet_don_thue_id: ct.id,
          bo_di_kem_id: bdk.id,
          thiet_bi_id: thietBiId,
          phu_kien_id: null,
          ten_vat_pham_snapshot: `${tb.ten_hang || ""} ${tb.ten_mau}`.trim(),
          ma_tai_san_snapshot: tb.ma_tai_san,
          so_serial_snapshot: tb.so_serial,
          so_luong_giao: 1
        });

        physicalDevicesToUpdate.push(thietBiId);

      } else if (bdk.phu_kien_id) {
        // Bộ đi kèm là phụ kiện
        const phuKienId = vp.phu_kien_id;
        if (!phuKienId || phuKienId !== bdk.phu_kien_id) {
          throw new Error(`Bàn giao phụ kiện không khớp cấu hình của bộ đi kèm (Yêu cầu phu_kien_id: ${bdk.phu_kien_id})`);
        }

        const pkResult = await prisma.$queryRaw`
          SELECT id, ten_phu_kien, tong_so_luong
          FROM phu_kien
          WHERE id = ${phuKienId}::uuid AND da_xoa_luc IS NULL
          LIMIT 1
        `;
        if (pkResult.length === 0) {
          throw new Error(`Phụ kiện "${phuKienId}" không tồn tại hoặc đã bị xóa`);
        }
        const pk = pkResult[0];

        const soLuongGiao = Number(vp.so_luong_giao || 1);
        if (soLuongGiao <= 0) {
          throw new Error("Số lượng bàn giao phụ kiện phải lớn hơn 0");
        }

        const bdkKey = `${ct.id}_${bdk.id}`;
        bdkDelivered.set(bdkKey, (bdkDelivered.get(bdkKey) || 0) + soLuongGiao);

        itemsToInsert.push({
          chi_tiet_don_thue_id: ct.id,
          bo_di_kem_id: bdk.id,
          thiet_bi_id: null,
          phu_kien_id: phuKienId,
          ten_vat_pham_snapshot: pk.ten_phu_kien,
          ma_tai_san_snapshot: null,
          so_serial_snapshot: null,
          so_luong_giao: soLuongGiao
        });
      }
    }
  }

  // 7. Đối chiếu số lượng bàn giao so với số lượng yêu cầu của đơn thuê
  for (const ct of chiTietDonThue) {
    const mainQty = mainDelivered.get(ct.id) || 0;
    if (mainQty !== ct.so_luong) {
      throw new Error(`Mẫu thiết bị chính "${ct.mau_thiet_bi_id}" chưa bàn giao đúng số lượng yêu cầu (Yêu cầu: ${ct.so_luong}, Giao: ${mainQty})`);
    }

    const configs = boDiKemMap.get(ct.mau_thiet_bi_id) || [];
    for (const bdkConfig of configs) {
      const requiredBdkQty = bdkConfig.so_luong * ct.so_luong;
      const bdkKey = `${ct.id}_${bdkConfig.id}`;
      const actualBdkQty = bdkDelivered.get(bdkKey) || 0;

      if (actualBdkQty !== requiredBdkQty) {
        const typeStr = bdkConfig.mau_thiet_bi_phu_id ? "Thiết bị phụ" : "Phụ kiện";
        throw new Error(`${typeStr} thuộc bộ đi kèm (ID: ${bdkConfig.id}) chưa bàn giao đúng số lượng yêu cầu (Yêu cầu: ${requiredBdkQty}, Giao: ${actualBdkQty})`);
      }
    }
  }

  // 8. Upload files lên Cloudinary
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

  // 9. Thực hiện lưu trữ DB và cập nhật trạng thái trong Transaction
  await prisma.$transaction(async (tx) => {
    // a) Lưu vật phẩm bàn giao
    for (const item of itemsToInsert) {
      await tx.$executeRaw`
        INSERT INTO ban_giao_vat_pham (
          id, chi_tiet_don_thue_id, bo_di_kem_id, thiet_bi_id, phu_kien_id,
          ten_vat_pham_snapshot, ma_tai_san_snapshot, so_serial_snapshot,
          so_luong_giao, ghi_chu_ban_giao, created_at
        ) VALUES (
          gen_random_uuid(), ${item.chi_tiet_don_thue_id}::uuid, ${item.bo_di_kem_id ? item.bo_di_kem_id : null}::uuid,
          ${item.thiet_bi_id ? item.thiet_bi_id : null}::uuid, ${item.phu_kien_id ? item.phu_kien_id : null}::uuid,
          ${item.ten_vat_pham_snapshot}, ${item.ma_tai_san_snapshot}, ${item.so_serial_snapshot},
          ${item.so_luong_giao}, ${ghi_chu_ban_giao || null}, NOW()
        )
      `;
    }

    // b) Lưu file hợp đồng giấy
    for (let i = 0; i < hopDongUrls.length; i++) {
      const r = hopDongUrls[i];
      const f = hopDongFiles[i];
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (id, don_thue_id, muc_dich_id, ten_file_goc, file_url, loai_file, kich_thuoc_file, uploaded_by, uploaded_at, updated_at)
        VALUES (gen_random_uuid(), ${donThueId}::uuid, 2601, ${f.originalname}, ${r.secure_url}, ${f.mimetype}, ${f.size}, ${nhanVienId}::uuid, NOW(), NOW())
      `;
    }

    // c) Lưu ảnh bàn giao
    for (let i = 0; i < anhBanGiaoUrls.length; i++) {
      const r = anhBanGiaoUrls[i];
      const f = anhBanGiaoFiles[i];
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (id, don_thue_id, muc_dich_id, ten_file_goc, file_url, loai_file, kich_thuoc_file, uploaded_by, uploaded_at, updated_at)
        VALUES (gen_random_uuid(), ${donThueId}::uuid, 2602, ${f.originalname}, ${r.secure_url}, ${f.mimetype}, ${f.size}, ${nhanVienId}::uuid, NOW(), NOW())
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
    for (const tbId of physicalDevicesToUpdate) {
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

module.exports = {
  layDanhSachDonThueService,
  layChiTietDonThueService,
  layThietBiSanSangService,
  lapPhieuBanGiaoService,
};
