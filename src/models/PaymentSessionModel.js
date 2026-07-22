const qs = require("qs");
const crypto = require("crypto");
const paymentRepository = require("../repositories/paymentRepository");

const TRANG_THAI_XAC_MINH_DA_DUYET = 203;

function layEnv(tenBien) {
  return (process.env[tenBien] || "").trim();
}

function chuanHoaIp(ip) {
  if (!ip) return "127.0.0.1";
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
  if (ip.includes(",")) return ip.split(",")[0].trim();
  return ip;
}

function layNgayGioVietNam(date = new Date()) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
}

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

function taoChuKyVnpay(paramsDaSapXep) {
  const secretKey = layEnv("VNPAY_HASH_SECRET");

  if (!secretKey) {
    throw new Error("Thiếu VNPAY_HASH_SECRET");
  }

  const signData = qs.stringify(paramsDaSapXep, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);

  return hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
}

function kiemTraChuKyVnpay(query) {
  const secureHash = query.vnp_SecureHash;

  if (!secureHash) {
    return false;
  }

  let vnpParams = { ...query };
  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  vnpParams = sapXepObject(vnpParams);

  const signed = taoChuKyVnpay(vnpParams);
  return String(secureHash).toLowerCase() === signed.toLowerCase();
}

function taoMaThamChieu() {
  const ngay = dinhDangNgayVnpay(new Date());
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TRPAY${ngay}${random}`;
}

function taoMaDon() {
  const ngay = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(100000 + Math.random() * 900000);
  return `DT-${ngay}-${random}`;
}

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

  const soNgay = Math.round((mocKetThuc - mocBatDau) / (24 * 60 * 60 * 1000));
  return soNgay < 1 ? 1 : soNgay;
}

function layNgayDangChuoi(ngay) {
  if (!ngay) return "";
  return new Date(ngay).toISOString().slice(0, 10);
}

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
}

function laThanhToanThanhCong(query) {
  return query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";
}

function taoCheckoutUrlVnpay({ maThamChieu, soTienCoc, ip }) {
  const tmnCode = layEnv("VNPAY_TMN_CODE");
  const secretKey = layEnv("VNPAY_HASH_SECRET");

  const vnpUrl =
    layEnv("VNPAY_URL") || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  const returnUrl =
    layEnv("VNPAY_RETURN_URL") || "http://localhost:4000/api/payment-return/vnpay";

  if (!tmnCode || !secretKey) {
    throw new Error("Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET");
  }

  const ngayTao = new Date();
  const ngayHetHan = new Date(ngayTao.getTime() + 30 * 60 * 1000);

  let vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: Number(soTienCoc) * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: maThamChieu,
    vnp_OrderInfo: `Thanh toan coc TRent ${maThamChieu}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: chuanHoaIp(ip),
    vnp_CreateDate: dinhDangNgayVnpay(ngayTao),
    vnp_ExpireDate: dinhDangNgayVnpay(ngayHetHan),
  };

  vnpParams = sapXepObject(vnpParams);
  vnpParams.vnp_SecureHash = taoChuKyVnpay(vnpParams);

  return vnpUrl + "?" + qs.stringify(vnpParams, { encode: false });
}

async function kiemTraThietBiKhaDung(danhSachItem) {
  for (const item of danhSachItem) {
    const soLuongMauChinh = await paymentRepository.tinhSoLuongKhaDungCuaMau(
      item.mau_thiet_bi_id,
      item.ngay_nhan,
      item.ngay_tra
    );

    if (soLuongMauChinh < Number(item.so_luong)) {
      throw new Error(
        `Mẫu thiết bị ${item.ten_hang || ""} ${item.ten_mau} không đủ số lượng sẵn sàng`
      );
    }

    const boDiKem = await paymentRepository.layBoDiKemCuaMau(item.mau_thiet_bi_id);

    for (const dong of boDiKem) {
      const soLuongCan = Number(dong.so_luong || 0) * Number(item.so_luong || 0);

      if (dong.mau_thiet_bi_phu_id) {
        const soLuongPhu = await paymentRepository.tinhSoLuongKhaDungCuaMau(
          dong.mau_thiet_bi_phu_id,
          item.ngay_nhan,
          item.ngay_tra
        );

        if (soLuongPhu < soLuongCan) {
          throw new Error(`Bộ đi kèm của ${item.ten_mau} không đủ số lượng sẵn sàng`);
        }
      }

      if (dong.phu_kien_id) {
        const soLuongPhuKien = await paymentRepository.tinhSoLuongKhaDungCuaPhuKien(
          dong.phu_kien_id,
          item.ngay_nhan,
          item.ngay_tra
        );

        if (soLuongPhuKien < soLuongCan) {
          throw new Error(`Phụ kiện đi kèm của ${item.ten_mau} không đủ số lượng sẵn sàng`);
        }
      }
    }
  }
}

