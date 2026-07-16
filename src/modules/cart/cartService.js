const prisma = require("../../config/prisma");

const TRANG_THAI_MAU_THIET_BI_HIEN_THI = 601;

// Helper to calculate available quantity of an equipment model
async function tinhSoLuongKhaDungCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  // 1. Get total physical devices in state 501 (Sẵn sàng) and not deleted
  const poolResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM thiet_bi_vat_ly
    WHERE mau_thiet_bi_id = ${mauThietBiId}::uuid
      AND trang_thai = 501
      AND da_xoa_luc IS NULL
  `;
  const totalPhysical = poolResult[0]?.total || 0;

  // 2. Get overlapping booked quantity from orders in state 1102 (Đã giữ chỗ)
  // Both as main equipment model and secondary equipment model in bo_di_kem
  const bookedResult = await prisma.$queryRaw`
    SELECT (
      SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
      FROM chi_tiet_don_thue ctdt
      JOIN don_thue dt ON dt.id = ctdt.don_thue_id
      WHERE ctdt.mau_thiet_bi_id = ${mauThietBiId}::uuid
        AND dt.trang_thai = 1102
        AND dt.ngay_nhan < ${ngayTra}::timestamptz
        AND dt.ngay_tra > ${ngayNhan}::timestamptz
    ) + (
      SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
      FROM chi_tiet_don_thue ctdt
      JOIN don_thue dt ON dt.id = ctdt.don_thue_id
      JOIN bo_di_kem bdk ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id
      WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
        AND dt.trang_thai = 1102
        AND dt.ngay_nhan < ${ngayTra}::timestamptz
        AND dt.ngay_tra > ${ngayNhan}::timestamptz
    ) AS da_dat
  `;
  const totalBooked = bookedResult[0]?.da_dat || 0;

  const available = totalPhysical - totalBooked;
  return available > 0 ? available : 0;
}

// Helper to calculate available quantity of an accessory
async function tinhSoLuongKhaDungCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  // 1. Get total accessory quantity
  const poolResult = await prisma.$queryRaw`
    SELECT COALESCE(tong_so_luong, 0)::int AS total
    FROM phu_kien
    WHERE id = ${phuKienId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;
  if (poolResult.length === 0) {
    return 0;
  }
  const totalPhysical = poolResult[0].total;

  // 2. Get overlapping booked quantity from bo_di_kem orders in state 1102
  const bookedResult = await prisma.$queryRaw`
    SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS da_dat
    FROM chi_tiet_don_thue ctdt
    JOIN don_thue dt ON dt.id = ctdt.don_thue_id
    JOIN bo_di_kem bdk ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id
    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai = 1102
      AND dt.ngay_nhan < ${ngayTra}::timestamptz
      AND dt.ngay_tra > ${ngayNhan}::timestamptz
  `;
  const totalBooked = bookedResult[0]?.da_dat || 0;

  const available = totalPhysical - totalBooked;
  return available > 0 ? available : 0;
}

// Helper to check main equipment model and its bo_di_kem availability
async function checkAvailability(mauThietBiId, ngayNhan, ngayTra, requestedQty) {
  // 1. Check main model availability
  const mainAvailable = await tinhSoLuongKhaDungCuaMau(mauThietBiId, ngayNhan, ngayTra);
  if (mainAvailable < requestedQty) {
    return false;
  }

  // 2. Get bo_di_kem configured for this main model
  const boDiKem = await prisma.$queryRaw`
    SELECT id, so_luong, mau_thiet_bi_phu_id, phu_kien_id
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid
  `;

  // 3. Verify each component in bo_di_kem is available
  for (const item of boDiKem) {
    const requiredQty = Number(item.so_luong) * requestedQty;
    if (item.mau_thiet_bi_phu_id) {
      const phuAvailable = await tinhSoLuongKhaDungCuaMau(item.mau_thiet_bi_phu_id, ngayNhan, ngayTra);
      if (phuAvailable < requiredQty) {
        return false;
      }
    }
    if (item.phu_kien_id) {
      const pkAvailable = await tinhSoLuongKhaDungCuaPhuKien(item.phu_kien_id, ngayNhan, ngayTra);
      if (pkAvailable < requiredQty) {
        return false;
      }
    }
  }

  return true;
}

