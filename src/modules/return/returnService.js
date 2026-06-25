const { Prisma } = require("@prisma/client");
const prisma = require("../../utils/prisma");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

// ============================================================
// API #13: GET LIQUIDATIONS LIST
// ============================================================
async function getLiquidationsList({ trang = 1, gioi_han = 20, tu_khoa }) {
  const trang_so = Math.max(1, parseInt(trang, 10) || 1);
  const gioi_han_so = Math.min(100, Math.max(1, parseInt(gioi_han, 10) || 20));
  const vi_tri_bat_dau = (trang_so - 1) * gioi_han_so;

  // Điều kiện WHERE động
  const dieu_kien = [Prisma.sql`dt.trang_thai = 'DANG_THUE'`];

  if (tu_khoa) {
    const mau_tim_kiem = `%${tu_khoa}%`;
    dieu_kien.push(
      Prisma.sql`(nd.ho_ten ILIKE ${mau_tim_kiem} OR dt.ma_don ILIKE ${mau_tim_kiem})`
    );
  }

  const menh_de_where = Prisma.sql`WHERE ${Prisma.join(dieu_kien, " AND ")}`;

  // Danh sách
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.ngay_nhan, dt.ngay_tra, dt.tong_tien_thue, dt.tong_tien_coc,
           dt.trang_thai, dt.created_at,
           nd.ho_ten, nd.email, nd.so_dien_thoai,
           ptt.id AS phieu_tra_id, ptt.ket_qua, ptt.ket_qua_tien_coc,
           ptt.so_tien_hoan_coc, ptt.so_tien_khau_tru
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    LEFT JOIN phieu_tra_thiet_bi ptt ON ptt.don_thue_id = dt.id
    ${menh_de_where}
    ORDER BY dt.ngay_tra ASC
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

  const danh_sach = danh_sach_don.map((don) => ({
    id: don.id,
    ma_don: don.ma_don,
    ngay_nhan: don.ngay_nhan,
    ngay_tra: don.ngay_tra,
    tong_tien_thue: don.tong_tien_thue,
    tong_tien_coc: don.tong_tien_coc,
    trang_thai: don.trang_thai,
    created_at: don.created_at,
    khach_hang: {
      ho_ten: don.ho_ten,
      email: don.email,
      so_dien_thoai: don.so_dien_thoai,
    },
    phieu_tra: {
      id: don.phieu_tra_id || null,
      ket_qua: don.ket_qua || null,
      ket_qua_tien_coc: don.ket_qua_tien_coc || null,
      so_tien_hoan_coc: don.so_tien_hoan_coc || 0,
      so_tien_khau_tru: don.so_tien_khau_tru || 0,
    },
  }));

  return {
    danh_sach,
    phan_trang: { trang: trang_so, gioi_han: gioi_han_so, tong_so },
  };
}

