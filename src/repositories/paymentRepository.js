const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const TRANG_THAI_MAU_THIET_BI_HIEN_THI = 601;
const TRANG_THAI_THIET_BI_SAN_SANG = 501;
const TRANG_THAI_PHU_KIEN_HIEN_THI = 601;

const PHIEN_CHO_THANH_TOAN = 901;
const PHIEN_DA_THANH_TOAN = 902;
const PHIEN_THAT_BAI = 903;
const PHIEN_HET_HAN = 904;

const DON_DA_GIU_CHO = 1102;
const DON_DANG_THUE = 1103;
const DON_QUA_HAN = 1105;
const LOAI_TIEN_COC = 2301;

async function layKhachHangTheoId(nguoiDungId) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      ho_ten,
      email,
      trang_thai_xac_minh
    FROM nguoi_dung
    WHERE id = ${nguoiDungId}::uuid
      AND vai_tro = 'KHACH_HANG'
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layGioHangTheoKhachHang(khachHangId) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM gio_hang
    WHERE khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}


async function layItemGioHangDuocChon(gioHangId, itemIds = []) {
  if (itemIds.length > 0) {
    return await prisma.$queryRaw`
      SELECT
        c.id,
        c.mau_thiet_bi_id,
        c.so_luong,
        c.ngay_nhan,
        c.ngay_tra,
        c.gia_thue_ngay_snapshot,
        c.gia_tri_thiet_bi_snapshot,
        c.ty_le_coc_snapshot,
        c.tien_coc_snapshot,
        mtb.gia_thue_ngay AS gia_thue_ngay_hien_tai,
        mtb.gia_tri_thiet_bi AS gia_tri_thiet_bi_hien_tai,
        mtb.ty_le_coc AS ty_le_coc_hien_tai,
        h.ten_hang,
        mtb.ten_mau
      FROM chi_tiet_gio_hang c
      JOIN mau_thiet_bi mtb
        ON mtb.id = c.mau_thiet_bi_id
      LEFT JOIN hang_thiet_bi h
        ON h.id = mtb.hang_id
      WHERE c.gio_hang_id = ${gioHangId}::uuid
        AND c.id::text IN (${Prisma.join(itemIds)})
        AND mtb.da_xoa_luc IS NULL
        AND mtb.trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
      ORDER BY c.created_at ASC
    `;
  }

  return await prisma.$queryRaw`
    SELECT
      c.id,
      c.mau_thiet_bi_id,
      c.so_luong,
      c.ngay_nhan,
      c.ngay_tra,
      c.gia_thue_ngay_snapshot,
      c.gia_tri_thiet_bi_snapshot,
      c.ty_le_coc_snapshot,
      c.tien_coc_snapshot,
      mtb.gia_thue_ngay AS gia_thue_ngay_hien_tai,
      mtb.gia_tri_thiet_bi AS gia_tri_thiet_bi_hien_tai,
      mtb.ty_le_coc AS ty_le_coc_hien_tai,
      h.ten_hang,
      mtb.ten_mau
    FROM chi_tiet_gio_hang c
    JOIN mau_thiet_bi mtb
      ON mtb.id = c.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id
    WHERE c.gio_hang_id = ${gioHangId}::uuid
      AND mtb.da_xoa_luc IS NULL
      AND mtb.trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
    ORDER BY c.created_at ASC
  `;
}

async function capNhatSnapshotGioHangKhiXacNhan(gioHangId, danhSachItem = []) {
  if (!Array.isArray(danhSachItem) || danhSachItem.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of danhSachItem) {
      await tx.$executeRaw`
        UPDATE chi_tiet_gio_hang
        SET
          gia_thue_ngay_snapshot = ${Number(item.gia_thue_ngay_snapshot)},
          gia_tri_thiet_bi_snapshot = ${Number(item.gia_tri_thiet_bi_snapshot)},
          ty_le_coc_snapshot = ${Number(item.ty_le_coc_snapshot)},
          tien_coc_snapshot = ${Number(item.tien_coc_snapshot)}
        WHERE id = ${item.id}::uuid
          AND gio_hang_id = ${gioHangId}::uuid
      `;
    }
  });
}