// 1. View Cart
async function layGioHangService(khachHangId) {
  // Find or create cart
  let cart = await prisma.$queryRaw`
    SELECT id FROM gio_hang WHERE khach_hang_id = ${khachHangId}::uuid LIMIT 1
  `;

  if (cart.length === 0) {
    const newCart = await prisma.$queryRaw`
      INSERT INTO gio_hang (id, khach_hang_id, created_at, updated_at)
      VALUES (gen_random_uuid(), ${khachHangId}::uuid, NOW(), NOW())
      RETURNING id
    `;
    cart = newCart;
  }

  const gioHangId = cart[0].id;

  // Get items
  const items = await prisma.$queryRaw`
    SELECT 
      ctgh.id,
      ctgh.mau_thiet_bi_id,
      ctgh.so_luong,
      ctgh.ngay_nhan,
      ctgh.ngay_tra,
      ctgh.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctgh.tien_coc_snapshot::text AS tien_coc_snapshot,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      dmtb.ten_danh_muc
    FROM chi_tiet_gio_hang ctgh
    JOIN mau_thiet_bi mtb ON mtb.id = ctgh.mau_thiet_bi_id
    JOIN danh_muc_thiet_bi dmtb ON dmtb.id = mtb.danh_muc_id
    WHERE ctgh.gio_hang_id = ${gioHangId}::uuid
    ORDER BY ctgh.created_at DESC
  `;

  return {
    gio_hang_id: gioHangId,
    items: items.map(item => ({
      ...item,
      so_luong: Number(item.so_luong),
      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot),
      tien_coc_snapshot: Number(item.tien_coc_snapshot)
    }))
  };
}

/*
// 2. Add to Cart
async function themVaoGioHangServiceLegacy(
  khachHangId,
  { mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra }
) {
  if (!mau_thiet_bi_id || !so_luong || !ngay_nhan || !ngay_tra) {
    throw new Error("Vui lòng cung cấp đầy đủ thông tin");
  }

  const parsedQty = parseInt(so_luong);

  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error("Số lượng phải lớn hơn 0");
  }

  const dateNhan = new Date(ngay_nhan);
  const dateTra = new Date(ngay_tra);

  if (
    isNaN(dateNhan.getTime()) ||
    isNaN(dateTra.getTime()) ||
    dateTra <= dateNhan
  ) {
    throw new Error("Ngày nhận và ngày trả không hợp lệ");
  }

  const cartInfo = await layGioHangService(khachHangId);
  const gioHangId = cartInfo.gio_hang_id;

  const modelResult = await prisma.$queryRaw`
    SELECT id, ten_mau, gia_thue_ngay, tien_coc 
    FROM mau_thiet_bi 
    WHERE id = ${mau_thiet_bi_id}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
    LIMIT 1
  `;

  if (modelResult.length === 0) {
    throw new Error("Mẫu thiết bị không tồn tại, đã bị xóa hoặc đang bị ẩn");
  }

  const model = modelResult[0];

  /*
    Tìm tất cả dòng cùng mẫu trong giỏ.

    Lưu ý:
    Mình chỉ kiểm tra mau_thiet_bi_id, không kiểm tra ngày nữa.
    Vì cùng mẫu thì phải gộp thành 1 dòng trong giỏ.
  */
/*
const existingItems = await prisma.$queryRaw`
    SELECT id, so_luong, created_at
    FROM chi_tiet_gio_hang
    WHERE gio_hang_id = ${gioHangId}::uuid
      AND mau_thiet_bi_id = ${mau_thiet_bi_id}::uuid
    ORDER BY created_at ASC
  `;
*/

