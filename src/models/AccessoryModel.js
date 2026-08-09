const adminAccessoryRepository = require("../repositories/adminAccessoryRepository");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return null;
  }

  const ketQua = String(giaTri).trim();
  return ketQua || null;
}

function chuanHoaTenDeSoSanh(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function laDanhMucCapSau(danhMuc) {
  return chuanHoaTenDeSoSanh(danhMuc?.ten_danh_muc) === "cap sau";
}

function docSoLuong(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error("Số lượng tại vị trí phải là số nguyên lớn hơn hoặc bằng 0");
  }

  return so;
}

function docDanhSachViTri(body = {}) {
  let danhSach = Array.isArray(body.vi_tri_kho) ? body.vi_tri_kho : null;

  if (!danhSach) {
    const viTriKhoId = chuanHoaChuoi(body.vi_tri_kho_id);

    if (viTriKhoId) {
      danhSach = [
        {
          vi_tri_kho_id: viTriKhoId,
          so_luong: body.tong_so_luong ?? 0,
        },
      ];
    }
  }

  if (!Array.isArray(danhSach) || danhSach.length === 0) {
    throw new Error("Vui lòng thêm ít nhất một vị trí kho cho phụ kiện");
  }

  const daChon = new Set();

  return danhSach.map((item) => {
    const viTriKhoId = chuanHoaChuoi(item?.vi_tri_kho_id);
    const soLuong = docSoLuong(item?.so_luong ?? 0);

    if (!viTriKhoId) {
      throw new Error("Vui lòng chọn đầy đủ vị trí kho cho phụ kiện");
    }

    if (daChon.has(viTriKhoId)) {
      throw new Error("Một vị trí kho không được chọn lặp lại cho cùng phụ kiện");
    }

    daChon.add(viTriKhoId);

    return {
      viTriKhoId,
      soLuong,
    };
  });
}

async function kiemTraTonTaiDuLieuLienQuan({
  ngamId,
  danhMucId,
}) {
  const danhMuc =
    await adminAccessoryRepository.layDanhMucPhuKienDangHienThiTheoId(
      danhMucId
    );

  if (!danhMuc) {
    throw new Error("Vui lòng chọn danh mục phụ kiện đang hiển thị");
  }

  const laCapSau = laDanhMucCapSau(danhMuc);
  let ngam = null;

  if (laCapSau) {
    if (!ngamId) {
      throw new Error("Vui lòng chọn ngàm cho phụ kiện Cáp sau");
    }

    ngam =
      await adminAccessoryRepository.layNgamDangHienThiTheoId(
        ngamId
      );

    if (!ngam) {
      throw new Error("Ngàm không hợp lệ, đã bị ẩn hoặc hãng của ngàm đã bị ẩn");
    }
  } else if (ngamId) {
    throw new Error("Chỉ phụ kiện thuộc danh mục Cáp sau mới được chọn ngàm");
  }

  return {
    ngam,
    danhMuc,
  };
}

async function kiemTraTenTrung(tenPhuKien, idBoQua = null) {
  const trung = await adminAccessoryRepository.timPhuKienTrungTen(
    tenPhuKien,
    idBoQua
  );

  if (trung) {
    throw new Error("Tên phụ kiện đã tồn tại");
  }
}

async function kiemTraDanhSachViTri({ danhSachViTri, idBoQua = null }) {
  for (const item of danhSachViTri) {
    const viTriKho =
      await adminAccessoryRepository.layViTriKhoDangHienThiTheoId(
        item.viTriKhoId
      );

    if (!viTriKho) {
      throw new Error("Vui lòng chọn vị trí kho đang hiển thị");
    }

    const soLuongDangChua =
      await adminAccessoryRepository.tinhSoLuongDangChuaTaiViTri(
        item.viTriKhoId,
        idBoQua
      );

    const sucChuaToiDa = Number(viTriKho.suc_chua_toi_da || 0);

    if (
      sucChuaToiDa > 0 &&
      soLuongDangChua + item.soLuong > sucChuaToiDa
    ) {
      throw new Error(
        `Vị trí "${viTriKho.ten_vi_tri}" chỉ còn ${Math.max(
          sucChuaToiDa - soLuongDangChua,
          0
        )} chỗ trống`
      );
    }
  }
}

async function kiemTraKhongGiamDuoiSoLuongDangThue(phuKienId, danhSachViTriMoi) {
  const danhSachCu =
    await adminAccessoryRepository.layPhanBoViTriCuaPhuKien(phuKienId);

  const soLuongMoiTheoViTri = new Map(
    danhSachViTriMoi.map((item) => [String(item.viTriKhoId), item.soLuong])
  );

  for (const viTriCu of danhSachCu) {
    const soLuongDangThue =
      await adminAccessoryRepository.tinhSoLuongDangThueTaiPhanBo(viTriCu.id);

    const soLuongMoi = Number(
      soLuongMoiTheoViTri.get(String(viTriCu.vi_tri_kho_id)) || 0
    );

    if (soLuongMoi < soLuongDangThue) {
      throw new Error(
        `Vị trí "${viTriCu.ten_vi_tri}" đang có ${soLuongDangThue} phụ kiện được bàn giao, không thể giảm xuống ${soLuongMoi}`
      );
    }
  }
}

