// Import prisma để query database bằng raw SQL.
const prisma = require("../../config/prisma");

// Import Prisma để dùng Prisma.join khi query nhiều id.
const { Prisma } = require("@prisma/client");

// Import qs theo đúng tài liệu VNPay.
const qs = require("qs");

// Import crypto để ký HMAC SHA512.
const crypto = require("crypto");

// ================= HẰNG SỐ =================

const TRANG_THAI_XAC_MINH_DA_DUYET = 203;

const TRANG_THAI_MAU_THIET_BI_HIEN_THI = 601;

const TRANG_THAI_THIET_BI_SAN_SANG = 501;

const PHIEN_CHO_THANH_TOAN = 901;
const PHIEN_DA_THANH_TOAN = 902;
const PHIEN_THAT_BAI = 903;
const PHIEN_HET_HAN = 904;

const DON_DA_GIU_CHO = 1102;

const LOAI_TIEN_COC = 2301;

// ================= HÀM PHỤ TRỢ =================

function layEnv(tenBien) {
  return (process.env[tenBien] || "").trim();
}

function chuanHoaIp(ip) {
  if (!ip) return "127.0.0.1";

  if (ip === "::1") return "127.0.0.1";

  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  if (ip.includes(",")) {
    return ip.split(",")[0].trim();
  }

  return ip;
}

// Lấy giờ Việt Nam GMT+7.
// Render thường chạy UTC nên cộng 7 giờ rồi dùng UTC field.
function layNgayGioVietNam(date = new Date()) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

// Format ngày theo chuẩn VNPay: yyyyMMddHHmmss.
function dinhDangNgayVnpay(date = new Date()) {
  const ngayVN = layNgayGioVietNam(date);

  const themSoKhong = (so) => String(so).padStart(2, "0");

  return (
    ngayVN.getUTCFullYear() +
    themSoKhong(ngayVN.getUTCMonth() + 1) +
    themSoKhong(ngayVN.getUTCDate()) +
    themSoKhong(ngayVN.getUTCHours()) +
    themSoKhong(ngayVN.getUTCMinutes()) +
    themSoKhong(ngayVN.getUTCSeconds())
  );
}

// Sort object theo đúng demo NodeJS của VNPay.
// Hàm này vừa sort key, vừa encode key/value đúng 1 lần.
// Sau đó dùng qs.stringify(..., { encode: false }).
function sapXepObject(obj) {
  const sorted = {};
  const keys = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(encodeURIComponent(key));
    }
  }

  keys.sort();

  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  }

  return sorted;
}

// Tạo chữ ký từ params đã sort + encode.
// Không gọi lại sapXepObject trong hàm này để tránh encode 2 lần.
function taoChuKyVnpay(paramsDaSapXep) {
  const secretKey = layEnv("VNPAY_HASH_SECRET");

  if (!secretKey) {
    throw new Error("Thiếu VNPAY_HASH_SECRET");
  }

  const signData = qs.stringify(paramsDaSapXep, {
    encode: false,
  });

  const hmac = crypto.createHmac("sha512", secretKey);

  return hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
}

// Kiểm tra chữ ký VNPay gửi về ở Return URL.
function kiemTraChuKyVnpay(query) {
  const secureHash = query["vnp_SecureHash"];

  if (!secureHash) {
    return false;
  }

  let vnpParams = { ...query };

  delete vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHashType"];

  vnpParams = sapXepObject(vnpParams);

  const signed = taoChuKyVnpay(vnpParams);

  return String(secureHash).toLowerCase() === signed.toLowerCase();
}

// Tạo mã tham chiếu gửi sang VNPay.
// Dùng chữ và số, không dùng dấu gạch ngang.
function taoMaThamChieu() {
  const ngay = dinhDangNgayVnpay(new Date());
  const random = Math.floor(100000 + Math.random() * 900000);

  return `TRPAY${ngay}${random}`;
}

// Tạo mã đơn thuê nội bộ.
function taoMaDon() {
  const ngay = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(100000 + Math.random() * 900000);

  return `DT-${ngay}-${random}`;
}

// Tính số ngày thuê theo ngày, bỏ phần giờ.
// Ví dụ: 13/7 đến 16/7 = 3 ngày.
function tinhSoNgayThue(ngayNhan, ngayTra) {
  const batDau = new Date(ngayNhan);
  const ketThuc = new Date(ngayTra);

  const mocBatDau = new Date(
    batDau.getFullYear(),
    batDau.getMonth(),
    batDau.getDate()
  );

  const mocKetThuc = new Date(
    ketThuc.getFullYear(),
    ketThuc.getMonth(),
    ketThuc.getDate()
  );

  const soMsMotNgay = 24 * 60 * 60 * 1000;
  const soNgay = Math.round((mocKetThuc - mocBatDau) / soMsMotNgay);

  return soNgay < 1 ? 1 : soNgay;
}