/*
  Số lượng mẫu này đã có sẵn trong giỏ.
  Ví dụ khách đã có Sony A7 IV số lượng 2.
*/
/*
const soLuongDaCoTrongGio = existingItems.reduce((tong, item) => {
  return tong + Number(item.so_luong || 0);
}, 0);
*/

/*
  Số lượng mới muốn lưu vào giỏ.
  Ví dụ đã có 2, thêm tiếp 1 => cần kiểm tra 3.
*/
/*
const soLuongSauKhiThem = soLuongDaCoTrongGio + parsedQty;
*/

/*
  Kiểm tra khả dụng theo tổng số lượng sau khi thêm.

  checkAvailability là hàm cũ của bạn.
  Hàm này đang kiểm tra mẫu chính + bộ đi kèm theo ngày thuê.
*/
/*
const isAvailable = await checkAvailability(
  mau_thiet_bi_id,
  dateNhan,
  dateTra,
  soLuongSauKhiThem
);

if (!isAvailable) {
  if (soLuongDaCoTrongGio > 0) {
    throw new Error(
      `Bạn đã có ${soLuongDaCoTrongGio} bộ "${model.ten_mau}" trong giỏ. Vui lòng chỉnh số lượng trong giỏ hoặc chọn ngày khác.`
    );
  }

  throw new Error(
    `Thiết bị "${model.ten_mau}" không đủ số lượng sẵn sàng.`
  );
}

if (existingItems.length > 0) {
  const itemGiuLai = existingItems[0];
  const danhSachItemCanXoa = existingItems.slice(1).map((item) => item.id);
*/

  /*
    Nếu mẫu đã có trong giỏ:
    - cộng số lượng
    - cập nhật ngày nhận/ngày trả theo lần thêm mới nhất
    - cập nhật lại snapshot giá thuê và tiền cọc
  */
/*
  await prisma.$executeRaw`
      UPDATE chi_tiet_gio_hang
      SET
        so_luong = ${soLuongSauKhiThem},
        ngay_nhan = ${dateNhan}::timestamptz,
        ngay_tra = ${dateTra}::timestamptz,
        gia_thue_ngay_snapshot = ${model.gia_thue_ngay},
        tien_coc_snapshot = ${model.tien_coc},
        updated_at = NOW()
      WHERE id = ${itemGiuLai.id}::uuid
    `;
*/

  /*
    Nếu trước đó bị tách nhiều dòng cùng mẫu
    thì xóa các dòng trùng còn lại.
  */
/*
  for (const itemId of danhSachItemCanXoa) {
    await prisma.$executeRaw`
        DELETE FROM chi_tiet_gio_hang
        WHERE id = ${itemId}::uuid
      `;
  }
} else {
*/
  /*
    Nếu mẫu chưa có trong giỏ thì thêm mới.
  */
/*
  await prisma.$executeRaw`
      INSERT INTO chi_tiet_gio_hang (
        id,
        gio_hang_id,
        mau_thiet_bi_id,
        so_luong,
        ngay_nhan,
        ngay_tra,
        gia_thue_ngay_snapshot,
        tien_coc_snapshot,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${gioHangId}::uuid,
        ${mau_thiet_bi_id}::uuid,
        ${parsedQty},
        ${dateNhan}::timestamptz,
        ${dateTra}::timestamptz,
        ${model.gia_thue_ngay},
        ${model.tien_coc},
        NOW(),
        NOW()
      )
    `;
}

return { message: "Thêm vào giỏ hàng thành công" };
}
*/

