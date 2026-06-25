const prisma = require("../../utils/prisma");
const { buildPaymentUrl, verifyIpn, verifyReturnUrl: verifyReturnUrlUtil } = require("../../utils/vnpay");
const { generateUniqueOrderCode } = require("../../utils/orderCode");

// ============================================================
// Tao URL thanh toan VNPAY
// ============================================================
async function taoUrlThanhToanVnpay(nguoi_dung_id, phien_thanh_toan_id, ip_client) {
  // Buoc 1: Validate input
  if (!phien_thanh_toan_id) {
    const error = new Error("Vui lòng cung cấp phiên thanh toán");
    error.statusCode = 400;
    throw error;
  }

  // Buoc 2: Lay ho so khach hang
  const danh_sach_ho_so = await prisma.$queryRaw`
    SELECT id
    FROM ho_so_khach_hang
    WHERE nguoi_dung_id = ${nguoi_dung_id}
    LIMIT 1
  `;

  if (!danh_sach_ho_so || danh_sach_ho_so.length === 0) {
    const error = new Error("Không tìm thấy tài khoản");
    error.statusCode = 404;
    throw error;
  }

  const khach_hang_id = danh_sach_ho_so[0].id;

  // Buoc 3: Tim phien_thanh_toan theo id + khach_hang_id
  const danh_sach_phien = await prisma.$queryRaw`
    SELECT
      id,
      trang_thai,
      tong_tien_thue,
      tong_tien_coc,
      tong_tien_thanh_toan,
      het_han_luc,
      khach_hang_id
    FROM phien_thanh_toan
    WHERE id = ${phien_thanh_toan_id}
      AND khach_hang_id = ${khach_hang_id}
    LIMIT 1
  `;

  // Buoc 4: Khong co phien_thanh_toan
  if (!danh_sach_phien || danh_sach_phien.length === 0) {
    const error = new Error("Không tìm thấy phiên thanh toán");
    error.statusCode = 404;
    throw error;
  }

  const phien = danh_sach_phien[0];

  // Buoc 5: Kiem tra trang_thai
  if (phien.trang_thai === "DA_THANH_TOAN") {
    const error = new Error("Phiên thanh toán đã được thanh toán");
    error.statusCode = 400;
    throw error;
  }

  if (!["SAN_SANG_THANH_TOAN", "DANG_CHO_THANH_TOAN"].includes(phien.trang_thai)) {
    const error = new Error("Phiên thanh toán không hợp lệ để tạo URL thanh toán");
    error.statusCode = 400;
    throw error;
  }

  // Buoc 6: Kiem tra het han
  if (phien.het_han_luc && new Date(phien.het_han_luc) < new Date()) {
    await prisma.$executeRaw`
      UPDATE phien_thanh_toan
      SET trang_thai = 'HET_HAN'
      WHERE id = ${phien.id}
    `;
    const error = new Error("Phiên thanh toán đã hết hạn");
    error.statusCode = 400;
    throw error;
  }

  // Buoc 7: Neu DANG_CHO_THANH_TOAN, tra lai thanh_toan cu
  if (phien.trang_thai === "DANG_CHO_THANH_TOAN") {
    const thanh_toan_cu = await prisma.$queryRaw`
      SELECT id, trang_thai, duong_dan_thanh_toan
      FROM thanh_toan
      WHERE phien_thanh_toan_id = ${phien.id}
        AND trang_thai = 'CHO_THANH_TOAN'
      LIMIT 1
    `;

    if (thanh_toan_cu && thanh_toan_cu.length > 0) {
      return {
        thanh_toan_id: thanh_toan_cu[0].id,
        phien_thanh_toan_id: phien.id,
        duong_dan_thanh_toan: thanh_toan_cu[0].duong_dan_thanh_toan,
        so_tien: parseFloat(phien.tong_tien_thanh_toan),
        trang_thai: "DANG_CHO_THANH_TOAN",
        phuong_thuc: "THANH_TOAN_ONLINE",
        nha_cung_cap: "VNPAY",
      };
    }
  }

  // Buoc 8: Tao thanh_toan moi
  const thanh_toan_moi = await prisma.$queryRaw`
    INSERT INTO thanh_toan (
      phien_thanh_toan_id,
      loai_thanh_toan,
      so_tien,
      phuong_thuc,
      nha_cung_cap,
      trang_thai,
      ip_address,
      user_agent,
      created_at,
      updated_at
    )
    VALUES (
      ${phien.id},
      'TIEN_COC',
      ${parseFloat(phien.tong_tien_thanh_toan)},
      'THANH_TOAN_ONLINE',
      'VNPAY',
      'CHO_THANH_TOAN',
      ${ip_client || null},
      null,
      NOW(),
      NOW()
    )
    RETURNING id, trang_thai
  `;

  const thanh_toan = thanh_toan_moi[0];

  // Buoc 9: Cap nhat phien_thanh_toan sang DANG_CHO_THANH_TOAN
  if (phien.trang_thai === "SAN_SANG_THANH_TOAN") {
    await prisma.$executeRaw`
      UPDATE phien_thanh_toan
      SET trang_thai = 'DANG_CHO_THANH_TOAN', updated_at = NOW()
      WHERE id = ${phien.id}
    `;
  }

  // Buoc 10: Tao URL thanh toan VNPAY
  const url_tra_ve =
    process.env.VNPAY_RETURN_URL ||
    `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-result`;
  const url_ipn =
    process.env.VNPAY_IPN_URL ||
    `${process.env.BACKEND_URL || "http://localhost:4000"}/api/payments/vnpay/ipn`;

  const { paymentUrl } = buildPaymentUrl({
    orderId: thanh_toan.id,
    amount: parseFloat(phien.tong_tien_thanh_toan),
    orderInfo: `T-Rent: Thanh toan coc ${phien.id.substring(0, 8)}`,
    returnUrl: url_tra_ve,
    ipnUrl: url_ipn,
    clientIp: ip_client,
  });

  // Buoc 11: Luu duong_dan_thanh_toan vao thanh_toan
  await prisma.$executeRaw`
    UPDATE thanh_toan
    SET duong_dan_thanh_toan = ${paymentUrl}
    WHERE id = ${thanh_toan.id}
  `;

  return {
    thanh_toan_id: thanh_toan.id,
    phien_thanh_toan_id: phien.id,
    duong_dan_thanh_toan: paymentUrl,
    so_tien: parseFloat(phien.tong_tien_thanh_toan),
    trang_thai: "DANG_CHO_THANH_TOAN",
    phuong_thuc: "THANH_TOAN_ONLINE",
    nha_cung_cap: "VNPAY",
  };
}