async function tinhSoLuongKhaDungCuaMau(
  mauThietBiId,
  ngayNhan,
  ngayTra,
  db = prisma,
  phienLoaiTruId = null
) {
  const rows = await db.$queryRaw`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = ${mauThietBiId}::uuid
          AND tbvl.trang_thai = ${TRANG_THAI_THIET_BI_SAN_SANG}
          AND tbvl.da_xoa_luc IS NULL
      )
      -
      (
        SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        WHERE ctdt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          -- Giữ nguyên logic mẫu thiết bị: chỉ trừ đơn 1102.
          -- Đơn 1103/1105 đã làm thiết bị vật lý rời trạng thái 501 nên không trừ lại.
          AND dt.trang_thai = ${DON_DA_GIU_CHO}
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      -
      (
        SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id
        WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
          AND dt.trang_thai = ${DON_DA_GIU_CHO}
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      -
      (
        -- Phiên 901 còn hạn được xem là giữ chỗ tạm cho mẫu chính.
        SELECT COALESCE(SUM(ctpt.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt
        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id
        WHERE ctpt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          AND ptt.trang_thai = ${PHIEN_CHO_THANH_TOAN}
          AND ptt.het_han_luc > NOW()
          AND (
            ${phienLoaiTruId}::uuid IS NULL
            OR ptt.id <> ${phienLoaiTruId}::uuid
          )
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      )
      -
      (
        -- Phiên 901 cũng phải giữ tạm các mẫu thiết bị phụ trong bộ đi kèm.
        SELECT COALESCE(SUM(ctpt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt
        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id
        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctpt.mau_thiet_bi_id
        WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
          AND ptt.trang_thai = ${PHIEN_CHO_THANH_TOAN}
          AND ptt.het_han_luc > NOW()
          AND (
            ${phienLoaiTruId}::uuid IS NULL
            OR ptt.id <> ${phienLoaiTruId}::uuid
          )
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS so_luong_san_sang
  `;

  const soLuong = Number(rows[0]?.so_luong_san_sang || 0);
  return soLuong > 0 ? soLuong : 0;
}

async function tinhSoLuongKhaDungCuaPhuKien(
  phuKienId,
  ngayNhan,
  ngayTra,
  db = prisma,
  phienLoaiTruId = null
) {
  const rows = await db.$queryRaw`
    SELECT
      (
        SELECT COALESCE(pk.tong_so_luong, 0)::int
        FROM phu_kien pk
        WHERE pk.id = ${phuKienId}::uuid
          AND pk.da_xoa_luc IS NULL
          AND pk.trang_thai = ${TRANG_THAI_PHU_KIEN_HIEN_THI}
        LIMIT 1
      )
      -
      (
        SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt
        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id
        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id
        WHERE bdk.phu_kien_id = ${phuKienId}::uuid
          -- Phụ kiện không đổi trạng thái vật lý như thiết bị định danh,
          -- nên phải trừ cả giữ chỗ, đang thuê và quá hạn.
          AND dt.trang_thai IN (
            ${DON_DA_GIU_CHO},
            ${DON_DANG_THUE},
            ${DON_QUA_HAN}
          )
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      -
      (
        -- Phiên 901 còn hạn giữ tạm phụ kiện đi kèm.
        SELECT COALESCE(SUM(ctpt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_phien_thanh_toan ctpt
        JOIN phien_thanh_toan ptt
          ON ptt.id = ctpt.phien_thanh_toan_id
        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctpt.mau_thiet_bi_id
        WHERE bdk.phu_kien_id = ${phuKienId}::uuid
          AND ptt.trang_thai = ${PHIEN_CHO_THANH_TOAN}
          AND ptt.het_han_luc > NOW()
          AND (
            ${phienLoaiTruId}::uuid IS NULL
            OR ptt.id <> ${phienLoaiTruId}::uuid
          )
          AND ctpt.ngay_nhan < ${ngayTra}::timestamptz
          AND ctpt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS so_luong_san_sang
  `;

  const soLuong = Number(rows[0]?.so_luong_san_sang || 0);
  return soLuong > 0 ? soLuong : 0;
}