function docDuLieuPhuKien(body = {}) {
  const tenPhuKien = chuanHoaChuoi(body.ten_phu_kien);
  const ngamId = chuanHoaChuoi(body.ngam_id);
  const danhMucId = chuanHoaChuoi(body.danh_muc_id);
  const danhSachViTri = docDanhSachViTri(body);
  const moTa = chuanHoaChuoi(body.mo_ta);

  if (!tenPhuKien) {
    throw new Error("Vui lòng nhập tên phụ kiện");
  }

  if (!danhMucId) {
    throw new Error("Vui lòng chọn danh mục phụ kiện");
  }

  const tongSoLuong = danhSachViTri.reduce(
    (tong, item) => tong + item.soLuong,
    0
  );

  return {
    tenPhuKien,
    ngamId,
    danhMucId,
    danhSachViTri,
    tongSoLuong,
    moTa,
  };
}

class AccessoryModel {
  constructor({
    id,
    ten_phu_kien,
    trang_thai,

    ngam_id,
    ten_ngam,

    danh_muc_id,
    ten_danh_muc,

    vi_tri_kho_id,
    ten_vi_tri,
    suc_chua_toi_da,
    vi_tri_kho = [],

    tong_so_luong,
    so_luong_dang_su_dung,
    so_luong_mat_hu_hong,

    mo_ta,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_phu_kien = ten_phu_kien;
    this.trang_thai = Number(trang_thai || TRANG_THAI_HIEN_THI);
    this.ten_trang_thai =
      this.trang_thai === TRANG_THAI_HIEN_THI ? "Hiện" : "Ẩn";

    this.ngam_id = ngam_id || null;
    this.ten_ngam = ten_ngam || null;

    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;

    this.vi_tri_kho = Array.isArray(vi_tri_kho)
      ? vi_tri_kho.map((item) => ({
          id: item.id || null,
          vi_tri_kho_id: item.vi_tri_kho_id || null,
          ten_vi_tri: item.ten_vi_tri || null,
          suc_chua_toi_da: Number(item.suc_chua_toi_da || 0),
          so_luong: Number(item.so_luong || 0),
        }))
      : [];

    const viTriDauTien = this.vi_tri_kho[0] || null;

    this.vi_tri_kho_id = viTriDauTien?.vi_tri_kho_id || vi_tri_kho_id || null;
    this.ten_vi_tri =
      this.vi_tri_kho.length > 0
        ? this.vi_tri_kho.map((item) => item.ten_vi_tri).filter(Boolean).join(", ")
        : ten_vi_tri || null;
    this.suc_chua_toi_da = Number(
      viTriDauTien?.suc_chua_toi_da || suc_chua_toi_da || 0
    );

    this.tong_so_luong = Number(tong_so_luong || 0);
    this.so_luong_dang_su_dung = Number(so_luong_dang_su_dung || 0);
    this.so_luong_mat_hu_hong = Number(so_luong_mat_hu_hong || 0);
    this.so_luong_kha_dung = Math.max(
      this.tong_so_luong - this.so_luong_dang_su_dung,
      0
    );

    this.mo_ta = mo_ta || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachPhuKienAdminService() {
    const danhSach = await adminAccessoryRepository.layDanhSachPhuKien();

    return danhSach.map((item) => new AccessoryModel(item));
  }

  static async layChiTietPhuKienAdminService(id) {
    const phuKien = await adminAccessoryRepository.layPhuKienTheoId(id);

    if (!phuKien) {
      throw new Error("Không tìm thấy phụ kiện");
    }

    return new AccessoryModel(phuKien);
  }

  static async taoPhuKienAdminService(body = {}) {
    const duLieu = docDuLieuPhuKien(body);

    await kiemTraTenTrung(duLieu.tenPhuKien);

    await kiemTraTonTaiDuLieuLienQuan({
      ngamId: duLieu.ngamId,
      danhMucId: duLieu.danhMucId,
    });

    await kiemTraDanhSachViTri({
      danhSachViTri: duLieu.danhSachViTri,
    });

    const phuKienMoi = await adminAccessoryRepository.taoPhuKien(duLieu);

    return AccessoryModel.layChiTietPhuKienAdminService(phuKienMoi.id);
  }

  static async capNhatPhuKienAdminService(id, body = {}) {
    const phuKienCu = await adminAccessoryRepository.layPhuKienTheoId(id);

    if (!phuKienCu) {
      throw new Error("Không tìm thấy phụ kiện");
    }

    const duLieu = docDuLieuPhuKien(body);

    await kiemTraTenTrung(duLieu.tenPhuKien, id);

    await kiemTraTonTaiDuLieuLienQuan({
      ngamId: duLieu.ngamId,
      danhMucId: duLieu.danhMucId,
    });

    const dangNamTrongBoDiKem =
      await adminAccessoryRepository.timBoDiKemTheoPhuKien(id);

    const doiDanhMuc =
      String(phuKienCu.danh_muc_id || "") !==
      String(duLieu.danhMucId || "");

    const doiNgam =
      String(phuKienCu.ngam_id || "") !==
      String(duLieu.ngamId || "");

    if (dangNamTrongBoDiKem && (doiDanhMuc || doiNgam)) {
      throw new Error(
        "Không thể đổi danh mục hoặc ngàm vì phụ kiện đang được cấu hình trong bộ đi kèm"
      );
    }

    const soLuongDangCamKet =
      await adminAccessoryRepository.tinhSoLuongDangCamKetCuaPhuKien(
        id
      );

    if (duLieu.tongSoLuong < soLuongDangCamKet) {
      throw new Error(
        `Tổng số lượng không được nhỏ hơn ${soLuongDangCamKet} vì phụ kiện đang được giữ chỗ, đang thuê hoặc quá hạn`
      );
    }

    await kiemTraKhongGiamDuoiSoLuongDangThue(
      id,
      duLieu.danhSachViTri
    );

    await kiemTraDanhSachViTri({
      danhSachViTri: duLieu.danhSachViTri,
      idBoQua: id,
    });

    await adminAccessoryRepository.capNhatPhuKien(id, duLieu);

    return AccessoryModel.layChiTietPhuKienAdminService(id);
  }

  static async doiTrangThaiPhuKienAdminService(id, body = {}) {
    const phuKien = await adminAccessoryRepository.layPhuKienTheoId(id);

    if (!phuKien) {
      throw new Error("Không tìm thấy phụ kiện");
    }

    const hanhDong = String(body.hanh_dong || "")
      .trim()
      .toUpperCase();

    if (!["AN", "HIEN"].includes(hanhDong)) {
      throw new Error("Hành động trạng thái không hợp lệ");
    }

    const trangThaiMoi =
      hanhDong === "AN" ? TRANG_THAI_DA_AN : TRANG_THAI_HIEN_THI;

    if (Number(phuKien.trang_thai) === trangThaiMoi) {
      return new AccessoryModel(phuKien);
    }

    if (hanhDong === "AN") {
      const soLuongDangCamKet =
        await adminAccessoryRepository.tinhSoLuongDangCamKetCuaPhuKien(
          id
        );

      if (soLuongDangCamKet > 0) {
        throw new Error(
          "Không thể ẩn phụ kiện đang được giữ chỗ, đang thuê hoặc quá hạn"
        );
      }

      const danhSachMau =
        await adminAccessoryRepository.layDanhSachMauDangDungPhuKien(id);

      if (danhSachMau.length > 0) {
        const tenMau = danhSachMau
          .slice(0, 3)
          .map((item) => item.ten_mau)
          .join(", ");

        const phanConLai =
          danhSachMau.length > 3
            ? ` và ${danhSachMau.length - 3} mẫu khác`
            : "";

        throw new Error(
          `Không thể ẩn vì phụ kiện đang nằm trong bộ đi kèm của ${tenMau}${phanConLai}. ` +
            "Vui lòng gỡ hoặc thay thế phụ kiện trong các bộ đi kèm trước"
        );
      }
    }

    if (hanhDong === "HIEN") {
      await kiemTraTonTaiDuLieuLienQuan({
        ngamId: phuKien.ngam_id,
        danhMucId: phuKien.danh_muc_id,
      });

      const danhSachViTri =
        await adminAccessoryRepository.layPhanBoViTriCuaPhuKien(id);

      if (danhSachViTri.length === 0) {
        throw new Error("Phụ kiện chưa được phân bổ vào vị trí kho");
      }

      for (const viTri of danhSachViTri) {
        if (
          Number(viTri.trang_thai) !== TRANG_THAI_HIEN_THI ||
          viTri.da_xoa_luc
        ) {
          throw new Error(
            `Vị trí "${viTri.ten_vi_tri}" đã bị ẩn hoặc xóa, không thể hiện phụ kiện`
          );
        }
      }
    }

    await adminAccessoryRepository.capNhatTrangThaiPhuKien(
      id,
      trangThaiMoi
    );

    return AccessoryModel.layChiTietPhuKienAdminService(id);
  }

  static async xoaMemPhuKienAdminService(id) {
    const phuKien = await adminAccessoryRepository.layPhuKienTheoId(id);

    if (!phuKien) {
      throw new Error("Không tìm thấy phụ kiện");
    }

    const soLuongDangCamKet =
      await adminAccessoryRepository.tinhSoLuongDangCamKetCuaPhuKien(
        id
      );

    if (soLuongDangCamKet > 0) {
      throw new Error(
        "Không thể xóa phụ kiện đang được giữ chỗ, đang thuê hoặc quá hạn"
      );
    }

    const boDiKem = await adminAccessoryRepository.timBoDiKemTheoPhuKien(id);

    if (boDiKem) {
      throw new Error("Không thể xóa phụ kiện đang được cấu hình trong bộ đi kèm");
    }

    await adminAccessoryRepository.xoaMemPhuKien(id);

    return {
      id,
    };
  }
}

module.exports = AccessoryModel;
