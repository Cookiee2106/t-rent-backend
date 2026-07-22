const cloudinaryConfig = require("../config/cloudinary");
const settlementRepository = require("../repositories/settlementRepository");

const cloudinary = cloudinaryConfig.uploader
  ? cloudinaryConfig
  : cloudinaryConfig.cloudinary;

function docMangJson(giaTri, tenTruong) {
  if (!giaTri) return [];
  if (Array.isArray(giaTri)) return giaTri;

  try {
    const ketQua = JSON.parse(giaTri);
    if (!Array.isArray(ketQua)) throw new Error();
    return ketQua;
  } catch {
    throw new Error(`${tenTruong} không hợp lệ`);
  }
}

function taoKeyPhuKien(item) {
  return `${item.chi_tiet_don_thue_id}_${item.bo_di_kem_id || ""}_${item.phu_kien_id}`;
}

function gomSanPhamKemSerial(danhSachVatPham) {
  const map = new Map();

  for (const item of danhSachVatPham) {
    const key = item.chi_tiet_don_thue_id;

    if (!map.has(key)) {
      map.set(key, {
        chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
        ten_hang: item.ten_hang,
        ten_mau: item.ten_mau,
        ten_danh_muc: item.ten_danh_muc,
        anh_url: item.anh_url,
        so_luong_dat: Number(item.so_luong_dat || 0),
        thiet_bi_chinh: [],
        bo_di_kem: [],
      });
    }

    const sanPham = map.get(key);
    const laThietBiChinh = item.thiet_bi_id && !item.bo_di_kem_id;

    const vatPham = {
      id: item.id,
      chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
      bo_di_kem_id: item.bo_di_kem_id,
      thiet_bi_id: item.thiet_bi_id,
      phu_kien_id: item.phu_kien_id,
      ten_phu_kien: item.ten_phu_kien,
      ten_vat_pham_snapshot: item.ten_vat_pham_snapshot,
      so_serial: item.so_serial,
      so_serial_snapshot: item.so_serial_snapshot,
      ten_vi_tri_kho: item.ten_vi_tri_kho,
      so_luong_giao: item.so_luong_giao,
      ghi_chu_ban_giao: item.ghi_chu_ban_giao,
      created_at: item.created_at,
    };

    if (laThietBiChinh) {
      sanPham.thiet_bi_chinh.push(vatPham);
    } else {
      sanPham.bo_di_kem.push(vatPham);
    }
  }

  return Array.from(map.values());
}

async function uploadAnhKhiTra(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "t-rent/orders/returns",
        resource_type: "image",
      },
      (loi, ketQua) => {
        if (loi) return reject(loi);
        resolve(ketQua);
      }
    );

    stream.end(file.buffer);
  });
}