// Lấy ngày dạng yyyy-mm-dd để so sánh ngày nhận/ngày trả.
function layNgayDangChuoi(ngay) {
  if (!ngay) return "";

  return new Date(ngay).toISOString().slice(0, 10);
}

// Một đơn thuê chỉ được có một khoảng ngày thuê.
// Vì bảng don_thue chỉ có 1 ngày nhận và 1 ngày trả.
function kiemTraCungNgayThue(danhSachItem) {
  if (!danhSachItem || danhSachItem.length === 0) {
    throw new Error("Không có sản phẩm nào để đặt hàng");
  }

  const ngayNhanDau = layNgayDangChuoi(danhSachItem[0].ngay_nhan);
  const ngayTraDau = layNgayDangChuoi(danhSachItem[0].ngay_tra);

  for (const item of danhSachItem) {
    const ngayNhan = layNgayDangChuoi(item.ngay_nhan);
    const ngayTra = layNgayDangChuoi(item.ngay_tra);

    if (ngayNhan !== ngayNhanDau || ngayTra !== ngayTraDau) {
      throw new Error(
        "Các sản phẩm trong cùng một đơn thuê phải có cùng ngày nhận và ngày trả"
      );
    }
  }

  return {
    ngay_nhan: danhSachItem[0].ngay_nhan,
    ngay_tra: danhSachItem[0].ngay_tra,
  };
}

function laThanhToanThanhCong(query) {
  return (
    query.vnp_ResponseCode === "00" &&
    query.vnp_TransactionStatus === "00"
  );
}

// Tạo URL thanh toán VNPay theo tài liệu NodeJS.
function taoCheckoutUrlVnpay({ maThamChieu, soTienCoc, ip }) {
  const tmnCode = layEnv("VNPAY_TMN_CODE");
  const secretKey = layEnv("VNPAY_HASH_SECRET");

  const vnpUrl =
    layEnv("VNPAY_URL") ||
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  const returnUrl =
    layEnv("VNPAY_RETURN_URL") ||
    "http://localhost:4000/api/payment-return/vnpay";

  if (!tmnCode || !secretKey) {
    throw new Error("Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET");
  }

  const ngayTao = new Date();
  const ngayHetHan = new Date(ngayTao.getTime() + 30 * 60 * 1000);

  let vnpParams = {};

  vnpParams["vnp_Version"] = "2.1.0";
  vnpParams["vnp_Command"] = "pay";
  vnpParams["vnp_TmnCode"] = tmnCode;
  vnpParams["vnp_Amount"] = Number(soTienCoc) * 100;
  vnpParams["vnp_CurrCode"] = "VND";
  vnpParams["vnp_TxnRef"] = maThamChieu;
  vnpParams["vnp_OrderInfo"] = `Thanh toan coc TRent ${maThamChieu}`;
  vnpParams["vnp_OrderType"] = "other";
  vnpParams["vnp_Locale"] = "vn";
  vnpParams["vnp_ReturnUrl"] = returnUrl;
  vnpParams["vnp_IpAddr"] = chuanHoaIp(ip);
  vnpParams["vnp_CreateDate"] = dinhDangNgayVnpay(ngayTao);
  vnpParams["vnp_ExpireDate"] = dinhDangNgayVnpay(ngayHetHan);

  vnpParams = sapXepObject(vnpParams);

  const signed = taoChuKyVnpay(vnpParams);

  vnpParams["vnp_SecureHash"] = signed;

  return (
    vnpUrl +
    "?" +
    qs.stringify(vnpParams, {
      encode: false,
    })
  );
}

async function kiemTraSoTienVnpay(maThamChieu, vnpAmount) {
  const danhSachPhien = await prisma.$queryRaw`
    SELECT
      id,
      tong_tien_coc
    FROM phien_thanh_toan
    WHERE ma_tham_chieu = ${maThamChieu}
    LIMIT 1
  `;

  if (danhSachPhien.length === 0) {
    return {
      hopLe: false,
      message: "Không tìm thấy phiên thanh toán",
    };
  }

  const soTienVnpay = Number(vnpAmount || 0) / 100;
  const soTienDb = Number(danhSachPhien[0].tong_tien_coc);

  if (soTienVnpay !== soTienDb) {
    return {
      hopLe: false,
      message: "Số tiền thanh toán không khớp",
    };
  }

  return {
    hopLe: true,
    message: "Số tiền hợp lệ",
  };
}

