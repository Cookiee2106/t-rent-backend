const orderRepository = require("../repositories/orderRepository");
const {
  taiNhieuAnhBaoVeLenCloudinaryService,
} = require("../modules/uploads/uploadService");
const rentalPolicyRepository = require("../repositories/rentalPolicyRepository");
const {
  taoHopDongPdf,
  taoBienBanBanGiaoPdf,
} = require("../utils/orderDocumentService");

function taoSoNguyen(giaTri, macDinh) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so <= 0) {
    return macDinh;
  }

  return so;
}

function cungId(idA, idB) {
  return String(idA) === String(idB);
}

function taoMapTheoId(danhSach) {
  return new Map(danhSach.map((item) => [String(item.id), item]));
}

function docDanhSachVatPham(vatPham) {
  if (typeof vatPham === "string") {
    try {
      return JSON.parse(vatPham);
    } catch {
      throw new Error("Dữ liệu vật phẩm bàn giao không hợp lệ");
    }
  }

  return vatPham;
}

class AdminOrderModel {
  constructor({
    id,
    ma_don,
    khach_hang_id,
    ten_khach_hang,
    email_khach_hang,
    sdt_khach_hang,
    dia_chi_khach_hang,
    so_cccd_khach_hang,

    ngay_nhan,
    ngay_tra,
    so_ngay_thue,

    tong_tien_thue,
    tong_tien_coc,
    ty_le_phi_huy_snapshot,
    tien_coc_da_thanh_toan,
    tien_thue_da_thanh_toan,

    trang_thai,
    ten_trang_thai,

    huy_luc,
    ly_do_huy,

    yeu_cau_huy_id,
    ly_do_yeu_cau_huy,
    trang_thai_yeu_cau_huy_id,
    ten_trang_thai_yeu_cau_huy,
    ty_le_phi_huy_yeu_cau,
    tong_tien_coc_yeu_cau,
    phi_huy_yeu_cau,
    tien_coc_hoan_lai_yeu_cau,
    gui_luc_yeu_cau,
    xu_ly_luc_yeu_cau,
    ghi_chu_xu_ly_yeu_cau,

    ban_giao_luc,
    nguoi_ban_giao_id,
    ten_nguoi_ban_giao,
    email_nguoi_ban_giao,
    sdt_nguoi_ban_giao,
    so_cccd_nguoi_ban_giao,
    vai_tro_nguoi_ban_giao,
    ghi_chu_ban_giao,

    tra_luc,
    nguoi_nhan_tra_id,
    ten_nguoi_nhan_tra,
    ghi_chu_thanh_ly,

    phi_phat_sinh_tien,

    anh_url_mau_thiet_bi,
    ten_nguoi_thanh_toan,

    created_at,
    updated_at,

    chi_tiet = [],
    vat_pham_ban_giao = [],
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
    this.so_cccd_khach_hang = so_cccd_khach_hang || "";

    this.ngay_nhan = ngay_nhan || null;
    this.ngay_tra = ngay_tra || null;
    this.so_ngay_thue = Number(so_ngay_thue || 0);

    this.tong_tien_thue = Number(tong_tien_thue || 0);
    this.tong_tien_coc = Number(tong_tien_coc || 0);
    this.ty_le_phi_huy_snapshot = Number(ty_le_phi_huy_snapshot || 0);
    this.tien_coc_da_thanh_toan = Number(tien_coc_da_thanh_toan || 0);
    this.tien_thue_da_thanh_toan = Number(tien_thue_da_thanh_toan || 0);

    this.trang_thai = Number(trang_thai || 0);
    this.ten_trang_thai = ten_trang_thai || null;

    this.huy_luc = huy_luc || null;
    this.ly_do_huy = ly_do_huy || null;

    this.yeu_cau_huy = yeu_cau_huy_id
      ? {
          id: yeu_cau_huy_id,
          ly_do_huy: ly_do_yeu_cau_huy || "",
          trang_thai_id: Number(trang_thai_yeu_cau_huy_id || 0),
          ten_trang_thai: ten_trang_thai_yeu_cau_huy || null,
          ty_le_phi_huy_snapshot: Number(ty_le_phi_huy_yeu_cau || 0),
          tong_tien_coc_snapshot: Number(tong_tien_coc_yeu_cau || 0),
          phi_huy: Number(phi_huy_yeu_cau || 0),
          tien_coc_hoan_lai: Number(tien_coc_hoan_lai_yeu_cau || 0),
          gui_luc: gui_luc_yeu_cau || null,
          xu_ly_luc: xu_ly_luc_yeu_cau || null,
          ghi_chu_xu_ly: ghi_chu_xu_ly_yeu_cau || null,
        }
      : null;

    this.ban_giao_luc = ban_giao_luc || null;
    this.nguoi_ban_giao_id = nguoi_ban_giao_id || null;
    this.ten_nguoi_ban_giao = ten_nguoi_ban_giao || null;
    this.email_nguoi_ban_giao = email_nguoi_ban_giao || null;
    this.sdt_nguoi_ban_giao = sdt_nguoi_ban_giao || null;
    this.so_cccd_nguoi_ban_giao = so_cccd_nguoi_ban_giao || null;
    this.vai_tro_nguoi_ban_giao = vai_tro_nguoi_ban_giao || null;
    this.ghi_chu_ban_giao = ghi_chu_ban_giao || null;

    this.tra_luc = tra_luc || null;
    this.nguoi_nhan_tra_id = nguoi_nhan_tra_id || null;
    this.ten_nguoi_nhan_tra = ten_nguoi_nhan_tra || null;
    this.ghi_chu_thanh_ly = ghi_chu_thanh_ly || null;

    this.phi_phat_sinh_tien = Number(phi_phat_sinh_tien || 0);

    this.anh_url_mau_thiet_bi = anh_url_mau_thiet_bi || null;
    this.ten_nguoi_thanh_toan = ten_nguoi_thanh_toan || null;

    this.created_at = created_at || null;
    this.updated_at = updated_at || null;

    this.chi_tiet = chi_tiet.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,
      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      ten_danh_muc: item.ten_danh_muc || "",
      anh_url: item.anh_url || "",
      so_luong: Number(item.so_luong || 0),
      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      gia_tri_thiet_bi_snapshot: Number(item.gia_tri_thiet_bi_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),
      tien_thue: Number(item.tien_thue || 0),
      tien_coc: Number(item.tien_coc || 0),
      bo_di_kem_snapshot: Array.isArray(item.bo_di_kem_snapshot)
        ? item.bo_di_kem_snapshot.map((phuKien) => ({
            phu_kien_id: phuKien.phu_kien_id || null,
            ten_phu_kien: phuKien.ten_phu_kien || "",
            so_luong: Number(phuKien.so_luong || 0),
            gia_tri_phu_kien_snapshot: Number(
              phuKien.gia_tri_phu_kien_snapshot || 0
            ),
          }))
        : [],
    }));

    this.vat_pham_ban_giao = vat_pham_ban_giao.map((item) => ({
      id: item.id,
      chi_tiet_don_thue_id: item.chi_tiet_don_thue_id,
      bo_di_kem_id: item.bo_di_kem_id || null,
      thiet_bi_id: item.thiet_bi_id || null,
      phu_kien_id: item.phu_kien_id || null,
      phu_kien_vi_tri_kho_id: item.phu_kien_vi_tri_kho_id || null,
      ten_phu_kien: item.ten_phu_kien || "",
      ten_vat_pham_snapshot: item.ten_vat_pham_snapshot || "",
      so_serial: item.so_serial || "",
      so_serial_snapshot: item.so_serial_snapshot || "",
      ten_vi_tri_kho: item.ten_vi_tri_kho || "",
      so_luong_giao: Number(item.so_luong_giao || 0),
      ghi_chu_ban_giao: item.ghi_chu_ban_giao || null,
      created_at: item.created_at || null,
    }));

    this.thanh_toan = thanh_toan.map((item) => ({
      id: item.id,
      so_tien: Number(item.so_tien || 0),
      loai_dong_tien_id: item.loai_dong_tien_id || null,
      ten_loai_dong_tien: item.ten_loai_dong_tien || "",
      ten_nguoi_thanh_toan: item.ten_nguoi_thanh_toan || "",
      ma_giao_dich: item.ma_giao_dich || "",
      ghi_chu: item.ghi_chu || "",
      created_at: item.created_at || null,
    }));

    this.tep_don_thue = tep_don_thue.map((item) => ({
      id: item.id,
      muc_dich_id: item.muc_dich_id || null,
      ten_muc_dich: item.ten_muc_dich || "",
      ten_file_goc: item.ten_file_goc || "",
      protected: true,
      loai_file: item.loai_file || "image/*",
      kich_thuoc_file: item.kich_thuoc_file
        ? Number(item.kich_thuoc_file)
        : null,
      ten_nguoi_upload: item.ten_nguoi_upload || "",
      uploaded_at: item.uploaded_at || null,
    }));
  }

  static async layChinhSachThueService() {
    const chinhSach = await rentalPolicyRepository.layChinhSachThue();

    if (!chinhSach) {
      throw new Error("Chưa cấu hình chính sách phí hủy đơn");
    }

    return {
      ...chinhSach,
      ty_le_phi_huy: Number(chinhSach.ty_le_phi_huy || 0),
    };
  }

  static async capNhatChinhSachThueService(nguoiCapNhatId, body = {}) {
    const tyLePhiHuy = Number(body.ty_le_phi_huy);

    if (
      !Number.isFinite(tyLePhiHuy) ||
      tyLePhiHuy < 0 ||
      tyLePhiHuy > 100
    ) {
      throw new Error("Tỷ lệ phí hủy phải từ 0 đến 100");
    }

    const chinhSach = await rentalPolicyRepository.capNhatTyLePhiHuy(
      nguoiCapNhatId,
      tyLePhiHuy
    );

    if (!chinhSach) {
      throw new Error("Không tìm thấy chính sách phí hủy đơn");
    }

    return {
      ...chinhSach,
      ty_le_phi_huy: Number(chinhSach.ty_le_phi_huy || 0),
    };
  }

  static async xacNhanYeuCauHuyService(
    nhanVienId,
    yeuCauHuyId,
    body = {}
  ) {
    const ghiChuXuLy = String(body.ghi_chu_xu_ly || "").trim();

    return await orderRepository.xacNhanYeuCauHuyDon({
      yeuCauHuyId,
      nhanVienId,
      ghiChuXuLy,
    });
  }

  static async tuChoiYeuCauHuyService(
    nhanVienId,
    yeuCauHuyId,
    body = {}
  ) {
    const ghiChuXuLy = String(body.ghi_chu_xu_ly || "").trim();

    return await orderRepository.tuChoiYeuCauHuyDon({
      yeuCauHuyId,
      nhanVienId,
      ghiChuXuLy,
    });
  }


  static async layDanhSachYeuCauHuyService({ tu_khoa = "" } = {}) {
    const tuKhoa = String(tu_khoa || "").trim();
    const danhSach = await orderRepository.layDanhSachYeuCauHuy({ tuKhoa });
    const data = danhSach.map((don) => new AdminOrderModel(don));

    return {
      data,
      tong_yeu_cau: data.length,
      so_luong_cho_xu_ly: data.filter(
        (item) => Number(item.yeu_cau_huy?.trang_thai_id) === orderRepository.TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY
      ).length,
    };
  }

  static async layDanhSachDonThueService({
    trang_thai,
    tu_khoa,
    yeu_cau_huy,
    page = 1,
    limit = 10,
  }) {
    const trangHienTai = taoSoNguyen(page, 1);
    const soDong = taoSoNguyen(limit, 10);
    const offset = (trangHienTai - 1) * soDong;
    const trangThai = trang_thai ? Number(trang_thai) : null;
    const tuKhoa = String(tu_khoa || "").trim();
    const chiLayYeuCauHuy = String(yeu_cau_huy || "") === "1";

    if (chiLayYeuCauHuy) {
      const danhSachYeuCauHuy = await orderRepository.layDanhSachYeuCauHuy({
        tuKhoa,
      });

      const data = danhSachYeuCauHuy.map(
        (don) => new AdminOrderModel(don)
      );

      return {
        data,
        total: data.length,
        so_luong_cho_xu_ly: data.filter(
          (don) =>
            Number(don.yeu_cau_huy?.trang_thai_id) ===
            orderRepository.TRANG_THAI_YEU_CAU_HUY_CHO_XU_LY
        ).length,
        page: 1,
        limit: data.length || soDong,
      };
    }

    const [danhSach, total] = await Promise.all([
      orderRepository.layDanhSachDonThue({
        trangThai,
        tuKhoa,
        limit: soDong,
        offset,
      }),
      orderRepository.demDonThue(trangThai, tuKhoa),
    ]);

    return {
      data: danhSach.map((don) => new AdminOrderModel(don)),
      total,
      page: trangHienTai,
      limit: soDong,
    };
  }

  static async layChiTietDonThueService(donThueId) {
    const donThue = await orderRepository.layDonThueTheoId(donThueId);

    if (!donThue) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    const [chiTiet, vatPhamBanGiao, thanhToan, tepDonThue] = await Promise.all([
      orderRepository.layChiTietDonThue(donThueId),
      orderRepository.layVatPhamBanGiao(donThueId),
      orderRepository.layThanhToanCuaDon(donThueId),
      orderRepository.layTepDonThue(donThueId),
    ]);

    return new AdminOrderModel({
      ...donThue,
      chi_tiet: chiTiet,
      vat_pham_ban_giao: vatPhamBanGiao,
      thanh_toan: thanhToan,
      tep_don_thue: tepDonThue,
    });
  }

  static async layThietBiSanSangService({ mau_thiet_bi_id, ngay_nhan, ngay_tra }) {
    if (!mau_thiet_bi_id) {
      throw new Error("Thiếu mẫu thiết bị");
    }

    return await orderRepository.layThietBiSanSang({
      mauThietBiId: mau_thiet_bi_id,
      ngayNhan: ngay_nhan || null,
      ngayTra: ngay_tra || null,
    });
  }

  static async kiemTraSoLuongPhuKien(phuKienGiaoMap) {
    for (const [phuKienId, soLuongGiao] of phuKienGiaoMap.entries()) {
      const phuKien = await orderRepository.layPhuKienTheoId(phuKienId);

      if (!phuKien) {
        throw new Error("Không tìm thấy phụ kiện trong bộ đi kèm");
      }

      const soLuongDangGiao = await orderRepository.demSoLuongPhuKienDangGiao(
        phuKienId
      );

      const soLuongConLai = Number(phuKien.tong_so_luong || 0) - soLuongDangGiao;

      if (soLuongGiao > soLuongConLai) {
        throw new Error(
          `Phụ kiện "${phuKien.ten_phu_kien}" chỉ còn ${soLuongConLai}, không đủ để bàn giao`
        );
      }
    }
  }

  static async xemHopDongService(nhanVienId, donThueId) {
    const [donThue, nhanVien] = await Promise.all([
      orderRepository.layDonThueTheoId(donThueId),
      orderRepository.layNguoiDungNoiBoTheoId(nhanVienId),
    ]);

    if (!donThue) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (!nhanVien) {
      throw new Error("Không tìm thấy thông tin nhân viên đang đăng nhập");
    }

    // Trước khi xuất biên bản: hợp đồng lấy người đang xem.
    // Sau khi đã xuất biên bản: cố định theo chính nhân viên đã chốt bàn giao
    // để hợp đồng không thay đổi người đại diện khi nhân viên khác mở lại.
    const nhanVienDaiDien = donThue.nguoi_ban_giao_id
      ? {
          id: donThue.nguoi_ban_giao_id,
          ho_ten: donThue.ten_nguoi_ban_giao,
          email: donThue.email_nguoi_ban_giao,
          so_dien_thoai: donThue.sdt_nguoi_ban_giao,
          so_cccd: donThue.so_cccd_nguoi_ban_giao,
          vai_tro: donThue.vai_tro_nguoi_ban_giao,
        }
      : nhanVien;

    if (!nhanVienDaiDien.so_cccd) {
      throw new Error("Tài khoản nhân viên chưa có CCCD. Vui lòng cập nhật CCCD trước khi xem hợp đồng");
    }

    if (!donThue.so_cccd_khach_hang) {
      throw new Error("Không tìm thấy CCCD từ hồ sơ xác minh đã duyệt của khách hàng");
    }

    const chiTietDon = await orderRepository.layChiTietDonThue(donThueId);

    if (!chiTietDon || chiTietDon.length === 0) {
      throw new Error("Đơn thuê chưa có chi tiết thiết bị");
    }

    const buffer = await taoHopDongPdf(donThue, chiTietDon, nhanVienDaiDien);

    return {
      buffer,
      ten_file: `hop-dong-${donThue.ma_don}.pdf`,
    };
  }

  static async chuanBiVatPhamBanGiaoService(donThueId, vat_pham) {
    const don = await orderRepository.layDonDeBanGiao(donThueId);

    if (!don) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (Number(don.trang_thai) !== orderRepository.TRANG_THAI_DA_GIU_CHO) {
      throw new Error("Chỉ bàn giao được đơn ở trạng thái Đã giữ chỗ");
    }

    const dangChoXuLyHuy = await orderRepository.coYeuCauHuyChoXuLy(donThueId);

    if (dangChoXuLyHuy) {
      throw new Error("Đơn đang có yêu cầu hủy Chờ xử lý, không thể bàn giao");
    }

    const daCoc = await orderRepository.kiemTraDonDaCoc(donThueId);

    if (!daCoc) {
      throw new Error("Đơn thuê chưa có dòng tiền đặt cọc");
    }

    const danhSachVatPham = docDanhSachVatPham(vat_pham);

    if (!Array.isArray(danhSachVatPham) || danhSachVatPham.length === 0) {
      throw new Error("Vui lòng chọn vật phẩm bàn giao");
    }

    const chiTietDon = await orderRepository.layChiTietDonDeBanGiao(donThueId);

    if (chiTietDon.length === 0) {
      throw new Error("Đơn thuê chưa có chi tiết thiết bị");
    }

    const chiTietMap = taoMapTheoId(chiTietDon);
    const mauIds = chiTietDon.map((item) => item.mau_thiet_bi_id);
    const boDiKem = await orderRepository.layBoDiKemTheoMauIds(mauIds);

    const boDiKemTheoMau = new Map();

    for (const bdk of boDiKem) {
      const key = String(bdk.mau_thiet_bi_chinh_id);

      if (!boDiKemTheoMau.has(key)) {
        boDiKemTheoMau.set(key, []);
      }

      boDiKemTheoMau.get(key).push(bdk);
    }

    const soLuongThietBiChinh = new Map();
    const soLuongBoDiKem = new Map();
    const thietBiDaChon = new Set();
    const phuKienGiaoMap = new Map();
    const phuKienBoDiKemDaChon = new Set();

    const vatPhamCanLuu = [];
    const thietBiCanCapNhat = [];

    for (const vatPham of danhSachVatPham) {
      const chiTietId = vatPham.chi_tiet_don_thue_id;
      const chiTiet = chiTietMap.get(String(chiTietId));

      if (!chiTiet) {
        throw new Error("Vật phẩm bàn giao không thuộc đơn thuê này");
      }

      if (!vatPham.bo_di_kem_id) {
        const thietBiId = vatPham.thiet_bi_id;

        if (!thietBiId) {
          throw new Error("Vui lòng chọn đủ thiết bị chính");
        }

        if (thietBiDaChon.has(String(thietBiId))) {
          throw new Error("Một thiết bị vật lý bị chọn trùng");
        }

        const thietBi = await orderRepository.layThietBiVatLyTheoId(thietBiId);

        if (!thietBi) {
          throw new Error("Không tìm thấy thiết bị vật lý");
        }

        if (Number(thietBi.trang_thai) !== orderRepository.TRANG_THAI_THIET_BI_SAN_SANG) {
          throw new Error(`Thiết bị serial ${thietBi.so_serial} không sẵn sàng`);
        }

        if (!cungId(thietBi.mau_thiet_bi_id, chiTiet.mau_thiet_bi_id)) {
          throw new Error(`Thiết bị serial ${thietBi.so_serial} không đúng mẫu`);
        }

        thietBiDaChon.add(String(thietBiId));
        thietBiCanCapNhat.push(thietBiId);

        soLuongThietBiChinh.set(
          String(chiTiet.id),
          (soLuongThietBiChinh.get(String(chiTiet.id)) || 0) + 1
        );

        vatPhamCanLuu.push({
          chi_tiet_don_thue_id: chiTiet.id,
          bo_di_kem_id: null,
          thiet_bi_id: thietBiId,
          phu_kien_id: null,
          phu_kien_vi_tri_kho_id: null,
          ten_vat_pham_snapshot: thietBi.ten_mau,
          ma_tai_san_snapshot: thietBi.ma_tai_san || null,
          so_serial_snapshot: thietBi.so_serial || null,
          so_luong_giao: 1,
        });

        continue;
      }

      const danhSachBoDiKem = boDiKemTheoMau.get(String(chiTiet.mau_thiet_bi_id)) || [];
      const cauHinhBoDiKem = danhSachBoDiKem.find((bdk) =>
        cungId(bdk.id, vatPham.bo_di_kem_id)
      );

      if (!cauHinhBoDiKem) {
        throw new Error("Bộ đi kèm không đúng với mẫu thiết bị trong đơn");
      }

      const keyBoDiKem = `${chiTiet.id}_${cauHinhBoDiKem.id}`;

      if (cauHinhBoDiKem.mau_thiet_bi_phu_id) {
        const thietBiId = vatPham.thiet_bi_id;

        if (!thietBiId) {
          throw new Error("Vui lòng chọn đủ thiết bị đi kèm");
        }

        if (thietBiDaChon.has(String(thietBiId))) {
          throw new Error("Một thiết bị vật lý bị chọn trùng");
        }

        const thietBi = await orderRepository.layThietBiVatLyTheoId(thietBiId);

        if (!thietBi) {
          throw new Error("Không tìm thấy thiết bị đi kèm");
        }

        if (Number(thietBi.trang_thai) !== orderRepository.TRANG_THAI_THIET_BI_SAN_SANG) {
          throw new Error(`Thiết bị đi kèm serial ${thietBi.so_serial} không sẵn sàng`);
        }

        if (!cungId(thietBi.mau_thiet_bi_id, cauHinhBoDiKem.mau_thiet_bi_phu_id)) {
          throw new Error(`Thiết bị đi kèm serial ${thietBi.so_serial} không đúng mẫu`);
        }

        thietBiDaChon.add(String(thietBiId));
        thietBiCanCapNhat.push(thietBiId);

        soLuongBoDiKem.set(
          keyBoDiKem,
          (soLuongBoDiKem.get(keyBoDiKem) || 0) + 1
        );

        vatPhamCanLuu.push({
          chi_tiet_don_thue_id: chiTiet.id,
          bo_di_kem_id: cauHinhBoDiKem.id,
          thiet_bi_id: thietBiId,
          phu_kien_id: null,
          phu_kien_vi_tri_kho_id: null,
          ten_vat_pham_snapshot: thietBi.ten_mau,
          ma_tai_san_snapshot: thietBi.ma_tai_san || null,
          so_serial_snapshot: thietBi.so_serial || null,
          so_luong_giao: 1,
        });

        continue;
      }

      if (cauHinhBoDiKem.phu_kien_id) {
        const soLuongGiao = Number(vatPham.so_luong_giao || 0);
        const soLuongCan =
          Number(cauHinhBoDiKem.so_luong || 1) * Number(chiTiet.so_luong || 0);

        if (phuKienBoDiKemDaChon.has(keyBoDiKem)) {
          throw new Error(
            "Mỗi phụ kiện trong bộ đi kèm chỉ được chọn một vị trí kho"
          );
        }

        if (!Number.isInteger(soLuongGiao) || soLuongGiao !== soLuongCan) {
          throw new Error(
            `Số lượng phụ kiện bàn giao phải bằng ${soLuongCan}`
          );
        }

        if (!cungId(vatPham.phu_kien_id, cauHinhBoDiKem.phu_kien_id)) {
          throw new Error("Phụ kiện bàn giao không đúng cấu hình bộ đi kèm");
        }

        const phuKien = await orderRepository.layPhuKienTheoId(
          cauHinhBoDiKem.phu_kien_id
        );

        if (!phuKien) {
          throw new Error("Không tìm thấy phụ kiện trong bộ đi kèm");
        }

        const phuKienViTriKhoId = String(
          vatPham.phu_kien_vi_tri_kho_id || ""
        ).trim();

        if (!phuKienViTriKhoId) {
          throw new Error(`Vui lòng chọn vị trí kho cho ${phuKien.ten_phu_kien}`);
        }

        const phanBoViTri = await orderRepository.layPhuKienViTriKhoTheoId(
          phuKienViTriKhoId
        );

        if (
          !phanBoViTri ||
          !cungId(phanBoViTri.phu_kien_id, phuKien.id) ||
          !phanBoViTri.dang_su_dung ||
          Number(phanBoViTri.trang_thai_vi_tri) !== 601 ||
          phanBoViTri.vi_tri_da_xoa_luc
        ) {
          throw new Error("Vị trí kho không hợp lệ cho phụ kiện bàn giao");
        }

        phuKienBoDiKemDaChon.add(keyBoDiKem);
        soLuongBoDiKem.set(keyBoDiKem, soLuongGiao);

        phuKienGiaoMap.set(
          String(phuKien.id),
          (phuKienGiaoMap.get(String(phuKien.id)) || 0) + soLuongGiao
        );

        vatPhamCanLuu.push({
          chi_tiet_don_thue_id: chiTiet.id,
          bo_di_kem_id: cauHinhBoDiKem.id,
          thiet_bi_id: null,
          phu_kien_id: phuKien.id,
          phu_kien_vi_tri_kho_id: phuKienViTriKhoId,
          ten_vat_pham_snapshot: phuKien.ten_phu_kien,
          ma_tai_san_snapshot: null,
          so_serial_snapshot: null,
          so_luong_giao: soLuongGiao,
        });
      }
    }

    for (const chiTiet of chiTietDon) {
      const soLuongChinhDaGiao = soLuongThietBiChinh.get(String(chiTiet.id)) || 0;

      if (soLuongChinhDaGiao !== Number(chiTiet.so_luong)) {
        throw new Error("Chưa chọn đủ số lượng thiết bị chính");
      }

      const danhSachBoDiKem = boDiKemTheoMau.get(String(chiTiet.mau_thiet_bi_id)) || [];

      for (const bdk of danhSachBoDiKem) {
        const soLuongCan = Number(bdk.so_luong || 1) * Number(chiTiet.so_luong || 0);
        const keyBoDiKem = `${chiTiet.id}_${bdk.id}`;
        const soLuongDaGiao = soLuongBoDiKem.get(keyBoDiKem) || 0;

        if (soLuongDaGiao !== soLuongCan) {
          throw new Error("Chưa chọn đủ số lượng bộ đi kèm");
        }
      }
    }

    await AdminOrderModel.kiemTraSoLuongPhuKien(phuKienGiaoMap);

    return {
      don,
      vatPhamCanLuu,
    };
  }

  static async xuatBienBanBanGiaoService(
    nhanVienId,
    donThueId,
    { ghi_chu_ban_giao, vat_pham }
  ) {
    const nhanVien = await orderRepository.layNguoiDungNoiBoTheoId(nhanVienId);

    if (!nhanVien) {
      throw new Error("Không tìm thấy thông tin nhân viên đang đăng nhập");
    }

    if (!nhanVien.so_cccd) {
      throw new Error("Tài khoản nhân viên chưa có CCCD. Vui lòng cập nhật CCCD trước khi xuất biên bản");
    }

    const daCoVatPham = await orderRepository.daCoVatPhamBanGiao(donThueId);
    const ghiChuBanGiao = String(ghi_chu_ban_giao || "").trim();

    // Lần xuất đầu tiên bắt buộc phải có một ghi chú chung cho toàn bộ vật phẩm.
    if (!daCoVatPham && !ghiChuBanGiao) {
      throw new Error("Vui lòng nhập ghi chú bàn giao trước khi xuất biên bản");
    }

    if (!daCoVatPham) {
      const duLieu = await AdminOrderModel.chuanBiVatPhamBanGiaoService(
        donThueId,
        vat_pham
      );

      await orderRepository.luuVatPhamBanGiaoDaChon({
        donThueId,
        nhanVienId,
        ghiChuBanGiao,
        vatPham: duLieu.vatPhamCanLuu,
      });
    }

    return await AdminOrderModel.xemBienBanBanGiaoService(donThueId);
  }

  static async xemBienBanBanGiaoService(donThueId) {
    const donThue = await orderRepository.layDonThueTheoId(donThueId);

    if (!donThue) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    const vatPhamBanGiao = await orderRepository.layVatPhamBanGiao(donThueId);

    if (!vatPhamBanGiao || vatPhamBanGiao.length === 0) {
      throw new Error("Biên bản bàn giao chưa được xuất");
    }

    if (!donThue.so_cccd_khach_hang) {
      throw new Error("Không tìm thấy CCCD từ hồ sơ xác minh đã duyệt của khách hàng");
    }

    if (!donThue.so_cccd_nguoi_ban_giao) {
      throw new Error("Nhân viên bàn giao chưa có CCCD");
    }

    const buffer = await taoBienBanBanGiaoPdf(donThue, vatPhamBanGiao);

    return {
      buffer,
      ten_file: `bien-ban-ban-giao-${donThue.ma_don}.pdf`,
    };
  }

  static async lapPhieuBanGiaoService(
    nhanVienId,
    donThueId,
    body = {},
    files
  ) {
    const hopDongFiles = files?.hop_dong_giay || [];
    const anhBanGiaoFiles = files?.anh_ban_giao || [];
    const anhBienBanFiles = files?.anh_bien_ban_ban_giao || [];

    if (hopDongFiles.length === 0) {
      throw new Error("Vui lòng tải lên hợp đồng giấy");
    }

    if (anhBanGiaoFiles.length === 0) {
      throw new Error("Vui lòng tải lên ảnh bàn giao");
    }

    if (anhBienBanFiles.length > 5) {
      throw new Error("Chỉ được chọn tối đa 5 ảnh biên bản bàn giao");
    }

    const tatCaFileCanBaoVe = [
      ...hopDongFiles,
      ...anhBanGiaoFiles,
      ...anhBienBanFiles,
    ];

    for (const file of tatCaFileCanBaoVe) {
      if (!String(file.mimetype || "").startsWith("image/")) {
        throw new Error(
          "Hợp đồng, ảnh bàn giao và biên bản bàn giao chỉ chấp nhận file hình ảnh"
        );
      }
    }

    const don = await orderRepository.layDonDeBanGiao(donThueId);

    if (!don) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (Number(don.trang_thai) !== orderRepository.TRANG_THAI_DA_GIU_CHO) {
      throw new Error("Đơn thuê không còn ở trạng thái Đã giữ chỗ");
    }

    const dangChoXuLyHuy = await orderRepository.coYeuCauHuyChoXuLy(donThueId);

    if (dangChoXuLyHuy) {
      throw new Error("Đơn đang có yêu cầu hủy Chờ xử lý, không thể bàn giao");
    }

    const daCoVatPham = await orderRepository.daCoVatPhamBanGiao(donThueId);

    if (!daCoVatPham) {
      throw new Error("Vui lòng xuất biên bản bàn giao trước khi xác nhận bàn giao");
    }

    // Không cần nút Upload riêng. Ảnh biên bản được gửi cùng request xác nhận.
    // Nếu trước đó đã có ảnh 2604 (dữ liệu cũ) thì vẫn cho dùng lại.
    const soAnhBienBanDaCo = await orderRepository.demTepDonThueTheoMucDich(
      donThueId,
      2604
    );

    if (soAnhBienBanDaCo + anhBienBanFiles.length === 0) {
      throw new Error(
        "Vui lòng chọn ít nhất 1 ảnh biên bản bàn giao đã ký trước khi xác nhận"
      );
    }

    if (soAnhBienBanDaCo + anhBienBanFiles.length > 5) {
      throw new Error("Tổng số ảnh biên bản bàn giao không được vượt quá 5");
    }

    const tepHopDong = await taiNhieuAnhBaoVeLenCloudinaryService(
      hopDongFiles,
      "t-rent/orders/contracts"
    );

    const tepAnhBanGiao = await taiNhieuAnhBaoVeLenCloudinaryService(
      anhBanGiaoFiles,
      "t-rent/orders/handover"
    );

    const tepAnhBienBan = await taiNhieuAnhBaoVeLenCloudinaryService(
      anhBienBanFiles,
      "t-rent/orders/handover-signed"
    );

    await orderRepository.xacNhanPhieuBanGiaoDaChot({
      donThueId,
      nhanVienId,
      tepHopDong,
      tepAnhBanGiao,
      tepAnhBienBan,
    });

    return {
      message: "Lập phiếu bàn giao thành công",
    };
  }
}

module.exports = AdminOrderModel;