// ============================================================
// Xu ly tra ve tu VNPAY (chi tra ket qua, khong tao don)
// ============================================================
function verifyReturnUrl(query) {
  return verifyReturnUrlUtil(query);
}

async function xuLyTraVeVnpay(query) {
  const ma_phan_hoi = query.vnp_ResponseCode;
  const tham_chieu = query.vnp_TxnRef;
  const ma_giao_dich = query.vnp_TransactionNo;
  const so_tien = query.vnp_Amount;

  return {
    ma_phan_hoi,
    tham_chieu,
    ma_giao_dich,
    so_tien,
    thanh_cong: ma_phan_hoi === "00",
  };
}

// ============================================================
// Helper: Xu ly thanh toan thanh cong (dung chung cho IPN that va simulate)
// ============================================================
async function helperXuLyThanhToanThanhCong({
  thanh_toan_id,
  ma_giao_dich_provider,
  du_lieu_provider,
}) {
  // Buoc 1: Tim thanh_toan va phien_thanh_toan (de lay khach_hang_id)
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT
      t.id,
      t.trang_thai,
      t.so_tien,
      t.don_thue_id,
      t.phien_thanh_toan_id,
      p.khach_hang_id
    FROM thanh_toan t
    JOIN phien_thanh_toan p ON p.id = t.phien_thanh_toan_id
    WHERE t.id = ${thanh_toan_id}
    LIMIT 1
  `;

  if (!danh_sach_thanh_toan || danh_sach_thanh_toan.length === 0) {
    return {
      thanh_toan_id,
      phien_thanh_toan_id: null,
      don_thue_id: null,
      ma_don: null,
      so_tien: null,
      trang_thai: null,
      ma_giao_dich_provider: null,
      da_thanh_toan_luc: null,
      da_xu_ly_truoc_do: false,
      loi: "Không tìm thấy thanh toán",
    };
  }

  const thanh_toan = danh_sach_thanh_toan[0];

  // Buoc 2: Kiem tra phien_thanh_toan_id
  if (!thanh_toan.phien_thanh_toan_id) {
    return {
      thanh_toan_id: thanh_toan.id,
      phien_thanh_toan_id: null,
      don_thue_id: null,
      ma_don: null,
      so_tien: parseFloat(thanh_toan.so_tien),
      trang_thai: thanh_toan.trang_thai,
      ma_giao_dich_provider: null,
      da_thanh_toan_luc: null,
      da_xu_ly_truoc_do: false,
      loi: "Thanh toán không có phiên thanh toán",
    };
  }

  // Buoc 3: Idempotent - da xu ly thanh cong roi
  if (thanh_toan.trang_thai === "DA_THANH_TOAN" && thanh_toan.don_thue_id) {
    // Query lai de lay ma_don
    const don_thue_info = await prisma.$queryRaw`
      SELECT ma_don FROM don_thue WHERE id = ${thanh_toan.don_thue_id} LIMIT 1
    `;

    return {
      thanh_toan_id: thanh_toan.id,
      phien_thanh_toan_id: thanh_toan.phien_thanh_toan_id,
      don_thue_id: thanh_toan.don_thue_id,
      ma_don: don_thue_info && don_thue_info[0] ? don_thue_info[0].ma_don : null,
      so_tien: parseFloat(thanh_toan.so_tien),
      trang_thai: "DA_THANH_TOAN",
      ma_giao_dich_provider: null,
      da_thanh_toan_luc: null,
      da_xu_ly_truoc_do: true,
      loi: null,
    };
  }

  // Buoc 4: Kiem tra thanh_toan khong o trang_thai CHO_THANH_TOAN
  if (thanh_toan.trang_thai !== "CHO_THANH_TOAN") {
    return {
      thanh_toan_id: thanh_toan.id,
      phien_thanh_toan_id: thanh_toan.phien_thanh_toan_id,
      don_thue_id: thanh_toan.don_thue_id,
      ma_don: null,
      so_tien: parseFloat(thanh_toan.so_tien),
      trang_thai: thanh_toan.trang_thai,
      ma_giao_dich_provider: null,
      da_thanh_toan_luc: null,
      da_xu_ly_truoc_do: false,
      loi: "Thanh toán không ở trạng thái chờ thanh toán",
    };
  }

  // Buoc 5: Xu ly tao don_thue
  for (let lan_thu = 0; lan_thu < 5; lan_thu++) {
    try {
      const ket_qua = await prisma.$transaction(async (tx) => {
        // Lay chi_tiet_phien_thanh_toan
        const danh_sach_chi_tiet = await tx.$queryRaw`
          SELECT
            mau_thiet_bi_id,
            so_luong,
            ngay_nhan,
            ngay_tra,
            gia_thue_ngay_snapshot,
            tien_coc_snapshot,
            tien_thue,
            tien_coc
          FROM chi_tiet_phien_thanh_toan
          WHERE phien_thanh_toan_id = ${thanh_toan.phien_thanh_toan_id}
        `;

        // Check chi_tiet_phien_thanh_toan rong
        if (!danh_sach_chi_tiet || danh_sach_chi_tiet.length === 0) {
          const error = new Error("Phiên thanh toán không có chi tiết");
          error.statusCode = 400;
          throw error;
        }

        // Tinh ngay thue
        let ngay_bat_dau = null;
        let ngay_ket_thuc = null;
        for (const item of danh_sach_chi_tiet) {
          const bd = new Date(item.ngay_nhan);
          const kt = new Date(item.ngay_tra);
          if (!ngay_bat_dau || bd < ngay_bat_dau) ngay_bat_dau = bd;
          if (!ngay_ket_thuc || kt > ngay_ket_thuc) ngay_ket_thuc = kt;
        }

        const so_ngay_thue = Math.ceil(
          (ngay_ket_thuc.getTime() - ngay_bat_dau.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Lay tong tien tu phien_thanh_toan
        const phien_info = await tx.$queryRaw`
          SELECT tong_tien_thue, tong_tien_coc, xac_nhan_dieu_khoan_id
          FROM phien_thanh_toan
          WHERE id = ${thanh_toan.phien_thanh_toan_id}
          LIMIT 1
        `;

        const tong_tien_thue = parseFloat(phien_info[0].tong_tien_thue);
        const tong_tien_coc = parseFloat(phien_info[0].tong_tien_coc);
        const xac_nhan_dieu_khoan_id = phien_info[0].xac_nhan_dieu_khoan_id;

        // Sinh ma don voi ma thiet bi tu phien_thanh_toan
        const ma_don = await generateUniqueOrderCode(tx, thanh_toan.phien_thanh_toan_id);

        // Tao don_thue
        const don_thue_moi = await tx.$queryRaw`
          INSERT INTO don_thue (
            ma_don,
            khach_hang_id,
            ngay_nhan,
            ngay_tra,
            so_ngay_thue,
            tong_tien_thue,
            tong_tien_coc,
            trang_thai,
            created_at,
            updated_at
          )
          VALUES (
            ${ma_don},
            ${thanh_toan.khach_hang_id},
            ${ngay_bat_dau},
            ${ngay_ket_thuc},
            ${so_ngay_thue},
            ${tong_tien_thue},
            ${tong_tien_coc},
            'DA_GIU_CHO',
            NOW(),
            NOW()
          )
          RETURNING id, created_at
        `;

        const don_thue = don_thue_moi[0];

        // Tao chi_tiet_don_thue
        for (const item of danh_sach_chi_tiet) {
          const so_ngay_item = Math.ceil(
            (new Date(item.ngay_tra).getTime() - new Date(item.ngay_nhan).getTime()) / (1000 * 60 * 60 * 24)
          );
          const tien_thue_item = parseFloat(item.gia_thue_ngay_snapshot) * item.so_luong * so_ngay_item;
          const tien_coc_item = parseFloat(item.tien_coc_snapshot) * item.so_luong;

          await tx.$queryRaw`
            INSERT INTO chi_tiet_don_thue (
              don_thue_id,
              mau_thiet_bi_id,
              so_luong,
              gia_thue_ngay_snapshot,
              tien_coc_snapshot,
              tien_thue,
              tien_coc,
              trang_thai,
              created_at,
              updated_at
            )
            VALUES (
              ${don_thue.id},
              ${item.mau_thiet_bi_id},
              ${item.so_luong},
              ${item.gia_thue_ngay_snapshot},
              ${item.tien_coc_snapshot},
              ${tien_thue_item},
              ${tien_coc_item},
              'CHO_CHUAN_BI',
              NOW(),
              NOW()
            )
          `;
        }

        // Cap nhat thanh_toan
        await tx.$executeRaw`
          UPDATE thanh_toan
          SET
            trang_thai = 'DA_THANH_TOAN',
            don_thue_id = ${don_thue.id},
            ma_giao_dich_provider = ${ma_giao_dich_provider},
            du_lieu_provider = ${du_lieu_provider ? JSON.stringify(du_lieu_provider) : null},
            da_thanh_toan_luc = NOW(),
            updated_at = NOW()
          WHERE id = ${thanh_toan.id}
        `;

        // Cap nhat phien_thanh_toan
        await tx.$executeRaw`
          UPDATE phien_thanh_toan
          SET
            trang_thai = 'DA_THANH_TOAN',
            da_thanh_toan_luc = NOW(),
            updated_at = NOW()
          WHERE id = ${thanh_toan.phien_thanh_toan_id}
        `;

        // Cap nhat xac_nhan_dieu_khoan (neu co)
        if (xac_nhan_dieu_khoan_id) {
          await tx.$executeRaw`
            UPDATE xac_nhan_dieu_khoan
            SET don_thue_id = ${don_thue.id}
            WHERE id = ${xac_nhan_dieu_khoan_id}
              AND don_thue_id IS NULL
          `;
        }

        // Cap nhat chi_tiet_gio_hang - chi update nhung item thuoc phien thanh toan
        await tx.$executeRaw`
          UPDATE chi_tiet_gio_hang
          SET trang_thai = 'DA_DAT',
              updated_at = NOW()
          WHERE id IN (
            SELECT chi_tiet_gio_hang_id
            FROM chi_tiet_phien_thanh_toan
            WHERE phien_thanh_toan_id = ${thanh_toan.phien_thanh_toan_id}
              AND chi_tiet_gio_hang_id IS NOT NULL
          )
            AND trang_thai = 'HOAT_DONG'
        `;

        return {
          don_thue_id: don_thue.id,
          ma_don: ma_don,
          da_thanh_toan_luc: don_thue.created_at,
        };
      });

      return {
        thanh_toan_id: thanh_toan.id,
        phien_thanh_toan_id: thanh_toan.phien_thanh_toan_id,
        don_thue_id: ket_qua.don_thue_id,
        ma_don: ket_qua.ma_don,
        so_tien: parseFloat(thanh_toan.so_tien),
        trang_thai: "DA_THANH_TOAN",
        ma_giao_dich_provider,
        da_thanh_toan_luc: ket_qua.da_thanh_toan_luc,
        da_xu_ly_truoc_do: false,
        loi: null,
      };
    } catch (error) {
      const isUniqueError =
        error.code === "P2002" ||
        error.code === "23505" ||
        (error.message && error.message.includes("Unique constraint")) ||
        (error.message && error.message.includes("duplicate key")) ||
        (error.meta && error.meta.target && error.meta.target.includes("ma_don"));

      if (isUniqueError) {
        console.log("Ma don trung, thu lai lan " + (lan_thu + 1) + "/5");
        continue;
      }
      throw error;
    }
  }

  throw new Error("Không tạo được mã đơn hàng sau 5 lần thử");
}

// ============================================================
// Xu ly IPN tu VNPAY (IPN that)
// ============================================================
async function xuLyIpnVnpay(query) {
  // Buoc 1: Xac minh chu ky VNPAY
  const hop_le = verifyIpn(query);
  if (!hop_le) {
    return { RspCode: "97", Message: "Chữ ký không hợp lệ" };
  }

  // Buoc 2: Parse thong tin
  const so_tien_vnp = parseInt(query.vnp_Amount, 10);
  const tham_chieu = query.vnp_TxnRef;
  const ma_phan_hoi = query.vnp_ResponseCode;
  const ma_giao_dich = query.vnp_TransactionNo;

  if (!tham_chieu) {
    return { RspCode: "99", Message: "Không tìm thấy mã tham chiếu" };
  }

  if (query.vnp_TransactionNo === "0") {
    return { RspCode: "99", Message: "Không có mã giao dịch" };
  }

  // Buoc 3: Tim thanh_toan de verify so tien
  const danh_sach_thanh_toan = await prisma.$queryRaw`
    SELECT id, trang_thai, so_tien, don_thue_id, phien_thanh_toan_id
    FROM thanh_toan
    WHERE id = ${tham_chieu}
    LIMIT 1
  `;

  if (!danh_sach_thanh_toan || danh_sach_thanh_toan.length === 0) {
    return { RspCode: "01", Message: "Không tìm thấy giao dịch thanh toán" };
  }

  const thanh_toan = danh_sach_thanh_toan[0];

  // Buoc 4: Idempotent
  if (thanh_toan.trang_thai === "DA_THANH_TOAN" && thanh_toan.don_thue_id) {
    return { RspCode: "00", Message: "Giao dịch đã được xử lý" };
  }

  // Buoc 5: Verify so tien
  const so_tien_expected = Math.round(Number(thanh_toan.so_tien) * 100);
  if (so_tien_vnp !== so_tien_expected) {
    return { RspCode: "04", Message: "Số tiền không đúng" };
  }

  // Buoc 6: Xu ly thanh cong
  if (ma_phan_hoi === "00") {
    try {
      const ket_qua = await helperXuLyThanhToanThanhCong({
        thanh_toan_id: tham_chieu,
        ma_giao_dich_provider: ma_giao_dich,
        du_lieu_provider: query,
      });

      if (ket_qua.loi) {
        console.error("IPN loi:", ket_qua.loi);
        return { RspCode: "99", Message: "Lỗi hệ thống" };
      }

      console.log("Don tao qua IPN:", ket_qua.don_thue_id);
      return { RspCode: "00", Message: "Xác nhận thanh toán thành công" };
    } catch (error) {
      console.error("IPN that bai:", error);
      return { RspCode: "99", Message: "Lỗi hệ thống" };
    }
  }

  // Buoc 7: Xu ly that bai
  await prisma.$executeRaw`
    UPDATE thanh_toan
    SET trang_thai = 'THAT_BAI', updated_at = NOW()
    WHERE id = ${tham_chieu}
  `;

  if (thanh_toan.phien_thanh_toan_id) {
    await prisma.$executeRaw`
      UPDATE phien_thanh_toan
      SET trang_thai = 'THANH_TOAN_THAT_BAI', that_bai_luc = NOW(), updated_at = NOW()
      WHERE id = ${thanh_toan.phien_thanh_toan_id}
    `;
  }

  return { RspCode: "00", Message: "Xác nhận thanh toán thất bại" };
}

// ============================================================
// Simulate IPN thanh cong (test - khong can VNPAY that)
// ============================================================
async function simulateIpnThanhCong(nguoi_dung_id, thanh_toan_id) {
  // Buoc 1: Kiem tra moi truong
  if (process.env.NODE_ENV === "production") {
    throw new Error("Hàm chỉ khả dụng trong môi trường test");
  }

  // Buoc 2: Validate input
  if (!thanh_toan_id) {
    throw new Error("Vui lòng cung cấp thanh toán");
  }

  // Buoc 3: Kiem tra thanh_toan thuoc khach hien tai
  const danh_sach_kiem_tra = await prisma.$queryRaw`
    SELECT t.id
    FROM thanh_toan t
    JOIN phien_thanh_toan p ON p.id = t.phien_thanh_toan_id
    JOIN ho_so_khach_hang h ON h.id = p.khach_hang_id
    WHERE t.id = ${thanh_toan_id}
      AND h.nguoi_dung_id = ${nguoi_dung_id}
    LIMIT 1
  `;

  if (!danh_sach_kiem_tra || danh_sach_kiem_tra.length === 0) {
    return {
      thanh_toan_id,
      phien_thanh_toan_id: null,
      don_thue_id: null,
      ma_don: null,
      so_tien: null,
      trang_thai: null,
      ma_giao_dich_provider: null,
      da_thanh_toan_luc: null,
      da_xu_ly_truoc_do: false,
      loi: "Thanh toán không hợp lệ",
    };
  }

  // Buoc 4: Xu ly thanh toan thanh cong (goi helper chung)
  const ma_giao_dich = "SIMULATE_" + Date.now();

  return helperXuLyThanhToanThanhCong({
    thanh_toan_id,
    ma_giao_dich_provider: ma_giao_dich,
    du_lieu_provider: { test: true },
  });
}

module.exports = {
  taoUrlThanhToanVnpay,
  xuLyTraVeVnpay,
  xuLyIpnVnpay,
  simulateIpnThanhCong,
  verifyReturnUrl,
};