// ================= KIỂM TRA THIẾT BỊ =================

async function kiemTraThietBiKhaDung(danhSachItem) {
  for (const item of danhSachItem) {
    const ketQua = await prisma.$queryRaw`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM thiet_bi_vat_ly tbvl
          WHERE tbvl.mau_thiet_bi_id = ${item.mau_thiet_bi_id}::uuid
            AND tbvl.trang_thai = ${TRANG_THAI_THIET_BI_SAN_SANG}
            AND tbvl.da_xoa_luc IS NULL
        )
        -
        (
          SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
          FROM chi_tiet_don_thue ctdt

          JOIN don_thue dt
            ON dt.id = ctdt.don_thue_id

          WHERE ctdt.mau_thiet_bi_id = ${item.mau_thiet_bi_id}::uuid
            AND dt.trang_thai = ${DON_DA_GIU_CHO}
            AND dt.ngay_nhan < ${item.ngay_tra}::timestamptz
            AND dt.ngay_tra > ${item.ngay_nhan}::timestamptz
        ) AS so_luong_san_sang
    `;

    const soLuongSanSang = Number(ketQua[0].so_luong_san_sang || 0);

    if (soLuongSanSang < Number(item.so_luong)) {
      throw new Error(
        `Mẫu thiết bị ${item.ten_hang || ""} ${item.ten_mau} không đủ số lượng sẵn sàng trong khoảng ngày đã chọn`
      );
    }
  }
}

// ================= XỬ LÝ TẠO ĐƠN =================