async function themVaoGioHangService(
  khachHangId,
  { mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra }
) {
  if (!mau_thiet_bi_id || !so_luong || !ngay_nhan || !ngay_tra) {
    throw new Error("Vui lòng cung cấp đầy đủ thông tin");
  }

  const parsedQty = parseInt(so_luong);

  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error("Số lượng phải lớn hơn 0");
  }

  const dateNhan = new Date(ngay_nhan);
  const dateTra = new Date(ngay_tra);

  if (
    isNaN(dateNhan.getTime()) ||
    isNaN(dateTra.getTime()) ||
    dateTra <= dateNhan
  ) {
    throw new Error("Ngày nhận và ngày trả không hợp lệ");
  }

  const cartInfo = await layGioHangService(khachHangId);
  const gioHangId = cartInfo.gio_hang_id;

  const modelResult = await prisma.$queryRaw`
    SELECT id, ten_mau, gia_thue_ngay, tien_coc
    FROM mau_thiet_bi
    WHERE id = ${mau_thiet_bi_id}::uuid
      AND da_xoa_luc IS NULL
      AND trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
    LIMIT 1
  `;

  if (modelResult.length === 0) {
    throw new Error("Mẫu thiết bị không tồn tại hoặc đã bị xóa");
  }

  const model = modelResult[0];

  const existingItems = await prisma.$queryRaw`
    SELECT id, so_luong, created_at
    FROM chi_tiet_gio_hang
    WHERE gio_hang_id = ${gioHangId}::uuid
      AND mau_thiet_bi_id = ${mau_thiet_bi_id}::uuid
    ORDER BY created_at ASC
  `;

  const soLuongCu = existingItems.reduce((tong, item) => {
    return tong + Number(item.so_luong || 0);
  }, 0);

  const soLuongMoi = soLuongCu + parsedQty;

  const isAvailable = await checkAvailability(
    mau_thiet_bi_id,
    dateNhan,
    dateTra,
    soLuongMoi
  );

  if (!isAvailable) {
    throw new Error(
      `Thiết bị "${model.ten_mau}" không đủ số lượng khả dụng cho khoảng thời gian này`
    );
  }

  if (existingItems.length > 0) {
    const itemGiuLai = existingItems[0];
    const danhSachItemCanXoa = existingItems.slice(1).map((item) => item.id);

    await prisma.$executeRaw`
      UPDATE chi_tiet_gio_hang
      SET
        so_luong = ${soLuongMoi},
        ngay_nhan = ${dateNhan}::timestamptz,
        ngay_tra = ${dateTra}::timestamptz,
        gia_thue_ngay_snapshot = ${model.gia_thue_ngay},
        tien_coc_snapshot = ${model.tien_coc},
        updated_at = NOW()
      WHERE id = ${itemGiuLai.id}::uuid
    `;

    for (const itemId of danhSachItemCanXoa) {
      await prisma.$executeRaw`
        DELETE FROM chi_tiet_gio_hang
        WHERE id = ${itemId}::uuid
      `;
    }
  } else {
    await prisma.$executeRaw`
      INSERT INTO chi_tiet_gio_hang (
        id,
        gio_hang_id,
        mau_thiet_bi_id,
        so_luong,
        ngay_nhan,
        ngay_tra,
        gia_thue_ngay_snapshot,
        tien_coc_snapshot,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${gioHangId}::uuid,
        ${mau_thiet_bi_id}::uuid,
        ${parsedQty},
        ${dateNhan}::timestamptz,
        ${dateTra}::timestamptz,
        ${model.gia_thue_ngay},
        ${model.tien_coc},
        NOW(),
        NOW()
      )
    `;
  }

  return { message: "Thêm vào giỏ hàng thành công" };
}
// 3. Update Cart Item
async function capNhatSanPhamService(khachHangId, itemId, { so_luong, ngay_nhan, ngay_tra }) {
  // Verify item ownership
  const itemResult = await prisma.$queryRaw`
    SELECT ctgh.id, ctgh.mau_thiet_bi_id, ctgh.so_luong, ctgh.ngay_nhan, ctgh.ngay_tra, mtb.ten_mau
    FROM chi_tiet_gio_hang ctgh
    JOIN gio_hang gh ON gh.id = ctgh.gio_hang_id
    JOIN mau_thiet_bi mtb ON mtb.id = ctgh.mau_thiet_bi_id
    WHERE ctgh.id = ${itemId}::uuid AND gh.khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  if (itemResult.length === 0) {
    throw new Error("Sản phẩm trong giỏ hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn");
  }

  const item = itemResult[0];

  const parsedQty = so_luong !== undefined ? parseInt(so_luong) : item.so_luong;
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error("Số lượng phải lớn hơn 0");
  }

  const dateNhan = ngay_nhan ? new Date(ngay_nhan) : new Date(item.ngay_nhan);
  const dateTra = ngay_tra ? new Date(ngay_tra) : new Date(item.ngay_tra);
  if (isNaN(dateNhan.getTime()) || isNaN(dateTra.getTime()) || dateTra <= dateNhan) {
    throw new Error("Ngày nhận và ngày trả không hợp lệ");
  }

  // Check physical availability with the new quantity/dates
  const isAvailable = await checkAvailability(item.mau_thiet_bi_id, dateNhan, dateTra, parsedQty);
  if (!isAvailable) {
    throw new Error(`Thiết bị "${item.ten_mau}" không đủ số lượng khả dụng cho khoảng thời gian cập nhật`);
  }

  await prisma.$executeRaw`
    UPDATE chi_tiet_gio_hang
    SET so_luong = ${parsedQty},
        ngay_nhan = ${dateNhan}::timestamptz,
        ngay_tra = ${dateTra}::timestamptz,
        updated_at = NOW()
    WHERE id = ${itemId}::uuid
  `;

  return { message: "Cập nhật sản phẩm thành công" };
}

// 4. Delete Cart Item
async function xoaSanPhamService(khachHangId, itemId) {
  // Verify ownership before delete
  const itemResult = await prisma.$queryRaw`
    SELECT ctgh.id
    FROM chi_tiet_gio_hang ctgh
    JOIN gio_hang gh ON gh.id = ctgh.gio_hang_id
    WHERE ctgh.id = ${itemId}::uuid AND gh.khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  if (itemResult.length === 0) {
    throw new Error("Sản phẩm trong giỏ hàng không tồn tại hoặc không thuộc quyền sở hữu của bạn");
  }

  await prisma.$executeRaw`
    DELETE FROM chi_tiet_gio_hang WHERE id = ${itemId}::uuid
  `;

  return { message: "Xóa sản phẩm thành công" };
}