async function kiemTraSoTienVnpay(maThamChieu, vnpAmount) {
  const phien = await paymentRepository.layPhienTheoMaThamChieu(maThamChieu);

  if (!phien) {
    return {
      hopLe: false,
      message: "Không tìm thấy phiên thanh toán",
    };
  }

  const soTienVnpay = Number(vnpAmount || 0) / 100;
  const soTienDb = Number(phien.tong_tien_coc || 0);

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

class PaymentSessionModel {
  constructor({
    id,
    khach_hang_id,

    trang_thai,
    ten_trang_thai,

    tong_tien_coc,
    tong_tien_thue,

    ma_tham_chieu,
    checkout_url,

    het_han_luc,
    da_thanh_toan_luc,
    that_bai_luc,

    don_thue_id,
    ma_don,

    chi_tiet = [],
  } = {}) {
    this.id = id;
    this.khach_hang_id = khach_hang_id || null;

    this.trang_thai = Number(trang_thai || 0);
    this.ten_trang_thai = ten_trang_thai || null;

    this.tong_tien_coc = Number(tong_tien_coc || 0);
    this.tong_tien_thue = Number(tong_tien_thue || 0);

    this.ma_tham_chieu = ma_tham_chieu || "";
    this.checkout_url = checkout_url || "";

    this.het_han_luc = het_han_luc || null;
    this.da_thanh_toan_luc = da_thanh_toan_luc || null;
    this.that_bai_luc = that_bai_luc || null;

    this.don_thue_id = don_thue_id || null;
    this.ma_don = ma_don || null;

    this.chi_tiet = chi_tiet.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,

      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",

      so_luong: Number(item.so_luong || 0),

      ngay_nhan: item.ngay_nhan || null,
      ngay_tra: item.ngay_tra || null,

      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),

      tien_thue: Number(item.tien_thue || 0),
      tien_coc: Number(item.tien_coc || 0),
    }));
  }

  static async taoPhienThanhToanCocService(nguoiDungId, body, ip) {
    const itemIds = Array.isArray(body.item_ids)
      ? body.item_ids.filter(Boolean)
      : [];

    const khachHang = await paymentRepository.layKhachHangTheoId(nguoiDungId);

    if (!khachHang) {
      throw new Error("Không tìm thấy khách hàng");
    }

    if (Number(khachHang.trang_thai_xac_minh) !== TRANG_THAI_XAC_MINH_DA_DUYET) {
      throw new Error("Khách hàng cần xác minh thành công trước khi đặt cọc");
    }

    const gioHang = await paymentRepository.layGioHangTheoKhachHang(nguoiDungId);

    if (!gioHang) {
      throw new Error("Giỏ hàng trống");
    }

    const danhSachItem = await paymentRepository.layItemGioHangDuocChon(
      gioHang.id,
      itemIds
    );

    if (danhSachItem.length === 0) {
      throw new Error("Giỏ hàng trống hoặc sản phẩm không hợp lệ");
    }

    kiemTraCungNgayThue(danhSachItem);
    await kiemTraThietBiKhaDung(danhSachItem);

    const danhSachTinhTien = danhSachItem.map((item) => {
      const ngayNhan = new Date(item.ngay_nhan);
      const ngayTra = new Date(item.ngay_tra);

      if (ngayTra <= ngayNhan) {
        throw new Error("Ngày trả phải sau ngày nhận");
      }

      const soNgayThue = tinhSoNgayThue(item.ngay_nhan, item.ngay_tra);
      const soLuong = Number(item.so_luong || 0);
      const giaThueNgay = Number(item.gia_thue_ngay_snapshot || 0);
      const tienCocSnapshot = Number(item.tien_coc_snapshot || 0);

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
    const checkoutUrl = taoCheckoutUrlVnpay({ maThamChieu, soTienCoc: tongTienCoc, ip });

    const phien = await paymentRepository.taoPhienThanhToan({
      khachHangId: nguoiDungId,
      danhSachItem: danhSachTinhTien,
      tongTienCoc,
      tongTienThue,
      maThamChieu,
      checkoutUrl,
    });

    return new PaymentSessionModel(phien);
  }

  static async layTrangThaiPhienThanhToanService(nguoiDungId, phienId) {
    const phien = await paymentRepository.layPhienTheoIdVaKhachHang(
      phienId,
      nguoiDungId
    );

    if (!phien) {
      throw new Error("Không tìm thấy phiên thanh toán");
    }

    if (
      Number(phien.trang_thai) === paymentRepository.PHIEN_CHO_THANH_TOAN &&
      new Date(phien.het_han_luc) < new Date()
    ) {
      await paymentRepository.capNhatPhienHetHan(phienId);
      phien.trang_thai = paymentRepository.PHIEN_HET_HAN;
      phien.ten_trang_thai = "Hết hạn";
    }

    const chiTiet = await paymentRepository.layChiTietPhienThanhToan(phienId);

    return new PaymentSessionModel({
      ...phien,
      chi_tiet: chiTiet,
    });
  }

  static async xuLyReturnVnpayService(query) {
    const hopLe = kiemTraChuKyVnpay(query);
    const maThamChieu = query.vnp_TxnRef || "";
    const phienThanhToanId = maThamChieu
      ? await paymentRepository.layIdPhienTheoMaThamChieu(maThamChieu)
      : "";

    const maGiaoDichVnpay = query.vnp_TransactionNo || query.vnp_BankTranNo || "";

    let thanhCong = hopLe && laThanhToanThanhCong(query);
    let maDon = "";
    let message = "";

    const idSuKien = maGiaoDichVnpay
      ? `VNPAY-RETURN-${maGiaoDichVnpay}`
      : `VNPAY-RETURN-${maThamChieu || Date.now()}`;

    const maGiaoDich = maGiaoDichVnpay || idSuKien;

    if (thanhCong && maThamChieu) {
      const kiemTraTien = await kiemTraSoTienVnpay(maThamChieu, query.vnp_Amount);

      if (!kiemTraTien.hopLe) {
        thanhCong = false;
        message = kiemTraTien.message;
      } else {
        try {
          const ketQua = await paymentRepository.xuLyThanhToanThanhCong({
            maThamChieu,
            idSuKien,
            payload: query,
            maGiaoDich,
            maDon: taoMaDon(),
          });

          maDon = ketQua.ma_don || "";
        } catch (loi) {
          thanhCong = false;
          message = loi.message;
        }
      }
    }

    if (!thanhCong && hopLe && maThamChieu) {
      await paymentRepository.xuLyThanhToanThatBai({
        maThamChieu,
        idSuKien,
        payload: query,
      });
    }

    if (!hopLe) {
      message = "Chữ ký thanh toán không hợp lệ";
    }

    if (!message && !thanhCong) {
      message = "Thanh toán thất bại hoặc đã bị hủy";
    }

    const feUrl =
      layEnv("FE_PAYMENT_RESULT_URL") || "http://localhost:5173/payment-result";

    return `${feUrl}?success=${
      thanhCong ? "true" : "false"
    }&ma_tham_chieu=${encodeURIComponent(
      maThamChieu
    )}&phien_thanh_toan_id=${encodeURIComponent(
      phienThanhToanId
    )}&ma_don=${encodeURIComponent(
      maDon
    )}&ma_giao_dich=${encodeURIComponent(
      maGiaoDich
    )}&vnp_response_code=${encodeURIComponent(
      query.vnp_ResponseCode || ""
    )}&checksum=${hopLe ? "true" : "false"}&message=${encodeURIComponent(
      message
    )}`;
  }
}

module.exports = PaymentSessionModel;