async function layBoDiKemCuaMau(mauThietBiId, db = prisma) {
  return await db.$queryRaw`
    SELECT
      id,
      so_luong,
      mau_thiet_bi_phu_id,
      phu_kien_id
    FROM bo_di_kem
    WHERE mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid
  `;
}

// Chụp lại tên, số lượng và giá trị phụ kiện tại thời điểm tạo phiên thanh toán.
// Hợp đồng của đơn sau này chỉ dùng snapshot này, không lấy giá hiện tại của phụ kiện.
async function taoBoDiKemSnapshotCuaMau(mauThietBiId, db = prisma) {
  const rows = await db.$queryRaw`
    SELECT
      pk.id AS phu_kien_id,
      pk.ten_phu_kien,
      bdk.so_luong::int AS so_luong,
      pk.gia_tri_phu_kien::text AS gia_tri_phu_kien_snapshot
    FROM bo_di_kem bdk
    JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id
    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid
      AND bdk.phu_kien_id IS NOT NULL
      AND pk.da_xoa_luc IS NULL
    ORDER BY pk.ten_phu_kien ASC
  `;

  return rows.map((item) => ({
    phu_kien_id: item.phu_kien_id,
    ten_phu_kien: item.ten_phu_kien,
    so_luong: Number(item.so_luong || 0),
    gia_tri_phu_kien_snapshot: Number(item.gia_tri_phu_kien_snapshot || 0),
  }));
}

function congNhuCau(map, id, soLuong) {
  if (!id) return;

  const key = String(id);
  const soLuongHopLe = Number(soLuong || 0);

  if (!Number.isFinite(soLuongHopLe) || soLuongHopLe <= 0) return;

  map.set(key, Number(map.get(key) || 0) + soLuongHopLe);
}