// 5. Checkout Cart Items
async function datHangService(khachHangId, { item_ids }) {
  if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một sản phẩm để đặt hàng");
  }

  // 1. Check user verification status
  const userResult = await prisma.$queryRaw`
    SELECT trang_thai_xac_minh FROM nguoi_dung WHERE id = ${khachHangId}::uuid LIMIT 1
  `;
  if (userResult.length === 0) {
    throw new Error("Tài khoản không tồn tại");
  }
  if (userResult[0].trang_thai_xac_minh !== 203) {
    throw new Error("Tài khoản chưa được xác minh danh tính (CCCD) để đặt thuê");
  }

  // 2. Fetch cart items
  const items = await prisma.$queryRaw`
    SELECT 
      ctgh.id, 
      ctgh.mau_thiet_bi_id, 
      ctgh.so_luong, 
      ctgh.ngay_nhan, 
      ctgh.ngay_tra,
      mtb.ten_mau,
      mtb.gia_thue_ngay,
      mtb.tien_coc
    FROM chi_tiet_gio_hang ctgh
    JOIN mau_thiet_bi mtb ON mtb.id = ctgh.mau_thiet_bi_id
    WHERE ctgh.id = ANY(${item_ids}::uuid[])
      AND ctgh.gio_hang_id = (SELECT id FROM gio_hang WHERE khach_hang_id = ${khachHangId}::uuid LIMIT 1)
  `;

  if (items.length !== item_ids.length) {
    throw new Error("Một số sản phẩm không tồn tại trong giỏ hàng của bạn");
  }

  // 3. Re-verify availability
  for (const item of items) {
    const isAvailable = await checkAvailability(item.mau_thiet_bi_id, item.ngay_nhan, item.ngay_tra, item.so_luong);
    if (!isAvailable) {
      throw new Error(`Thiết bị "${item.ten_mau}" không đủ số lượng khả dụng cho khoảng thời gian này`);
    }
  }

  // 4. Calculate total prices
  let totalDeposit = 0n;
  let totalRent = 0n;

  const itemDetails = items.map(item => {
    const diffTime = Math.abs(new Date(item.ngay_tra) - new Date(item.ngay_nhan));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const rentalDays = diffDays > 0 ? diffDays : 1;

    const itemDeposit = BigInt(item.tien_coc) * BigInt(item.so_luong);
    const itemRent = BigInt(item.gia_thue_ngay) * BigInt(item.so_luong) * BigInt(rentalDays);

    totalDeposit += itemDeposit;
    totalRent += itemRent;

    return {
      mau_thiet_bi_id: item.mau_thiet_bi_id,
      so_luong: item.so_luong,
      ngay_nhan: item.ngay_nhan,
      ngay_tra: item.ngay_tra,
      gia_thue_ngay_snapshot: item.gia_thue_ngay,
      tien_coc_snapshot: item.tien_coc,
      tien_thue: itemRent,
      tien_coc: itemDeposit
    };
  });

  const refCode = `TR-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

  // 5. Create Payment Session
  const paymentSessionId = await prisma.$transaction(async (tx) => {
    // Insert into phien_thanh_toan
    const [session] = await tx.$queryRaw`
      INSERT INTO phien_thanh_toan (
        id, khach_hang_id, trang_thai, tong_tien_coc, tong_tien_thue, ma_tham_chieu, het_han_luc, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${khachHangId}::uuid, 901, ${totalDeposit}, ${totalRent}, ${refCode}, ${expiresAt}::timestamptz, NOW(), NOW()
      )
      RETURNING id
    `;

    // Insert into chi_tiet_phien_thanh_toan
    for (const detail of itemDetails) {
      await tx.$executeRaw`
        INSERT INTO chi_tiet_phien_thanh_toan (
          id, phien_thanh_toan_id, mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra,
          gia_thue_ngay_snapshot, tien_coc_snapshot, tien_thue, tien_coc, created_at
        ) VALUES (
          gen_random_uuid(), ${session.id}::uuid, ${detail.mau_thiet_bi_id}::uuid, ${detail.so_luong}, ${detail.ngay_nhan}::timestamptz, ${detail.ngay_tra}::timestamptz,
          ${detail.gia_thue_ngay_snapshot}, ${detail.tien_coc_snapshot}, ${detail.tien_thue}, ${detail.tien_coc}, NOW()
        )
      `;
    }

    return session.id;
  });

  // Mock checkout URL redirecting to frontend checkout success simulator page
  // Using localhost address matching common client URL or backend simulator
  const checkoutUrl = `http://localhost:5173/payment-result?status=success&session_id=${paymentSessionId}`;

  // Update session with mock URL
  await prisma.$executeRaw`
    UPDATE phien_thanh_toan 
    SET checkout_url = ${checkoutUrl}
    WHERE id = ${paymentSessionId}::uuid
  `;

  return {
    phien_thanh_toan_id: paymentSessionId,
    checkout_url: checkoutUrl,
    ma_tham_chieu: refCode
  };
}


module.exports = {
  layGioHangService,
  themVaoGioHangService,
  capNhatSanPhamService,
  xoaSanPhamService,
  datHangService,
};