async function xuLyThanhToanThanhCong({
  maThamChieu,
  idSuKien,
  payload,
  maGiaoDich,
}) {
  const webhookCu = await prisma.$queryRaw`
    SELECT
      id,
      da_xu_ly,
      loi_xu_ly
    FROM webhook_thanh_toan
    WHERE id_su_kien = ${idSuKien}
    LIMIT 1
  `;

  if (webhookCu.length > 0) {
    return {
      da_xu_ly_truoc_do: true,
      id_su_kien: idSuKien,
      da_xu_ly: webhookCu[0].da_xu_ly,
      loi_xu_ly: webhookCu[0].loi_xu_ly,
    };
  }

  const danhSachPhien = await prisma.$queryRaw`
    SELECT
      id,
      khach_hang_id,
      trang_thai,
      tong_tien_coc,
      tong_tien_thue,
      ma_tham_chieu,
      het_han_luc
    FROM phien_thanh_toan
    WHERE ma_tham_chieu = ${maThamChieu}
    LIMIT 1
  `;

  if (danhSachPhien.length === 0) {
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

  const phien = danhSachPhien[0];

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
      const danhSachPhienKhoa = await tx.$queryRaw`
        SELECT
          id,
          khach_hang_id,
          trang_thai,
          tong_tien_coc,
          tong_tien_thue,
          ma_tham_chieu,
          het_han_luc
        FROM phien_thanh_toan
        WHERE id = ${phien.id}::uuid
        FOR UPDATE
      `;

      const phienKhoa = danhSachPhienKhoa[0];

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

      const danhSachChiTiet = await tx.$queryRaw`
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
        WHERE phien_thanh_toan_id = ${phien.id}::uuid
        ORDER BY created_at ASC
      `;

      if (danhSachChiTiet.length === 0) {
        throw new Error("Phiên thanh toán không có chi tiết");
      }

      // Kiểm tra lại lần nữa khi VNPay trả về.
      // Không lấy ngày nhỏ nhất/lớn nhất nữa vì như vậy sẽ gộp sai đơn.
      const ngayThue = kiemTraCungNgayThue(danhSachChiTiet);

      const ngayNhan = new Date(ngayThue.ngay_nhan);
      const ngayTra = new Date(ngayThue.ngay_tra);

      const soNgayThue = tinhSoNgayThue(ngayNhan, ngayTra);
      
      const maDon = taoMaDon();

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
          trang_thai
        )
        VALUES (
          ${maDon},
          ${phienKhoa.khach_hang_id}::uuid,
          ${phien.id}::uuid,
          ${ngayNhan},
          ${ngayTra},
          ${soNgayThue},
          ${Number(phienKhoa.tong_tien_thue)},
          ${Number(phienKhoa.tong_tien_coc)},
          ${DON_DA_GIU_CHO}
        )
        RETURNING id, ma_don
      `;

      const don = donMoi[0];

      for (const item of danhSachChiTiet) {
        await tx.$executeRaw`
          INSERT INTO chi_tiet_don_thue (
            don_thue_id,
            mau_thiet_bi_id,
            so_luong,
            gia_thue_ngay_snapshot,
            tien_coc_snapshot,
            tien_thue,
            tien_coc
          )
          VALUES (
            ${don.id}::uuid,
            ${item.mau_thiet_bi_id}::uuid,
            ${Number(item.so_luong)},
            ${Number(item.gia_thue_ngay_snapshot)},
            ${Number(item.tien_coc_snapshot)},
            ${Number(item.tien_thue)},
            ${Number(item.tien_coc)}
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

    return {
      ...ketQua,
      ma_tham_chieu: maThamChieu,
      trang_thai: "DA_THANH_TOAN",
      message: "Thanh toán thành công, đã tạo đơn thuê",
    };
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
  const danhSachPhien = await prisma.$queryRaw`
    SELECT
      id,
      trang_thai
    FROM phien_thanh_toan
    WHERE ma_tham_chieu = ${maThamChieu}
    LIMIT 1
  `;

  if (danhSachPhien.length === 0) {
    throw new Error("Không tìm thấy phiên thanh toán");
  }

  const phien = danhSachPhien[0];

  const webhookCu = await prisma.$queryRaw`
    SELECT id
    FROM webhook_thanh_toan
    WHERE id_su_kien = ${idSuKien}
    LIMIT 1
  `;

  if (webhookCu.length > 0) {
    return {
      da_xu_ly_truoc_do: true,
      id_su_kien: idSuKien,
      trang_thai: "THAT_BAI",
    };
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

  return {
    phien_thanh_toan_id: phien.id,
    ma_tham_chieu: maThamChieu,
    trang_thai: "THAT_BAI",
    message: "Thanh toán thất bại",
  };
}

// ================= API 1: POST /api/cart/checkout =================

async function taoPhienThanhToanCocService(nguoiDungId, body, ip) {
  const itemIds = Array.isArray(body.item_ids)
    ? body.item_ids.filter(Boolean)
    : [];

  const danhSachKhach = await prisma.$queryRaw`
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

  if (danhSachKhach.length === 0) {
    throw new Error("Không tìm thấy khách hàng");
  }

  const khachHang = danhSachKhach[0];

  if (Number(khachHang.trang_thai_xac_minh) !== TRANG_THAI_XAC_MINH_DA_DUYET) {
    throw new Error("Khách hàng cần xác minh thành công trước khi đặt cọc");
  }

  const danhSachGioHang = await prisma.$queryRaw`
    SELECT id
    FROM gio_hang
    WHERE khach_hang_id = ${nguoiDungId}::uuid
    LIMIT 1
  `;

  if (danhSachGioHang.length === 0) {
    throw new Error("Giỏ hàng trống");
  }

  const gioHang = danhSachGioHang[0];

  let danhSachItem = [];

  if (itemIds.length > 0) {
    danhSachItem = await prisma.$queryRaw`
      SELECT
        c.id,
        c.mau_thiet_bi_id,
        c.so_luong,
        c.ngay_nhan,
        c.ngay_tra,
        CASE
          WHEN c.gia_thue_ngay_snapshot > 0 THEN c.gia_thue_ngay_snapshot
          ELSE mtb.gia_thue_ngay
        END AS gia_thue_ngay_snapshot,
        CASE
          WHEN c.tien_coc_snapshot > 0 THEN c.tien_coc_snapshot
          ELSE mtb.tien_coc
        END AS tien_coc_snapshot,
        mtb.ten_hang,
        mtb.ten_mau
      FROM chi_tiet_gio_hang c
      JOIN mau_thiet_bi mtb
        ON mtb.id = c.mau_thiet_bi_id
      WHERE c.gio_hang_id = ${gioHang.id}::uuid
        AND c.id::text IN (${Prisma.join(itemIds)})
        AND mtb.da_xoa_luc IS NULL
        AND mtb.trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
      ORDER BY c.created_at ASC
    `;
  } else {
    danhSachItem = await prisma.$queryRaw`
      SELECT
        c.id,
        c.mau_thiet_bi_id,
        c.so_luong,
        c.ngay_nhan,
        c.ngay_tra,
        CASE
          WHEN c.gia_thue_ngay_snapshot > 0 THEN c.gia_thue_ngay_snapshot
          ELSE mtb.gia_thue_ngay
        END AS gia_thue_ngay_snapshot,
        CASE
          WHEN c.tien_coc_snapshot > 0 THEN c.tien_coc_snapshot
          ELSE mtb.tien_coc
        END AS tien_coc_snapshot,
        mtb.ten_hang,
        mtb.ten_mau
      FROM chi_tiet_gio_hang c
      JOIN mau_thiet_bi mtb
        ON mtb.id = c.mau_thiet_bi_id
      WHERE c.gio_hang_id = ${gioHang.id}::uuid
        AND mtb.da_xoa_luc IS NULL
        AND mtb.trang_thai = ${TRANG_THAI_MAU_THIET_BI_HIEN_THI}
      ORDER BY c.created_at ASC
    `;
  }

  if (danhSachItem.length === 0) {
    throw new Error("Giỏ hàng trống hoặc sản phẩm không hợp lệ");
  }

  // Chặn trường hợp khách tick nhiều sản phẩm nhưng ngày thuê khác nhau.
  // Một đơn thuê chỉ có một ngày nhận và một ngày trả.
  kiemTraCungNgayThue(danhSachItem);

  await kiemTraThietBiKhaDung(danhSachItem);

  const danhSachTinhTien = danhSachItem.map((item) => {
    const ngayNhan = new Date(item.ngay_nhan);
    const ngayTra = new Date(item.ngay_tra);

    if (ngayTra <= ngayNhan) {
      throw new Error("Ngày trả phải sau ngày nhận");
    }

    const soNgayThue = tinhSoNgayThue(item.ngay_nhan, item.ngay_tra);
    const soLuong = Number(item.so_luong);
    const giaThueNgay = Number(item.gia_thue_ngay_snapshot);
    const tienCocSnapshot = Number(item.tien_coc_snapshot);

    return {
      ...item,
      so_ngay_thue: soNgayThue,
      tien_thue: giaThueNgay * soLuong * soNgayThue,
      tien_coc: tienCocSnapshot * soLuong,
    };
  });

  const tongTienThue = danhSachTinhTien.reduce(
    (tong, item) => tong + item.tien_thue,
    0
  );

  const tongTienCoc = danhSachTinhTien.reduce(
    (tong, item) => tong + item.tien_coc,
    0
  );

  if (tongTienCoc <= 0) {
    throw new Error("Tiền cọc phải lớn hơn 0");
  }

  const maThamChieu = taoMaThamChieu();

  const checkoutUrl = taoCheckoutUrlVnpay({
    maThamChieu,
    soTienCoc: tongTienCoc,
    ip,
  });

  const ketQua = await prisma.$transaction(async (tx) => {
    const phienMoi = await tx.$queryRaw`
      INSERT INTO phien_thanh_toan (
        khach_hang_id,
        trang_thai,
        tong_tien_coc,
        tong_tien_thue,
        ma_tham_chieu,
        checkout_url,
        het_han_luc
      )
      VALUES (
        ${nguoiDungId}::uuid,
        ${PHIEN_CHO_THANH_TOAN},
        ${tongTienCoc},
        ${tongTienThue},
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
        ma_tham_chieu,
        checkout_url,
        het_han_luc
    `;

    const phien = phienMoi[0];

    for (const item of danhSachTinhTien) {
      await tx.$executeRaw`
        INSERT INTO chi_tiet_phien_thanh_toan (
          phien_thanh_toan_id,
          mau_thiet_bi_id,
          so_luong,
          ngay_nhan,
          ngay_tra,
          gia_thue_ngay_snapshot,
          tien_coc_snapshot,
          tien_thue,
          tien_coc
        )
        VALUES (
          ${phien.id}::uuid,
          ${item.mau_thiet_bi_id}::uuid,
          ${Number(item.so_luong)},
          ${item.ngay_nhan},
          ${item.ngay_tra},
          ${Number(item.gia_thue_ngay_snapshot)},
          ${Number(item.tien_coc_snapshot)},
          ${Number(item.tien_thue)},
          ${Number(item.tien_coc)}
        )
      `;
    }

    return phien;
  });

  return {
    phien_thanh_toan_id: ketQua.id,
    ma_tham_chieu: ketQua.ma_tham_chieu,
    checkout_url: ketQua.checkout_url,
    tong_tien_coc: ketQua.tong_tien_coc,
    tong_tien_thue: ketQua.tong_tien_thue,
    het_han_luc: ketQua.het_han_luc,
  };
}

// ================= API 2: GET /api/payment-sessions/:id =================

async function layTrangThaiPhienThanhToanService(nguoiDungId, phienId) {
  const danhSachPhien = await prisma.$queryRaw`
    SELECT
      p.id,
      p.khach_hang_id,
      p.trang_thai,
      tt.ten_trang_thai AS ten_trang_thai,
      p.tong_tien_coc::text AS tong_tien_coc,
      p.tong_tien_thue::text AS tong_tien_thue,
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
      AND p.khach_hang_id = ${nguoiDungId}::uuid
    LIMIT 1
  `;

  if (danhSachPhien.length === 0) {
    throw new Error("Không tìm thấy phiên thanh toán");
  }

  const phien = danhSachPhien[0];

  if (
    Number(phien.trang_thai) === PHIEN_CHO_THANH_TOAN &&
    new Date(phien.het_han_luc) < new Date()
  ) {
    await prisma.$executeRaw`
      UPDATE phien_thanh_toan
      SET
        trang_thai = ${PHIEN_HET_HAN},
        updated_at = NOW()
      WHERE id = ${phienId}::uuid
    `;

    phien.trang_thai = PHIEN_HET_HAN;
    phien.ten_trang_thai = "Hết hạn";
  }

  const danhSachChiTiet = await prisma.$queryRaw`
    SELECT
      ct.id,
      ct.mau_thiet_bi_id,
      mtb.ten_hang,
      mtb.ten_mau,
      ct.so_luong,
      ct.ngay_nhan,
      ct.ngay_tra,
      ct.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ct.tien_coc_snapshot::text AS tien_coc_snapshot,
      ct.tien_thue::text AS tien_thue,
      ct.tien_coc::text AS tien_coc
    FROM chi_tiet_phien_thanh_toan ct
    JOIN mau_thiet_bi mtb
      ON mtb.id = ct.mau_thiet_bi_id
    WHERE ct.phien_thanh_toan_id = ${phienId}::uuid
    ORDER BY ct.created_at ASC
  `;

  return {
    ...phien,
    chi_tiet: danhSachChiTiet,
  };
}

// ================= API 3: GET /api/payment-return/vnpay =================

// Return URL bản local/deploy demo:
// kiểm tra checksum, nếu thành công thì tạo đơn luôn.
async function xuLyReturnVnpayService(query) {
  const hopLe = kiemTraChuKyVnpay(query);

  const maThamChieu = query.vnp_TxnRef || "";

  let phienThanhToanId = "";

  if (maThamChieu) {
    const danhSachPhien = await prisma.$queryRaw`
      SELECT id
      FROM phien_thanh_toan
      WHERE ma_tham_chieu = ${maThamChieu}
      LIMIT 1
    `;

    if (danhSachPhien.length > 0) {
      phienThanhToanId = danhSachPhien[0].id;
    }
  }

  const thanhCong = hopLe && laThanhToanThanhCong(query);

  if (thanhCong && maThamChieu) {
    const kiemTraTien = await kiemTraSoTienVnpay(
      maThamChieu,
      query.vnp_Amount
    );

    if (kiemTraTien.hopLe) {
      try {
        const idSuKien = query.vnp_TransactionNo
          ? `VNPAY-RETURN-${query.vnp_TransactionNo}`
          : `VNPAY-RETURN-${maThamChieu}`;

        await xuLyThanhToanThanhCong({
          maThamChieu,
          idSuKien,
          payload: query,
          maGiaoDich: query.vnp_TransactionNo || idSuKien,
        });
      } catch (loi) {
        console.log("Return VNPay xử lý:", loi.message);
      }
    }
  }

  const feUrl =
    layEnv("FE_PAYMENT_RESULT_URL") || "http://localhost:5173/payment-result";

  return `${feUrl}?success=${
    thanhCong ? "true" : "false"
  }&ma_tham_chieu=${encodeURIComponent(
    maThamChieu
  )}&phien_thanh_toan_id=${encodeURIComponent(
    phienThanhToanId
  )}&vnp_response_code=${encodeURIComponent(
    query.vnp_ResponseCode || ""
  )}&checksum=${hopLe ? "true" : "false"}`;
}

module.exports = {
  taoPhienThanhToanCocService,
  layTrangThaiPhienThanhToanService,
  xuLyReturnVnpayService,
};
