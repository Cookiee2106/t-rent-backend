const prisma = require("../../config/prisma");

// -------------------------------------------------------
// 1. GET /payment-sessions/:id — Xem trạng thái phiên
// -------------------------------------------------------
async function layPhienThanhToanService(khachHangId, phienId) {
  const result = await prisma.$queryRaw`
    SELECT
      p.id,
      p.trang_thai,
      p.tong_tien_coc::text  AS tong_tien_coc,
      p.tong_tien_thue::text AS tong_tien_thue,
      p.ma_tham_chieu,
      p.checkout_url,
      p.het_han_luc,
      p.da_thanh_toan_luc,
      p.that_bai_luc,
      p.created_at
    FROM phien_thanh_toan p
    WHERE p.id = ${phienId}::uuid
      AND p.khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new Error("Phiên thanh toán không tồn tại");
  }

  const phien = result[0];

  const chiTiet = await prisma.$queryRaw`
    SELECT
      ctpt.id,
      ctpt.mau_thiet_bi_id,
      ctpt.so_luong,
      ctpt.ngay_nhan,
      ctpt.ngay_tra,
      ctpt.gia_thue_ngay_snapshot::text,
      ctpt.tien_coc_snapshot::text,
      ctpt.tien_thue::text,
      ctpt.tien_coc::text,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url
    FROM chi_tiet_phien_thanh_toan ctpt
    JOIN mau_thiet_bi mtb ON mtb.id = ctpt.mau_thiet_bi_id
    WHERE ctpt.phien_thanh_toan_id = ${phienId}::uuid
  `;

  return {
    ...phien,
    tong_tien_coc: Number(phien.tong_tien_coc),
    tong_tien_thue: Number(phien.tong_tien_thue),
    chi_tiet: chiTiet.map((d) => ({
      ...d,
      so_luong: Number(d.so_luong),
      gia_thue_ngay_snapshot: Number(d.gia_thue_ngay_snapshot),
      tien_coc_snapshot: Number(d.tien_coc_snapshot),
      tien_thue: Number(d.tien_thue),
      tien_coc: Number(d.tien_coc),
    })),
  };
}

// -------------------------------------------------------
// 2. POST /payment-webhooks — Nhận webhook & tạo đơn thuê
// -------------------------------------------------------
async function xuLyWebhookThanhToanService({ id_su_kien, phien_thanh_toan_id, payload }) {
  if (!id_su_kien || !phien_thanh_toan_id) {
    throw new Error("Thiếu thông tin webhook (id_su_kien hoặc phien_thanh_toan_id)");
  }

  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);

  // 1. Kiểm tra webhook đã xử lý chưa (idempotency)
  const daXuLy = await prisma.$queryRaw`
    SELECT id, da_xu_ly FROM webhook_thanh_toan
    WHERE id_su_kien = ${id_su_kien}
    LIMIT 1
  `;

  if (daXuLy.length > 0 && daXuLy[0].da_xu_ly) {
    return { message: "Webhook đã được xử lý trước đó", da_xu_ly: true };
  }

  // 2. Lưu webhook nếu chưa có
  if (daXuLy.length === 0) {
    await prisma.$executeRaw`
      INSERT INTO webhook_thanh_toan (id, id_su_kien, phien_thanh_toan_id, payload, da_xu_ly, created_at)
      VALUES (gen_random_uuid(), ${id_su_kien}, ${phien_thanh_toan_id}::uuid, ${payloadStr}, false, NOW())
    `;
  }

  // 3. Lấy phiên thanh toán
  const phienResult = await prisma.$queryRaw`
    SELECT id, khach_hang_id, trang_thai, tong_tien_coc, tong_tien_thue
    FROM phien_thanh_toan
    WHERE id = ${phien_thanh_toan_id}::uuid
    LIMIT 1
  `;

  if (phienResult.length === 0) {
    await prisma.$executeRaw`
      UPDATE webhook_thanh_toan
      SET da_xu_ly = false, loi_xu_ly = 'Phiên thanh toán không tồn tại', xu_ly_luc = NOW()
      WHERE id_su_kien = ${id_su_kien}
    `;
    throw new Error("Phiên thanh toán không tồn tại");
  }

  const phien = phienResult[0];

  // Nếu phiên không phải CHO_THANH_TOAN (901) → đã xử lý rồi
  if (phien.trang_thai !== 901) {
    await prisma.$executeRaw`
      UPDATE webhook_thanh_toan
      SET da_xu_ly = true, xu_ly_luc = NOW()
      WHERE id_su_kien = ${id_su_kien}
    `;
    return { message: "Phiên thanh toán đã được xử lý trước đó", da_xu_ly: true };
  }

  // 4. Lấy chi tiết phiên thanh toán để tạo đơn
  const chiTiet = await prisma.$queryRaw`
    SELECT id, mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra,
           gia_thue_ngay_snapshot, tien_coc_snapshot, tien_thue, tien_coc
    FROM chi_tiet_phien_thanh_toan
    WHERE phien_thanh_toan_id = ${phien_thanh_toan_id}::uuid
  `;

  if (chiTiet.length === 0) {
    throw new Error("Không tìm thấy chi tiết phiên thanh toán");
  }

  // 5. Tính ngày và tổng tiền cho đơn thuê
  const tatCaNgayNhan = chiTiet.map((d) => new Date(d.ngay_nhan));
  const tatCaNgayTra  = chiTiet.map((d) => new Date(d.ngay_tra));
  const ngayNhanDon   = new Date(Math.min(...tatCaNgayNhan.map((d) => d.getTime())));
  const ngayTraDon    = new Date(Math.max(...tatCaNgayTra.map((d) => d.getTime())));

  const diffMs     = ngayTraDon - ngayNhanDon;
  const soNgayThue = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const tongTienThue = chiTiet.reduce((tong, d) => tong + BigInt(d.tien_thue), 0n);
  const tongTienCoc  = chiTiet.reduce((tong, d) => tong + BigInt(d.tien_coc), 0n);

  const maDon = `TR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 6. Thực thi trong transaction
  const donThueId = await prisma.$transaction(async (tx) => {
    // a) Cập nhật phiên thanh toán → DA_THANH_TOAN (902)
    await tx.$executeRaw`
      UPDATE phien_thanh_toan
      SET trang_thai = 902, da_thanh_toan_luc = NOW(), updated_at = NOW()
      WHERE id = ${phien_thanh_toan_id}::uuid
    `;

    // b) Tạo đơn thuê trạng thái DA_GIU_CHO (1102)
    const [donMoi] = await tx.$queryRaw`
      INSERT INTO don_thue (
        id, ma_don, khach_hang_id, phien_thanh_toan_id,
        ngay_nhan, ngay_tra, so_ngay_thue, tong_tien_thue, tong_tien_coc,
        trang_thai, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${maDon}, ${phien.khach_hang_id}::uuid, ${phien_thanh_toan_id}::uuid,
        ${ngayNhanDon}::timestamptz, ${ngayTraDon}::timestamptz, ${soNgayThue},
        ${tongTienThue}, ${tongTienCoc},
        1102, NOW(), NOW()
      )
      RETURNING id, ma_don
    `;

    // c) Tạo chi tiết đơn thuê từ chi tiết phiên
    for (const ct of chiTiet) {
      await tx.$executeRaw`
        INSERT INTO chi_tiet_don_thue (
          id, don_thue_id, mau_thiet_bi_id, so_luong,
          gia_thue_ngay_snapshot, tien_coc_snapshot, tien_thue, tien_coc,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), ${donMoi.id}::uuid, ${ct.mau_thiet_bi_id}::uuid, ${ct.so_luong},
          ${ct.gia_thue_ngay_snapshot}, ${ct.tien_coc_snapshot}, ${ct.tien_thue}, ${ct.tien_coc},
          NOW(), NOW()
        )
      `;
    }

    // d) Ghi dòng tiền TIEN_COC (2301)
    await tx.$executeRaw`
      INSERT INTO thanh_toan (
        id, don_thue_id, phien_thanh_toan_id, so_tien, loai_dong_tien_id,
        ma_giao_dich, ghi_chu, created_at
      ) VALUES (
        gen_random_uuid(), ${donMoi.id}::uuid, ${phien_thanh_toan_id}::uuid,
        ${tongTienCoc}, 2301,
        ${id_su_kien}, 'Thanh toán tiền đặt cọc qua cổng thanh toán', NOW()
      )
    `;

    // e) Xóa các sản phẩm đã đặt khỏi giỏ hàng
    for (const ct of chiTiet) {
      await tx.$executeRaw`
        DELETE FROM chi_tiet_gio_hang ctgh
        USING gio_hang gh
        WHERE ctgh.gio_hang_id = gh.id
          AND gh.khach_hang_id = ${phien.khach_hang_id}::uuid
          AND ctgh.mau_thiet_bi_id = ${ct.mau_thiet_bi_id}::uuid
          AND ctgh.ngay_nhan = ${new Date(ct.ngay_nhan)}::timestamptz
          AND ctgh.ngay_tra  = ${new Date(ct.ngay_tra)}::timestamptz
      `;
    }

    // f) Đánh dấu webhook đã xử lý
    await tx.$executeRaw`
      UPDATE webhook_thanh_toan
      SET da_xu_ly = true, xu_ly_luc = NOW()
      WHERE id_su_kien = ${id_su_kien}
    `;

    return donMoi.id;
  });

  return {
    message: "Thanh toán thành công, đơn thuê đã được tạo",
    don_thue_id: donThueId,
    ma_don: maDon,
  };
}

module.exports = {
  layPhienThanhToanService,
  xuLyWebhookThanhToanService,
};