// ============================================================
// API #14: GET LIQUIDATION DETAIL
// ============================================================
async function getLiquidationDetail(don_thue_id) {
  // Đơn + khách hàng
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.*, hs.id AS ho_so_id, hs.dia_chi, hs.so_cccd,
           nd.ho_ten, nd.email, nd.so_dien_thoai
    FROM don_thue dt
    JOIN ho_so_khach_hang hs ON hs.id = dt.khach_hang_id
    JOIN nguoi_dung nd ON nd.id = hs.nguoi_dung_id
    WHERE dt.id = ${don_thue_id}::uuid AND dt.trang_thai = 'DANG_THUE'
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê đang cho thuê");
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

  // Phiếu bàn giao
  const danh_sach_phieu_ban_giao = await prisma.$queryRaw`
    SELECT pbv.*, nd.ho_ten AS nhan_vien
    FROM phieu_ban_giao pbv
    JOIN nguoi_dung nd ON nd.id = pbv.nhan_vien_id
    WHERE pbv.don_thue_id = ${don_thue_id}::uuid
  `;

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

  // Ảnh
  const danh_sach_tep = await prisma.$queryRaw`
    SELECT * FROM tep_don_thue
    WHERE don_thue_id = ${don_thue_id}::uuid
      AND muc_dich IN ('ANH_BAN_GIAO', 'ANH_KHI_TRA')
  `;

  const anh_ban_giao = danh_sach_tep.filter((t) => t.muc_dich === "ANH_BAN_GIAO");
  const anh_khi_tra = danh_sach_tep.filter((t) => t.muc_dich === "ANH_KHI_TRA");

  return {
    id: don.id,
    ma_don: don.ma_don,
    ngay_nhan: don.ngay_nhan,
    ngay_tra: don.ngay_tra,
    so_ngay_thue: don.so_ngay_thue,
    tong_tien_thue: don.tong_tien_thue,
    tong_tien_coc: don.tong_tien_coc,
    trang_thai: don.trang_thai,
    created_at: don.created_at,
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
    thiet_bi_gan_voi_don: danh_sach_thiet_bi_gan.map((tb) => ({
      id: tb.id,
      thiet_bi_id: tb.thiet_bi_id,
      ma_tai_san: tb.ma_tai_san,
      so_serial: tb.so_serial,
      trang_thai: tb.trang_thai,
      tinh_trang_truoc: tb.ghi_chu_tinh_trang_snapshot || null,
      tinh_trang_sau: tb.tinh_trang_sau || null,
    })),
    phieu_ban_giao: danh_sach_phieu_ban_giao.length > 0
      ? {
          id: danh_sach_phieu_ban_giao[0].id,
          nhan_vien: danh_sach_phieu_ban_giao[0].nhan_vien,
          ban_giao_luc: danh_sach_phieu_ban_giao[0].ban_giao_luc,
          ghi_chu: danh_sach_phieu_ban_giao[0].ghi_chu,
          anh_ban_giao: anh_ban_giao.map((a) => ({
            id: a.id, file_url: a.file_url, ten_file_goc: a.ten_file_goc,
          })),
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
            .map((hd) => ({ ten_file_goc: hd.ten_file_goc, file_url: hd.file_url })),
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
    anh_khi_tra: anh_khi_tra.map((a) => ({
      id: a.id, file_url: a.file_url, ten_file_goc: a.ten_file_goc,
    })),
  };
}

// ============================================================
// API #15: UPLOAD RETURN IMAGES
// ============================================================
async function uploadReturnImages(don_thue_id, files, body_image_urls) {
  const danh_sach_don = await prisma.$queryRaw`
    SELECT id FROM don_thue WHERE id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const danh_sach_anh = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const ket_qua = await uploadBufferToCloudinary(file.buffer, "t-rent/return", "image");
      danh_sach_anh.push({
        file_url: ket_qua.secure_url,
        ten_file_goc: file.originalname,
        loai_file: file.mimetype,
        kich_thuoc_file: file.size,
      });
    }
  }

  if (body_image_urls && body_image_urls.length > 0) {
    for (const url of body_image_urls) {
      danh_sach_anh.push({
        file_url: typeof url === "string" ? url : url.file_url,
        ten_file_goc: typeof url === "string" ? "return-image" : url.ten_file_goc || "return-image",
        loai_file: typeof url === "string" ? null : url.loai_file || null,
        kich_thuoc_file: typeof url === "string" ? null : url.kich_thuoc_file || null,
      });
    }
  }

  if (danh_sach_anh.length === 0) {
    const error = new Error("Vui lòng upload ít nhất 1 ảnh hoặc cung cấp URL ảnh");
    error.statusCode = 400;
    throw error;
  }

  return { danh_sach_anh };
}

// ============================================================
// API #16: CREATE RETURN INSPECTION
// ============================================================
async function createReturnInspection(don_thue_id, nhan_vien_id, du_lieu) {
  const { danh_sach_tai_san, danh_sach_anh_url, ghi_chu, ket_qua } = du_lieu;

  // Kiểm tra đơn thuê
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.ma_don, dt.trang_thai
    FROM don_thue dt
    WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  if (don.trang_thai !== "DANG_THUE") {
    const error = new Error("Đơn thuê phải ở trạng thái 'Đang thuê' để thanh lý");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra chưa có phiếu trả
  const phieu_tra_cu = await prisma.$queryRaw`
    SELECT id FROM phieu_tra_thiet_bi WHERE don_thue_id = ${don_thue_id}::uuid LIMIT 1
  `;

  if (phieu_tra_cu.length > 0) {
    const error = new Error("Đơn thuê này đã được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (!danh_sach_tai_san || danh_sach_tai_san.length === 0) {
    const error = new Error("Vui lòng cung cấp thông tin tài sản kiểm tra");
    error.statusCode = 400;
    throw error;
  }

  // Lấy thiết bị gán với đơn
  const danh_sach_tbgvd_id = danh_sach_tai_san.map((ts) => ts.thiet_bi_gan_voi_don_id);

  const danh_sach_thiet_bi_gan = await prisma.$queryRaw`
    SELECT tbgvd.*, tbvl.id AS thiet_bi_vat_ly_id, tbvl.trang_thai AS trang_thai_vat_ly,
           tbvl.vi_tri_hien_tai_id
    FROM thiet_bi_gan_voi_don tbgvd
    JOIN thiet_bi_vat_ly tbvl ON tbvl.id = tbgvd.thiet_bi_id
    WHERE tbgvd.id = ANY(${danh_sach_tbgvd_id}::uuid[])
      AND tbgvd.don_thue_id = ${don_thue_id}::uuid
  `;

  if (danh_sach_thiet_bi_gan.length !== danh_sach_tbgvd_id.length) {
    const error = new Error("Một số tài sản không thuộc đơn thuê này");
    error.statusCode = 400;
    throw error;
  }

  // Transaction
  const ket_qua_db = await prisma.$transaction(async (tx) => {
    // 1. INSERT phieu_tra_thiet_bi
    const phieu_tra_moi = await tx.$queryRaw`
      INSERT INTO phieu_tra_thiet_bi (id, don_thue_id, nhan_vien_id, tra_luc, ket_qua, ghi_chu, created_at, updated_at)
      VALUES (gen_random_uuid(), ${don_thue_id}::uuid, ${nhan_vien_id}::uuid, NOW(), ${ket_qua || "HOP_LE"}, ${ghi_chu || null}, NOW(), NOW())
      RETURNING id
    `;
    const phieu_tra_id = phieu_tra_moi[0].id;

    let so_luong_chi_tiet = 0;

    for (const item of danh_sach_tai_san) {
      const thiet_bi_gan = danh_sach_thiet_bi_gan.find(
        (tb) => tb.id === item.thiet_bi_gan_voi_don_id
      );

      const bi_hu_hong = item.bi_hu_hong || false;
      const bi_mat = item.bi_mat || false;

      // 2. INSERT chi_tiet_tra_thiet_bi
      await tx.$executeRaw`
        INSERT INTO chi_tiet_tra_thiet_bi (id, phieu_tra_id, don_thue_id, thiet_bi_gan_id, so_luong_tra, so_luong_hu, so_luong_mat, ghi_chu_tinh_trang, bi_hu_hong, bi_mat, ghi_chu, created_at)
        VALUES (gen_random_uuid(), ${phieu_tra_id}::uuid, ${don_thue_id}::uuid, ${item.thiet_bi_gan_voi_don_id}::uuid, ${bi_mat ? 0 : 1}, ${bi_hu_hong ? 1 : 0}, ${bi_mat ? 1 : 0}, ${item.tinh_trang || null}, ${bi_hu_hong}, ${bi_mat}, ${item.ghi_chu || null}, NOW())
      `;

      // 3. UPDATE thiet_bi_gan_voi_don SET tinh_trang_sau
      await tx.$executeRaw`
        UPDATE thiet_bi_gan_voi_don
        SET tinh_trang_sau = ${item.tinh_trang || null}, updated_at = NOW()
        WHERE id = ${item.thiet_bi_gan_voi_don_id}::uuid
      `;

      // 4. UPDATE thiet_bi_vat_ly
      let trang_thai_moi = "SAN_SANG";
      let loai_di_chuyen = "TRA";

      if (bi_mat) {
        trang_thai_moi = "BI_MAT";
        loai_di_chuyen = "MAT";
      } else if (bi_hu_hong) {
        trang_thai_moi = "BAO_TRI";
        loai_di_chuyen = "BAO_TRI";
      }

      await tx.$executeRaw`
        UPDATE thiet_bi_vat_ly
        SET trang_thai = ${trang_thai_moi}, updated_at = NOW()
        WHERE id = ${thiet_bi_gan.thiet_bi_vat_ly_id}::uuid
      `;

      // 5. INSERT lich_su_di_chuyen_thiet_bi
      const ghi_chu_di_chuyen = bi_mat
        ? `Mất tài sản khi thanh lý đơn ${don.ma_don}`
        : bi_hu_hong
          ? `Hư hỏng khi thanh lý đơn ${don.ma_don}`
          : `Trả về từ đơn ${don.ma_don}`;

      await tx.$executeRaw`
        INSERT INTO lich_su_di_chuyen_thiet_bi (id, thiet_bi_id, don_thue_lien_quan_id, den_vi_tri_id, trang_thai_truoc, trang_thai_sau, loai_di_chuyen, ghi_chu, nguoi_thuc_hien_id, created_at)
        VALUES (gen_random_uuid(), ${thiet_bi_gan.thiet_bi_vat_ly_id}::uuid, ${don_thue_id}::uuid, ${thiet_bi_gan.vi_tri_hien_tai_id}::uuid, 'DANG_THUE', ${trang_thai_moi}, ${loai_di_chuyen}, ${ghi_chu_di_chuyen}, ${nhan_vien_id}::uuid, NOW())
      `;

      so_luong_chi_tiet++;
    }

    // 6. UPDATE don_thue → HOAN_THANH
    await tx.$executeRaw`
      UPDATE don_thue
      SET trang_thai = 'HOAN_THANH', updated_at = NOW()
      WHERE id = ${don_thue_id}::uuid
    `;

    // 7. UPDATE chi_tiet_don_thue → DA_TRA
    await tx.$executeRaw`
      UPDATE chi_tiet_don_thue
      SET trang_thai = 'DA_TRA', updated_at = NOW()
      WHERE don_thue_id = ${don_thue_id}::uuid
    `;

    // 8. INSERT tep_don_thue (ảnh khi trả)
    if (danh_sach_anh_url && danh_sach_anh_url.length > 0) {
      for (const anh_url of danh_sach_anh_url) {
        const ten_file = typeof anh_url === "string" ? "return-image" : anh_url.ten_file_goc || "return-image";
        const url = typeof anh_url === "string" ? anh_url : anh_url.file_url;

        await tx.$executeRaw`
          INSERT INTO tep_don_thue (id, don_thue_id, muc_dich, ten_file_goc, file_url, uploaded_by, uploaded_at)
          VALUES (gen_random_uuid(), ${don_thue_id}::uuid, 'ANH_KHI_TRA', ${ten_file}, ${url}, ${nhan_vien_id}::uuid, NOW())
        `;
      }
    }

    return { id: phieu_tra_id, so_luong_chi_tiet };
  });

  return ket_qua_db;
}

// ============================================================
// API #17: REFUND DEPOSIT
// ============================================================
async function processRefundDeposit(don_thue_id, nhan_vien_id, du_lieu) {
  const { so_tien, ma_giao_dich, ghi_chu } = du_lieu;

  // Kiểm tra đơn thuê + phiếu trả
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id, dt.tong_tien_coc,
           ptt.id AS phieu_tra_id, ptt.ket_qua_tien_coc
    FROM don_thue dt
    LEFT JOIN phieu_tra_thiet_bi ptt ON ptt.don_thue_id = dt.id
    WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  if (!don.phieu_tra_id) {
    const error = new Error("Đơn thuê chưa được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (don.ket_qua_tien_coc === "HOAN_COC") {
    const error = new Error("Tiền cọc đã được hoàn trả");
    error.statusCode = 400;
    throw error;
  }

  const so_tien_hoan = so_tien || don.tong_tien_coc;

  const ket_qua_db = await prisma.$transaction(async (tx) => {
    // INSERT thanh_toan
    const thanh_toan_moi = await tx.$queryRaw`
      INSERT INTO thanh_toan (id, don_thue_id, loai_thanh_toan, so_tien, phuong_thuc, trang_thai, ma_giao_dich, nguoi_thanh_toan_id, da_thanh_toan_luc, ghi_chu, created_at, updated_at)
      VALUES (gen_random_uuid(), ${don_thue_id}::uuid, 'HOAN_COC', ${so_tien_hoan}, 'TIEN_MAT', 'DA_THANH_TOAN', ${ma_giao_dich || null}, ${nhan_vien_id}::uuid, NOW(), ${ghi_chu || null}, NOW(), NOW())
      RETURNING id, so_tien
    `;

    // UPDATE phieu_tra_thiet_bi
    await tx.$executeRaw`
      UPDATE phieu_tra_thiet_bi
      SET ket_qua_tien_coc = 'HOAN_COC',
          so_tien_hoan_coc = ${so_tien_hoan},
          updated_at = NOW()
      WHERE don_thue_id = ${don_thue_id}::uuid
    `;

    return {
      thanh_toan_id: thanh_toan_moi[0].id,
      so_tien_hoan_coc: Number(thanh_toan_moi[0].so_tien),
    };
  });

  return ket_qua_db;
}

// ============================================================
// API #18: DEDUCT DEPOSIT
// ============================================================
async function processDeductDeposit(don_thue_id, nhan_vien_id, du_lieu) {
  const { danh_sach_phi, ma_giao_dich, ghi_chu } = du_lieu;

  // Kiểm tra đơn thuê + phiếu trả
  const danh_sach_don = await prisma.$queryRaw`
    SELECT dt.id,
           ptt.id AS phieu_tra_id, ptt.ket_qua_tien_coc
    FROM don_thue dt
    LEFT JOIN phieu_tra_thiet_bi ptt ON ptt.don_thue_id = dt.id
    WHERE dt.id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  const don = danh_sach_don[0];

  if (!don.phieu_tra_id) {
    const error = new Error("Đơn thuê chưa được thanh lý");
    error.statusCode = 400;
    throw error;
  }

  if (don.ket_qua_tien_coc === "KHAU_TRU") {
    const error = new Error("Tiền cọc đã được khấu trừ");
    error.statusCode = 400;
    throw error;
  }

  if (!danh_sach_phi || danh_sach_phi.length === 0) {
    const error = new Error("Vui lòng cung cấp thông tin khấu trừ");
    error.statusCode = 400;
    throw error;
  }

  const tong_tien_khau_tru = danh_sach_phi.reduce((tong, p) => tong + Number(p.so_tien), 0);

  const ket_qua_db = await prisma.$transaction(async (tx) => {
    // INSERT thanh_toan
    const thanh_toan_moi = await tx.$queryRaw`
      INSERT INTO thanh_toan (id, don_thue_id, loai_thanh_toan, so_tien, phuong_thuc, trang_thai, ma_giao_dich, nguoi_thanh_toan_id, da_thanh_toan_luc, ghi_chu, created_at, updated_at)
      VALUES (gen_random_uuid(), ${don_thue_id}::uuid, 'KHAU_TRU_COC', ${tong_tien_khau_tru}, 'TIEN_MAT', 'DA_THANH_TOAN', ${ma_giao_dich || null}, ${nhan_vien_id}::uuid, NOW(), ${ghi_chu || null}, NOW(), NOW())
      RETURNING id
    `;

    // INSERT phi_phat_sinh
    for (const phi of danh_sach_phi) {
      await tx.$executeRaw`
        INSERT INTO phi_phat_sinh (id, phieu_tra_id, chi_tiet_tra_id, loai_phi, mo_ta, so_tien, nguoi_tao_id, created_at)
        VALUES (gen_random_uuid(), ${don.phieu_tra_id}::uuid, ${phi.chi_tiet_tra_id || null}::uuid, ${phi.loai_phi || "HU_HONG"}, ${phi.mo_ta || null}, ${phi.so_tien}, ${nhan_vien_id}::uuid, NOW())
      `;
    }

    // UPDATE phieu_tra_thiet_bi
    await tx.$executeRaw`
      UPDATE phieu_tra_thiet_bi
      SET ket_qua_tien_coc = 'KHAU_TRU',
          so_tien_khau_tru = ${tong_tien_khau_tru},
          updated_at = NOW()
      WHERE don_thue_id = ${don_thue_id}::uuid
    `;

    return {
      thanh_toan_id: thanh_toan_moi[0].id,
      so_tien_khau_tru: tong_tien_khau_tru,
      so_luong_phi: danh_sach_phi.length,
    };
  });

  return ket_qua_db;
}

// ============================================================
// API #19: CREATE MAINTENANCE RECORD
// ============================================================
async function createMaintenanceRecord(don_thue_id, nhan_vien_id, du_lieu) {
  const { thiet_bi_id, thiet_bi_gan_voi_don_id, ly_do, ghi_chu } = du_lieu;

  // Kiểm tra đơn thuê
  const danh_sach_don = await prisma.$queryRaw`
    SELECT id FROM don_thue WHERE id = ${don_thue_id}::uuid
  `;

  if (!danh_sach_don || danh_sach_don.length === 0) {
    const error = new Error("Không tìm thấy đơn thuê");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra thiết bị vật lý
  const danh_sach_thiet_bi = await prisma.$queryRaw`
    SELECT id, trang_thai FROM thiet_bi_vat_ly WHERE id = ${thiet_bi_id}::uuid
  `;

  if (!danh_sach_thiet_bi || danh_sach_thiet_bi.length === 0) {
    const error = new Error("Không tìm thấy thiết bị");
    error.statusCode = 404;
    throw error;
  }

  const thiet_bi = danh_sach_thiet_bi[0];

  // Transaction
  const ket_qua_db = await prisma.$transaction(async (tx) => {
    // INSERT phieu_bao_tri
    const phieu_moi = await tx.$queryRaw`
      INSERT INTO phieu_bao_tri (id, thiet_bi_id, don_thue_id, ly_do, trang_thai, bat_dau_boi, bat_dau_luc, ghi_chu, created_at, updated_at)
      VALUES (gen_random_uuid(), ${thiet_bi_id}::uuid, ${don_thue_id}::uuid, ${ly_do || "Hư hỏng sau khi thuê"}, 'DANG_XU_LY', ${nhan_vien_id}::uuid, NOW(), ${ghi_chu || null}, NOW(), NOW())
      RETURNING id
    `;

    // UPDATE thiet_bi_vat_ly → BAO_TRI
    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET trang_thai = 'BAO_TRI', updated_at = NOW()
      WHERE id = ${thiet_bi_id}::uuid
    `;

    // INSERT lich_su_di_chuyen_thiet_bi
    await tx.$executeRaw`
      INSERT INTO lich_su_di_chuyen_thiet_bi (id, thiet_bi_id, don_thue_lien_quan_id, trang_thai_truoc, trang_thai_sau, loai_di_chuyen, ghi_chu, nguoi_thuc_hien_id, created_at)
      VALUES (gen_random_uuid(), ${thiet_bi_id}::uuid, ${don_thue_id}::uuid, ${thiet_bi.trang_thai}, 'BAO_TRI', 'BAO_TRI', ${`Tạo phiếu bảo trì: ${ly_do || "Hư hỏng sau khi thuê"}`}, ${nhan_vien_id}::uuid, NOW())
    `;

    return {
      id: phieu_moi[0].id,
      thiet_bi_id,
      trang_thai: "DANG_XU_LY",
    };
  });

  return ket_qua_db;
}

module.exports = {
  getLiquidationsList,
  getLiquidationDetail,
  uploadReturnImages,
  createReturnInspection,
  processRefundDeposit,
  processDeductDeposit,
  createMaintenanceRecord,
};