// Gom toàn bộ nhu cầu của mẫu chính, mẫu phụ và phụ kiện.
// Sau đó khóa theo thứ tự cố định để hai callback đồng thời không cùng vượt tồn.
async function taoNhuCauTaiNguyen(danhSachItem = [], db = prisma) {
  const mauThietBi = new Map();
  const phuKien = new Map();

  for (const item of danhSachItem) {
    const soLuongItem = Number(item.so_luong || 0);

    if (!item.mau_thiet_bi_id || !Number.isFinite(soLuongItem) || soLuongItem <= 0) {
      throw new Error("Chi tiết phiên thanh toán không hợp lệ");
    }

    congNhuCau(mauThietBi, item.mau_thiet_bi_id, soLuongItem);

    const boDiKem = await layBoDiKemCuaMau(item.mau_thiet_bi_id, db);

    for (const dong of boDiKem) {
      const soLuongCan = Number(dong.so_luong || 0) * soLuongItem;

      if (dong.mau_thiet_bi_phu_id) {
        congNhuCau(mauThietBi, dong.mau_thiet_bi_phu_id, soLuongCan);
      }

      if (dong.phu_kien_id) {
        congNhuCau(phuKien, dong.phu_kien_id, soLuongCan);
      }
    }
  }

  return {
    mau_thiet_bi: [...mauThietBi.entries()]
      .map(([id, so_luong]) => ({ id, so_luong }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
    phu_kien: [...phuKien.entries()]
      .map(([id, so_luong]) => ({ id, so_luong }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

async function khoaTaiNguyenThanhToan(tx, nhuCau) {
  // Khóa mẫu theo UUID tăng dần.
  for (const item of nhuCau.mau_thiet_bi) {
    const rows = await tx.$queryRaw`
      SELECT id
      FROM mau_thiet_bi
      WHERE id = ${item.id}::uuid
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new Error(`Không tìm thấy mẫu thiết bị ${item.id}`);
    }
  }

  // Sau đó khóa phụ kiện theo UUID tăng dần.
  for (const item of nhuCau.phu_kien) {
    const rows = await tx.$queryRaw`
      SELECT id
      FROM phu_kien
      WHERE id = ${item.id}::uuid
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new Error(`Không tìm thấy phụ kiện ${item.id}`);
    }
  }
}

function layKhoangThueChung(danhSachItem = []) {
  if (danhSachItem.length === 0) {
    throw new Error("Phiên thanh toán không có chi tiết");
  }

  const ngayNhan = new Date(danhSachItem[0].ngay_nhan);
  const ngayTra = new Date(danhSachItem[0].ngay_tra);

  if (
    Number.isNaN(ngayNhan.getTime()) ||
    Number.isNaN(ngayTra.getTime()) ||
    ngayTra <= ngayNhan
  ) {
    throw new Error("Khoảng thời gian thuê không hợp lệ");
  }

  for (const item of danhSachItem) {
    const nhan = new Date(item.ngay_nhan);
    const tra = new Date(item.ngay_tra);

    if (nhan.getTime() !== ngayNhan.getTime() || tra.getTime() !== ngayTra.getTime()) {
      throw new Error("Các sản phẩm trong phiên thanh toán phải có cùng thời gian thuê");
    }
  }

  return { ngayNhan, ngayTra };
}

// Kiểm tra tồn ngay trong transaction.
// phienLoaiTruId được dùng tại callback để phiên 901 đang xử lý không tự trừ chính nó.
async function kiemTraTonTrongTransaction({
  db,
  danhSachItem,
  phienLoaiTruId = null,
}) {
  const { ngayNhan, ngayTra } = layKhoangThueChung(danhSachItem);
  const nhuCau = await taoNhuCauTaiNguyen(danhSachItem, db);

  await khoaTaiNguyenThanhToan(db, nhuCau);

  for (const item of nhuCau.mau_thiet_bi) {
    const khaDung = await tinhSoLuongKhaDungCuaMau(
      item.id,
      ngayNhan,
      ngayTra,
      db,
      phienLoaiTruId
    );

    if (khaDung < Number(item.so_luong)) {
      throw new Error(
        `Không đủ thiết bị. Cần ${item.so_luong}, hiện chỉ còn ${khaDung}`
      );
    }
  }

  for (const item of nhuCau.phu_kien) {
    const khaDung = await tinhSoLuongKhaDungCuaPhuKien(
      item.id,
      ngayNhan,
      ngayTra,
      db,
      phienLoaiTruId
    );

    if (khaDung < Number(item.so_luong)) {
      throw new Error(
        `Không đủ phụ kiện. Cần ${item.so_luong}, hiện chỉ còn ${khaDung}`
      );
    }
  }
}

async function taoPhienThanhToan({
  khachHangId,
  danhSachItem,
  tongTienCoc,
  tongTienThue,
  maThamChieu,
  checkoutUrl,
  tyLePhiHuySnapshot,
}) {
  return await prisma.$transaction(async (tx) => {
    // Phiên 901 là giữ chỗ tạm. Khóa + kiểm tra tồn trước khi tạo phiên
    // để không tạo nhiều phiên 901 vượt quá số lượng còn lại.
    await kiemTraTonTrongTransaction({
      db: tx,
      danhSachItem,
    });

    const rows = await tx.$queryRaw`
      INSERT INTO phien_thanh_toan (
        khach_hang_id,
        trang_thai,
        tong_tien_coc,
        tong_tien_thue,
        ty_le_phi_huy_snapshot,
        ma_tham_chieu,
        checkout_url,
        het_han_luc
      )
      VALUES (
        ${khachHangId}::uuid,
        ${PHIEN_CHO_THANH_TOAN},
        ${tongTienCoc},
        ${tongTienThue},
        ${tyLePhiHuySnapshot},
        ${maThamChieu},
        ${checkoutUrl},
        NOW() + INTERVAL '30 minutes'
      )
      RETURNING
        id,
        khach_hang_id,
        trang_thai,
        tong_tien_coc::text AS tong_tien_coc,
        tong_tien_thue::text AS tong_tien_thue,
        ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
        ma_tham_chieu,
        checkout_url,
        het_han_luc
    `;

    const phien = rows[0];

    for (const item of danhSachItem) {
      const boDiKemSnapshot = await taoBoDiKemSnapshotCuaMau(
        item.mau_thiet_bi_id,
        tx
      );

      await tx.$executeRaw`
        INSERT INTO chi_tiet_phien_thanh_toan (
          phien_thanh_toan_id,
          mau_thiet_bi_id,
          so_luong,
          ngay_nhan,
          ngay_tra,
          gia_thue_ngay_snapshot,
          gia_tri_thiet_bi_snapshot,
          ty_le_coc_snapshot,
          tien_coc_snapshot,
          tien_thue,
          tien_coc,
          bo_di_kem_snapshot
        )
        VALUES (
          ${phien.id}::uuid,
          ${item.mau_thiet_bi_id}::uuid,
          ${Number(item.so_luong)},
          ${item.ngay_nhan},
          ${item.ngay_tra},
          ${Number(item.gia_thue_ngay_snapshot)},
          ${Number(item.gia_tri_thiet_bi_snapshot)},
          ${Number(item.ty_le_coc_snapshot)},
          ${Number(item.tien_coc_snapshot)},
          ${Number(item.tien_thue)},
          ${Number(item.tien_coc)},
          ${JSON.stringify(boDiKemSnapshot)}::jsonb
        )
      `;
    }

    return phien;
  });
}

async function layPhienTheoIdVaKhachHang(phienId, khachHangId) {
  const rows = await prisma.$queryRaw`
    SELECT
      p.id,
      p.khach_hang_id,
      p.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai,
      p.tong_tien_coc::text AS tong_tien_coc,
      p.tong_tien_thue::text AS tong_tien_thue,
      p.ty_le_phi_huy_snapshot::text AS ty_le_phi_huy_snapshot,
      p.ma_tham_chieu,
      p.checkout_url,
      p.het_han_luc,
      p.da_thanh_toan_luc,
      p.that_bai_luc,
      d.id AS don_thue_id,
      d.ma_don
    FROM phien_thanh_toan p
    LEFT JOIN trang_thai_he_thong tt
      ON tt.id = p.trang_thai
    LEFT JOIN don_thue d
      ON d.phien_thanh_toan_id = p.id
    WHERE p.id = ${phienId}::uuid
      AND p.khach_hang_id = ${khachHangId}::uuid
    LIMIT 1
  `;

  return rows[0] || null;
}

async function capNhatPhienHetHan(phienId) {
  await prisma.$executeRaw`
    UPDATE phien_thanh_toan
    SET
      trang_thai = ${PHIEN_HET_HAN},
      updated_at = NOW()
    WHERE id = ${phienId}::uuid
      AND trang_thai = ${PHIEN_CHO_THANH_TOAN}
  `;
}

async function layChiTietPhienThanhToan(phienId) {
  return await prisma.$queryRaw`
    SELECT
      ct.id,
      ct.mau_thiet_bi_id,
      h.ten_hang,
      mtb.ten_mau,
      ct.so_luong,
      ct.ngay_nhan,
      ct.ngay_tra,
      ct.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ct.gia_tri_thiet_bi_snapshot::text AS gia_tri_thiet_bi_snapshot,
      ct.ty_le_coc_snapshot::text AS ty_le_coc_snapshot,
      ct.tien_coc_snapshot::text AS tien_coc_snapshot,
      ct.tien_thue::text AS tien_thue,
      ct.tien_coc::text AS tien_coc,
      ct.bo_di_kem_snapshot
    FROM chi_tiet_phien_thanh_toan ct
    JOIN mau_thiet_bi mtb
      ON mtb.id = ct.mau_thiet_bi_id
    LEFT JOIN hang_thiet_bi h
      ON h.id = mtb.hang_id
    WHERE ct.phien_thanh_toan_id = ${phienId}::uuid
    ORDER BY ct.created_at ASC
  `;
}

async function layPhienTheoMaThamChieu(maThamChieu) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      khach_hang_id,
      trang_thai,
      tong_tien_coc,
      tong_tien_thue,
      ty_le_phi_huy_snapshot,
      ma_tham_chieu,
      het_han_luc
    FROM phien_thanh_toan
    WHERE ma_tham_chieu = ${maThamChieu}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function layIdPhienTheoMaThamChieu(maThamChieu) {
  const rows = await prisma.$queryRaw`
    SELECT id
    FROM phien_thanh_toan
    WHERE ma_tham_chieu = ${maThamChieu}
    LIMIT 1
  `;

  return rows[0]?.id || "";
}

async function layWebhookTheoIdSuKien(idSuKien) {
  const rows = await prisma.$queryRaw`
    SELECT
      id,
      da_xu_ly,
      loi_xu_ly
    FROM webhook_thanh_toan
    WHERE id_su_kien = ${idSuKien}
    LIMIT 1
  `;

  return rows[0] || null;
}

async function xuLyThanhToanThanhCong({
  maThamChieu,
  idSuKien,
  payload,
  maGiaoDich,
  maDon,
}) {
  const webhookCu = await layWebhookTheoIdSuKien(idSuKien);

  if (webhookCu) {
    // Nếu callback trước đã ghi lỗi (ví dụ hết tồn sau khi VNPay đã thanh toán),
    // callback lặp lại phải tiếp tục trả lỗi, không được giả thành công.
    if (!webhookCu.da_xu_ly) {
      throw new Error(
        webhookCu.loi_xu_ly ||
          "Giao dịch đã được thanh toán nhưng chưa tạo được đơn thuê"
      );
    }

    return {
      da_xu_ly_truoc_do: true,
      id_su_kien: idSuKien,
      da_xu_ly: webhookCu.da_xu_ly,
      loi_xu_ly: webhookCu.loi_xu_ly,
    };
  }

  const phien = await layPhienTheoMaThamChieu(maThamChieu);

  if (!phien) {
    await prisma.$executeRaw`
      INSERT INTO webhook_thanh_toan (
        id_su_kien,
        phien_thanh_toan_id,
        payload,
        da_xu_ly,
        loi_xu_ly
      )
      VALUES (
        ${idSuKien},
        NULL,
        ${JSON.stringify(payload)}::jsonb,
        FALSE,
        'Không tìm thấy phiên thanh toán'
      )
    `;

    throw new Error("Không tìm thấy phiên thanh toán");
  }

  await prisma.$executeRaw`
    INSERT INTO webhook_thanh_toan (
      id_su_kien,
      phien_thanh_toan_id,
      payload,
      da_xu_ly
    )
    VALUES (
      ${idSuKien},
      ${phien.id}::uuid,
      ${JSON.stringify(payload)}::jsonb,
      FALSE
    )
  `;

  try {
    const ketQua = await prisma.$transaction(async (tx) => {
      const rowsPhien = await tx.$queryRaw`
        SELECT
          id,
          khach_hang_id,
          trang_thai,
          tong_tien_coc,
          tong_tien_thue,
          ty_le_phi_huy_snapshot,
          het_han_luc
        FROM phien_thanh_toan
        WHERE id = ${phien.id}::uuid
        FOR UPDATE
      `;

      const phienKhoa = rowsPhien[0];

      const donDaCo = await tx.$queryRaw`
        SELECT
          id,
          ma_don
        FROM don_thue
        WHERE phien_thanh_toan_id = ${phien.id}::uuid
        LIMIT 1
      `;

      if (donDaCo.length > 0) {
        return {
          da_xu_ly_truoc_do: true,
          phien_thanh_toan_id: phien.id,
          don_thue_id: donDaCo[0].id,
          ma_don: donDaCo[0].ma_don,
        };
      }

      if (Number(phienKhoa.trang_thai) !== PHIEN_CHO_THANH_TOAN) {
        throw new Error("Phiên thanh toán không ở trạng thái chờ thanh toán");
      }

      if (new Date(phienKhoa.het_han_luc) < new Date()) {
        await tx.$executeRaw`
          UPDATE phien_thanh_toan
          SET
            trang_thai = ${PHIEN_HET_HAN},
            updated_at = NOW()
          WHERE id = ${phien.id}::uuid
        `;

        throw new Error("Phiên thanh toán đã hết hạn");
      }

      const chiTiet = await tx.$queryRaw`
        SELECT
          mau_thiet_bi_id,
          so_luong,
          ngay_nhan,
          ngay_tra,
          gia_thue_ngay_snapshot,
          gia_tri_thiet_bi_snapshot,
          ty_le_coc_snapshot,
          tien_coc_snapshot,
          tien_thue,
          tien_coc,
          bo_di_kem_snapshot
        FROM chi_tiet_phien_thanh_toan
        WHERE phien_thanh_toan_id = ${phien.id}::uuid
        ORDER BY created_at ASC
      `;

      if (chiTiet.length === 0) {
        throw new Error("Phiên thanh toán không có chi tiết");
      }

      // VNPay đã báo thành công nhưng vẫn phải kiểm tra lại tồn trong CHÍNH transaction này.
      // Loại trừ phiên 901 hiện tại để nó không tự trừ vào phần tồn đã giữ cho chính nó.
      try {
        await kiemTraTonTrongTransaction({
          db: tx,
          danhSachItem: chiTiet,
          phienLoaiTruId: phien.id,
        });
      } catch (loiTon) {
        throw new Error(
          `VNPay đã thanh toán nhưng không đủ tồn để tạo đơn. ${loiTon.message}. ` +
            "Không tạo đơn vượt tồn; cần kiểm tra giao dịch và hoàn tiền/xử lý thủ công."
        );
      }

      const ngayNhanDau = new Date(chiTiet[0].ngay_nhan);
      const ngayTraDau = new Date(chiTiet[0].ngay_tra);
      const soNgayThue = Math.max(
        1,
        Math.round((ngayTraDau - ngayNhanDau) / (24 * 60 * 60 * 1000))
      );

      const donMoi = await tx.$queryRaw`
        INSERT INTO don_thue (
          ma_don,
          khach_hang_id,
          phien_thanh_toan_id,
          ngay_nhan,
          ngay_tra,
          so_ngay_thue,
          tong_tien_thue,
          tong_tien_coc,
          ty_le_phi_huy_snapshot,
          trang_thai
        )
        VALUES (
          ${maDon},
          ${phienKhoa.khach_hang_id}::uuid,
          ${phien.id}::uuid,
          ${ngayNhanDau},
          ${ngayTraDau},
          ${soNgayThue},
          ${Number(phienKhoa.tong_tien_thue)},
          ${Number(phienKhoa.tong_tien_coc)},
          ${Number(phienKhoa.ty_le_phi_huy_snapshot)},
          ${DON_DA_GIU_CHO}
        )
        RETURNING id, ma_don
      `;

      const don = donMoi[0];

      for (const item of chiTiet) {
        await tx.$executeRaw`
          INSERT INTO chi_tiet_don_thue (
            don_thue_id,
            mau_thiet_bi_id,
            so_luong,
            gia_thue_ngay_snapshot,
            gia_tri_thiet_bi_snapshot,
            ty_le_coc_snapshot,
            tien_coc_snapshot,
            tien_thue,
            tien_coc,
            bo_di_kem_snapshot
          )
          VALUES (
            ${don.id}::uuid,
            ${item.mau_thiet_bi_id}::uuid,
            ${Number(item.so_luong)},
            ${Number(item.gia_thue_ngay_snapshot)},
            ${Number(item.gia_tri_thiet_bi_snapshot)},
            ${Number(item.ty_le_coc_snapshot)},
            ${Number(item.tien_coc_snapshot)},
            ${Number(item.tien_thue)},
            ${Number(item.tien_coc)},
            ${JSON.stringify(item.bo_di_kem_snapshot || [])}::jsonb
          )
        `;
      }

      await tx.$executeRaw`
        INSERT INTO thanh_toan (
          don_thue_id,
          phien_thanh_toan_id,
          so_tien,
          loai_dong_tien_id,
          ma_giao_dich,
          nguoi_thuc_hien_id,
          ghi_chu
        )
        VALUES (
          ${don.id}::uuid,
          ${phien.id}::uuid,
          ${Number(phienKhoa.tong_tien_coc)},
          ${LOAI_TIEN_COC},
          ${maGiaoDich},
          NULL,
          'Thanh toán tiền cọc qua VNPay Sandbox'
        )
      `;

      await tx.$executeRaw`
        UPDATE phien_thanh_toan
        SET
          trang_thai = ${PHIEN_DA_THANH_TOAN},
          da_thanh_toan_luc = NOW(),
          updated_at = NOW()
        WHERE id = ${phien.id}::uuid
      `;

      await tx.$executeRaw`
        DELETE FROM chi_tiet_gio_hang c
        USING gio_hang g, chi_tiet_phien_thanh_toan ct
        WHERE c.gio_hang_id = g.id
          AND g.khach_hang_id = ${phienKhoa.khach_hang_id}::uuid
          AND ct.phien_thanh_toan_id = ${phien.id}::uuid
          AND c.mau_thiet_bi_id = ct.mau_thiet_bi_id
          AND c.ngay_nhan = ct.ngay_nhan
          AND c.ngay_tra = ct.ngay_tra
      `;

      return {
        da_xu_ly_truoc_do: false,
        phien_thanh_toan_id: phien.id,
        don_thue_id: don.id,
        ma_don: don.ma_don,
      };
    });

    await prisma.$executeRaw`
      UPDATE webhook_thanh_toan
      SET
        da_xu_ly = TRUE,
        xu_ly_luc = NOW(),
        loi_xu_ly = NULL
      WHERE id_su_kien = ${idSuKien}
    `;

    return ketQua;
  } catch (loi) {
    await prisma.$executeRaw`
      UPDATE webhook_thanh_toan
      SET
        da_xu_ly = FALSE,
        loi_xu_ly = ${loi.message}
      WHERE id_su_kien = ${idSuKien}
    `;

    throw loi;
  }
}

async function xuLyThanhToanThatBai({ maThamChieu, idSuKien, payload }) {
  const phien = await layPhienTheoMaThamChieu(maThamChieu);

  if (!phien) {
    return null;
  }

  const webhookCu = await layWebhookTheoIdSuKien(idSuKien);

  if (webhookCu) {
    return phien;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO webhook_thanh_toan (
        id_su_kien,
        phien_thanh_toan_id,
        payload,
        da_xu_ly,
        loi_xu_ly
      )
      VALUES (
        ${idSuKien},
        ${phien.id}::uuid,
        ${JSON.stringify(payload)}::jsonb,
        TRUE,
        'Thanh toán thất bại'
      )
    `;

    await tx.$executeRaw`
      UPDATE phien_thanh_toan
      SET
        trang_thai = ${PHIEN_THAT_BAI},
        that_bai_luc = NOW(),
        updated_at = NOW()
      WHERE id = ${phien.id}::uuid
        AND trang_thai = ${PHIEN_CHO_THANH_TOAN}
    `;
  });

  return phien;
}

module.exports = {
  PHIEN_CHO_THANH_TOAN,
  PHIEN_HET_HAN,
  layKhachHangTheoId,
  layGioHangTheoKhachHang,
  layItemGioHangDuocChon,
  capNhatSnapshotGioHangKhiXacNhan,
  tinhSoLuongKhaDungCuaMau,
  tinhSoLuongKhaDungCuaPhuKien,
  layBoDiKemCuaMau,
  taoPhienThanhToan,
  layPhienTheoIdVaKhachHang,
  capNhatPhienHetHan,
  layChiTietPhienThanhToan,
  layPhienTheoMaThamChieu,
  layIdPhienTheoMaThamChieu,
  xuLyThanhToanThanhCong,
  xuLyThanhToanThatBai,
};