class SettlementModel {
  constructor({
    id,
    ma_don,
    khach_hang_id,
    ten_khach_hang,
    email_khach_hang,
    sdt_khach_hang,
    dia_chi_khach_hang,

    ngay_nhan,
    ngay_tra,
    so_ngay_thue,

    tong_tien_thue,
    tong_tien_coc,
    tien_coc_da_thanh_toan,
    tien_thue_da_thanh_toan,
    tien_da_hoan_coc,
    tien_da_khau_tru,
    tien_da_phu_thu,

    trang_thai,
    ten_trang_thai,

    ban_giao_luc,
    nguoi_ban_giao_id,
    ten_nguoi_ban_giao,
    ghi_chu_ban_giao,

    tra_luc,
    nguoi_nhan_tra_id,
    ten_nguoi_nhan_tra,
    ghi_chu_thanh_ly,

    phi_phat_sinh_tien,

    anh_url_mau_thiet_bi,

    created_at,
    updated_at,

    chi_tiet_don = [],
    san_pham_kem_serial = [],
    thanh_toan = [],
    tep_don_thue = [],
  } = {}) {
    this.id = id;
    this.ma_don = ma_don || "";
    this.khach_hang_id = khach_hang_id || null;

    this.ten_khach_hang = ten_khach_hang || "";
    this.email_khach_hang = email_khach_hang || "";
    this.sdt_khach_hang = sdt_khach_hang || "";
    this.dia_chi_khach_hang = dia_chi_khach_hang || "";

    this.ngay_nhan = ngay_nhan || null;
    this.ngay_tra = ngay_tra || null;
    this.so_ngay_thue = Number(so_ngay_thue || 0);

    this.tong_tien_thue = Number(tong_tien_thue || 0);
    this.tong_tien_coc = Number(tong_tien_coc || 0);
    this.tien_coc_da_thanh_toan = Number(tien_coc_da_thanh_toan || 0);
    this.tien_thue_da_thanh_toan = Number(tien_thue_da_thanh_toan || 0);
    this.tien_da_hoan_coc = Number(tien_da_hoan_coc || 0);
    this.tien_da_khau_tru = Number(tien_da_khau_tru || 0);
    this.tien_da_phu_thu = Number(tien_da_phu_thu || 0);

    this.trang_thai = Number(trang_thai || 0);
    this.ten_trang_thai = ten_trang_thai || null;

    this.ban_giao_luc = ban_giao_luc || null;
    this.nguoi_ban_giao_id = nguoi_ban_giao_id || null;
    this.ten_nguoi_ban_giao = ten_nguoi_ban_giao || null;
    this.ghi_chu_ban_giao = ghi_chu_ban_giao || null;

    this.tra_luc = tra_luc || null;
    this.nguoi_nhan_tra_id = nguoi_nhan_tra_id || null;
    this.ten_nguoi_nhan_tra = ten_nguoi_nhan_tra || null;
    this.ghi_chu_thanh_ly = ghi_chu_thanh_ly || null;

    this.phi_phat_sinh_tien = Number(phi_phat_sinh_tien || 0);

    this.anh_url_mau_thiet_bi = anh_url_mau_thiet_bi || null;

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;

    this.chi_tiet_don = chi_tiet_don.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,
      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      ten_danh_muc: item.ten_danh_muc || "",
      anh_url: item.anh_url || "",
      so_luong: Number(item.so_luong || 0),
      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),
      tien_thue: Number(item.tien_thue || 0),
      tien_coc: Number(item.tien_coc || 0),
    }));

    this.san_pham_kem_serial = san_pham_kem_serial.map((item) => ({
      chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      ten_danh_muc: item.ten_danh_muc || "",
      anh_url: item.anh_url || "",
      so_luong_dat: Number(item.so_luong_dat || 0),
      thiet_bi_chinh: (item.thiet_bi_chinh || []).map((vatPham) => this.mapVatPham(vatPham)),
      bo_di_kem: (item.bo_di_kem || []).map((vatPham) => this.mapVatPham(vatPham)),
    }));

    this.thanh_toan = thanh_toan.map((item) => ({
      id: item.id,
      so_tien: Number(item.so_tien || 0),
      loai_dong_tien_id: item.loai_dong_tien_id || null,
      ten_loai_dong_tien: item.ten_loai_dong_tien || "",
      ten_nguoi_thuc_hien: item.ten_nguoi_thuc_hien || "",
      ma_giao_dich: item.ma_giao_dich || "",
      ghi_chu: item.ghi_chu || "",
      created_at: item.created_at || null,
    }));

    this.tep_don_thue = tep_don_thue.map((item) => ({
      id: item.id,
      muc_dich_id: item.muc_dich_id || null,
      ten_muc_dich: item.ten_muc_dich || "",
      ten_file_goc: item.ten_file_goc || "",
      file_url: item.file_url || "",
      loai_file: item.loai_file || "",
      kich_thuoc_file: item.kich_thuoc_file ? Number(item.kich_thuoc_file) : null,
      ten_nguoi_upload: item.ten_nguoi_upload || "",
      uploaded_at: item.uploaded_at || null,
    }));
  }

  mapVatPham(item) {
    return {
      id: item.id,
      chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
      bo_di_kem_id: item.bo_di_kem_id || null,
      thiet_bi_id: item.thiet_bi_id || null,
      phu_kien_id: item.phu_kien_id || null,
      ten_phu_kien: item.ten_phu_kien || "",
      ten_vat_pham_snapshot: item.ten_vat_pham_snapshot || "",
      so_serial: item.so_serial || "",
      so_serial_snapshot: item.so_serial_snapshot || "",
      ten_vi_tri_kho: item.ten_vi_tri_kho || "",
      so_luong_giao: Number(item.so_luong_giao || 0),
      ghi_chu_ban_giao: item.ghi_chu_ban_giao || null,
      created_at: item.created_at || null,
    };
  }

  static async layDanhSachThanhLyService({ trang_thai, tu_khoa, page, limit }) {
    await settlementRepository.capNhatDonQuaHan();

    const trangThai = trang_thai ? Number(trang_thai) : null;
    const tuKhoa = String(tu_khoa || "").trim();
    const soTrang = Number(page || 1);
    const soDong = Number(limit || 10);
    const offset = (soTrang - 1) * soDong;

    const total = await settlementRepository.demDonThanhLy({
      trangThai,
      tuKhoa,
    });

    const danhSach = await settlementRepository.layDanhSachDonThanhLy({
      trangThai,
      tuKhoa,
      limit: soDong,
      offset,
    });

    return {
      data: danhSach.map((don) => new SettlementModel(don)),
      total,
      page: soTrang,
      limit: soDong,
    };
  }

  static async layChiTietThanhLyService(donThueId) {
    await settlementRepository.capNhatDonQuaHan();

    const donThue = await settlementRepository.layDonThanhLyTheoId(donThueId);

    if (!donThue) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    const trangThai = Number(donThue.trang_thai);

    if (
      trangThai !== settlementRepository.TRANG_THAI_DANG_THUE &&
      trangThai !== settlementRepository.TRANG_THAI_QUA_HAN &&
      trangThai !== settlementRepository.TRANG_THAI_HOAN_THANH
    ) {
      throw new Error("Đơn này chưa bàn giao nên chưa thể thanh lý");
    }

    const chiTietDon = await settlementRepository.layChiTietDonThanhLy(donThueId);
    const vatPhamBanGiao = await settlementRepository.layVatPhamBanGiao(donThueId);
    const thanhToan = await settlementRepository.layThanhToanCuaDon(donThueId);
    const tepDonThue = await settlementRepository.layTepDonThue(donThueId);

    return new SettlementModel({
      ...donThue,
      chi_tiet_don: chiTietDon,
      san_pham_kem_serial: gomSanPhamKemSerial(vatPhamBanGiao),
      thanh_toan: thanhToan,
      tep_don_thue: tepDonThue,
    });
  }

  static taoDanhSachThietBiCanCapNhat(thietBiDaBanGiao, danhSachKiemTra) {
    const mapKiemTra = new Map();
    const tapThietBiHopLe = new Set(thietBiDaBanGiao.map((item) => String(item.thiet_bi_id)));

    for (const item of danhSachKiemTra) {
      if (!item.thiet_bi_id) {
        throw new Error("Thiếu thiết bị cần kiểm tra");
      }

      const thietBiId = String(item.thiet_bi_id);

      if (!tapThietBiHopLe.has(thietBiId)) {
        throw new Error("Có thiết bị không thuộc đơn thuê này");
      }

      if (mapKiemTra.has(thietBiId)) {
        throw new Error("Một thiết bị không được kiểm tra nhiều lần");
      }

      const trangThaiSauTra = Number(item.trang_thai_sau_tra);

      if (
        trangThaiSauTra !== settlementRepository.TRANG_THAI_THIET_BI_SAN_SANG &&
        trangThaiSauTra !== settlementRepository.TRANG_THAI_THIET_BI_BAO_TRI &&
        trangThaiSauTra !== settlementRepository.TRANG_THAI_THIET_BI_BI_MAT
      ) {
        throw new Error("Trạng thái sau khi trả không hợp lệ");
      }

      const lyDoBaoTri = String(item.ly_do_bao_tri || "").trim();

      if (
        trangThaiSauTra === settlementRepository.TRANG_THAI_THIET_BI_BAO_TRI &&
        !lyDoBaoTri
      ) {
        throw new Error("Vui lòng nhập lý do bảo trì cho từng thiết bị chọn Bảo trì");
      }

      mapKiemTra.set(thietBiId, {
        trang_thai_sau_tra: trangThaiSauTra,
        ly_do_bao_tri: lyDoBaoTri || null,
      });
    }

    return thietBiDaBanGiao.map((item) => {
      const kiemTra = mapKiemTra.get(String(item.thiet_bi_id));

      return {
        thiet_bi_id: item.thiet_bi_id,
        trang_thai_sau_tra:
          kiemTra?.trang_thai_sau_tra ||
          settlementRepository.TRANG_THAI_THIET_BI_SAN_SANG,
        ly_do_bao_tri: kiemTra?.ly_do_bao_tri || null,
      };
    });
  }

  static kiemTraPhuKienTraLai(phuKienDaBanGiao, danhSachKiemTra) {
    const mapKiemTra = new Map();
    const tapPhuKienHopLe = new Set(phuKienDaBanGiao.map((item) => taoKeyPhuKien(item)));

    for (const item of danhSachKiemTra) {
      const key = taoKeyPhuKien(item);

      if (!item.chi_tiet_don_thue_id || !item.phu_kien_id) {
        throw new Error("Thiếu thông tin phụ kiện cần kiểm tra");
      }

      if (!tapPhuKienHopLe.has(key)) {
        throw new Error("Có phụ kiện không thuộc đơn thuê này");
      }

      if (mapKiemTra.has(key)) {
        throw new Error("Một phụ kiện không được kiểm tra nhiều lần");
      }

      const soLuongTraLai = Number(item.so_luong_tra_lai);

      if (!Number.isInteger(soLuongTraLai) || soLuongTraLai < 0) {
        throw new Error("Số lượng phụ kiện trả lại không hợp lệ");
      }

      mapKiemTra.set(key, soLuongTraLai);
    }

    let tongSoLuongGiao = 0;
    let tongSoLuongTraLai = 0;
    let tongSoLuongThieu = 0;
    const mapPhuKienThieu = new Map();

    for (const phuKien of phuKienDaBanGiao) {
      const key = taoKeyPhuKien(phuKien);
      const soLuongGiao = Number(phuKien.so_luong_giao || 0);
      const soLuongTraLai = mapKiemTra.has(key) ? Number(mapKiemTra.get(key)) : soLuongGiao;

      if (soLuongTraLai > soLuongGiao) {
        throw new Error("Số lượng phụ kiện trả lại không được lớn hơn số lượng giao");
      }

      const soLuongThieu = soLuongGiao - soLuongTraLai;

      tongSoLuongGiao += soLuongGiao;
      tongSoLuongTraLai += soLuongTraLai;
      tongSoLuongThieu += soLuongThieu;

      if (soLuongThieu > 0) {
        const phuKienId = String(phuKien.phu_kien_id);
        const soLuongCu = mapPhuKienThieu.get(phuKienId) || 0;
        mapPhuKienThieu.set(phuKienId, soLuongCu + soLuongThieu);
      }
    }

    return {
      tong_so_luong_giao: tongSoLuongGiao,
      tong_so_luong_tra_lai: tongSoLuongTraLai,
      tong_so_luong_thieu: tongSoLuongThieu,
      danh_sach_phu_kien_thieu: Array.from(mapPhuKienThieu.entries()).map(
        ([phu_kien_id, so_luong_thieu]) => ({
          phu_kien_id,
          so_luong_thieu,
        })
      ),
    };
  }

  static tinhTienThanhLy(hinhThuc, soTienNhap, tienCocDaThanhToan) {
    if (hinhThuc === "HOAN_COC") {
      return {
        tienHoanCoc: tienCocDaThanhToan,
        tienKhauTru: 0,
        tienPhuThu: 0,
        phiPhatSinhTien: 0,
      };
    }

    if (hinhThuc === "KHAU_TRU_COC") {
      if (soTienNhap > tienCocDaThanhToan) {
        throw new Error("Số tiền khấu trừ không được lớn hơn tiền cọc");
      }

      return {
        tienHoanCoc: tienCocDaThanhToan - soTienNhap,
        tienKhauTru: soTienNhap,
        tienPhuThu: 0,
        phiPhatSinhTien: soTienNhap,
      };
    }

    return {
      tienHoanCoc: 0,
      tienKhauTru: tienCocDaThanhToan,
      tienPhuThu: soTienNhap,
      phiPhatSinhTien: tienCocDaThanhToan + soTienNhap,
    };
  }

  static async lapPhieuTraService(nguoiDungId, donThueId, body = {}, files = []) {
    await settlementRepository.capNhatDonQuaHan();

    const donThue = await settlementRepository.layDonThanhLyTheoId(donThueId);

    if (!donThue) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (Number(donThue.trang_thai) === settlementRepository.TRANG_THAI_HOAN_THANH) {
      throw new Error("Đơn thuê đã thanh lý trước đó");
    }

    if (
      Number(donThue.trang_thai) !== settlementRepository.TRANG_THAI_DANG_THUE &&
      Number(donThue.trang_thai) !== settlementRepository.TRANG_THAI_QUA_HAN
    ) {
      throw new Error("Chỉ được thanh lý đơn đang thuê hoặc quá hạn");
    }

    const ghiChuThanhLy = String(body.ghi_chu_thanh_ly || "").trim();
    const hinhThuc = String(body.hinh_thuc_xu_ly_coc || "").trim();
    const soTienNhap = Number(body.so_tien || 0);

    if (!ghiChuThanhLy) {
      throw new Error("Vui lòng nhập ghi chú thanh lý");
    }

    if (!["HOAN_COC", "KHAU_TRU_COC", "PHU_THU"].includes(hinhThuc)) {
      throw new Error("Vui lòng chọn hình thức xử lý cọc");
    }

    if (hinhThuc !== "HOAN_COC" && soTienNhap <= 0) {
      throw new Error("Vui lòng nhập số tiền khấu trừ/phụ thu");
    }

    if (!files || files.length === 0) {
      throw new Error("Vui lòng upload ít nhất 1 ảnh khi trả");
    }

    const daThanhLy = await settlementRepository.kiemTraDaCoThanhLy(donThueId);

    if (daThanhLy) {
      throw new Error("Đơn này đã có dòng tiền thanh lý");
    }

    const tienCocDaThanhToan = await settlementRepository.layTienCocDaThanhToan(donThueId);

    if (tienCocDaThanhToan <= 0) {
      throw new Error("Đơn này chưa có tiền cọc đã thanh toán");
    }

    const danhSachKiemTraThietBi = docMangJson(
      body.kiem_tra_thiet_bi,
      "Dữ liệu kiểm tra thiết bị"
    );

    const danhSachKiemTraPhuKien = docMangJson(
      body.kiem_tra_phu_kien,
      "Dữ liệu kiểm tra phụ kiện"
    );

    const thietBiDaBanGiao = await settlementRepository.layThietBiDaBanGiao(donThueId);
    const phuKienDaBanGiao = await settlementRepository.layPhuKienDaBanGiao(donThueId);

    const danhSachThietBiCapNhat = SettlementModel.taoDanhSachThietBiCanCapNhat(
      thietBiDaBanGiao,
      danhSachKiemTraThietBi
    );

    const ketQuaKiemTraPhuKien = SettlementModel.kiemTraPhuKienTraLai(
      phuKienDaBanGiao,
      danhSachKiemTraPhuKien
    );

    const tien = SettlementModel.tinhTienThanhLy(hinhThuc, soTienNhap, tienCocDaThanhToan);

    const danhSachAnhKhiTra = [];

    for (const file of files) {
      const upload = await uploadAnhKhiTra(file);

      danhSachAnhKhiTra.push({
        ten_file_goc: file.originalname,
        file_url: upload.secure_url,
        loai_file: file.mimetype,
        kich_thuoc_file: file.size || null,
      });
    }

    await settlementRepository.luuThanhLy({
      donThueId,
      nguoiDungId,
      phienThanhToanId: donThue.phien_thanh_toan_id || null,
      ghiChuThanhLy,
      phiPhatSinhTien: tien.phiPhatSinhTien,
      danhSachThietBiCapNhat,
      tienHoanCoc: tien.tienHoanCoc,
      tienKhauTru: tien.tienKhauTru,
      tienPhuThu: tien.tienPhuThu,
      danhSachAnhKhiTra,
      danhSachPhuKienThieu: ketQuaKiemTraPhuKien.danh_sach_phu_kien_thieu,
    });

    return {
      message: "Lập phiếu trả/thanh lý thành công",
      tien_coc_da_thanh_toan: tienCocDaThanhToan,
      tien_hoan_coc: tien.tienHoanCoc,
      tien_khau_tru: tien.tienKhauTru,
      tien_phu_thu: tien.tienPhuThu,
      phi_phat_sinh_tien: tien.phiPhatSinhTien,
      so_anh_khi_tra: danhSachAnhKhiTra.length,
      so_thiet_bi_da_kiem_tra: danhSachThietBiCapNhat.length,
      kiem_tra_phu_kien: ketQuaKiemTraPhuKien,
    };
  }
}

module.exports = SettlementModel;
