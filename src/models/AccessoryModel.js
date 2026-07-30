const adminAccessoryRepository = require("../repositories/adminAccessoryRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return null;
  }

  const ketQua = String(giaTri).trim();
  return ketQua || null;
}

function docSoLuong(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error("Tổng số lượng phải là số nguyên lớn hơn hoặc bằng 0");
  }

  return so;
}

async function kiemTraTonTaiDuLieuLienQuan({ hangId, danhMucId, viTriKhoId }) {
  let hang = null;

  if (hangId) {
    hang = await adminAccessoryRepository.layHangDangHienThiTheoId(hangId);

    if (!hang) {
      throw new Error("Hãng không hợp lệ hoặc đã bị ẩn");
    }
  }

  const danhMuc = await adminAccessoryRepository.layDanhMucPhuKienDangHienThiTheoId(
    danhMucId
  );

  if (!danhMuc) {
    throw new Error("Vui lòng chọn danh mục phụ kiện đang hiển thị");
  }

  const viTriKho = await adminAccessoryRepository.layViTriKhoDangHienThiTheoId(
    viTriKhoId
  );

  if (!viTriKho) {
    throw new Error("Vui lòng chọn vị trí kho đang hiển thị");
  }

  return {
    hang,
    danhMuc,
    viTriKho,
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

async function kiemTraSucChuaViTri({ viTriKho, viTriKhoId, tongSoLuong, idBoQua = null }) {
  const soLuongDangChua = await adminAccessoryRepository.tinhSoLuongDangChuaTaiViTri(
    viTriKhoId,
    idBoQua
  );

  const sucChuaToiDa = Number(viTriKho.suc_chua_toi_da || 0);

  if (sucChuaToiDa > 0 && soLuongDangChua + tongSoLuong > sucChuaToiDa) {
    throw new Error(
      `Vị trí "${viTriKho.ten_vi_tri}" chỉ còn ${Math.max(
        sucChuaToiDa - soLuongDangChua,
        0
      )} chỗ trống`
    );
  }
}

function docDuLieuPhuKien(body = {}) {
  const tenPhuKien = chuanHoaChuoi(body.ten_phu_kien);
  const hangId = chuanHoaChuoi(body.hang_id);
  const danhMucId = chuanHoaChuoi(body.danh_muc_id);
  const viTriKhoId = chuanHoaChuoi(body.vi_tri_kho_id);
  const tongSoLuong = docSoLuong(body.tong_so_luong ?? 0);
  const moTa = chuanHoaChuoi(body.mo_ta);

  if (!tenPhuKien) {
    throw new Error("Vui lòng nhập tên phụ kiện");
  }

  if (!danhMucId) {
    throw new Error("Vui lòng chọn danh mục phụ kiện");
  }

  if (!viTriKhoId) {
    throw new Error("Vui lòng chọn vị trí kho");
  }

  return {
    tenPhuKien,
    hangId,
    danhMucId,
    viTriKhoId,
    tongSoLuong,
    moTa,
  };
}

class AccessoryModel {
  constructor({
    id,
    ten_phu_kien,

    hang_id,
    ten_hang,

    danh_muc_id,
    ten_danh_muc,

    vi_tri_kho_id,
    ten_vi_tri,
    suc_chua_toi_da,

    tong_so_luong,
    so_luong_dang_su_dung,
    so_luong_mat_hu_hong,

    mo_ta,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_phu_kien = ten_phu_kien;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;

    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;

    this.vi_tri_kho_id = vi_tri_kho_id || null;
    this.ten_vi_tri = ten_vi_tri || null;
    this.suc_chua_toi_da = Number(suc_chua_toi_da || 0);

    this.tong_so_luong = Number(tong_so_luong || 0);
    this.so_luong_dang_su_dung = Number(so_luong_dang_su_dung || 0);
    this.so_luong_mat_hu_hong = Number(so_luong_mat_hu_hong || 0);
    this.so_luong_kha_dung = this.tong_so_luong - this.so_luong_dang_su_dung;

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

    const { viTriKho } = await kiemTraTonTaiDuLieuLienQuan({
      hangId: duLieu.hangId,
      danhMucId: duLieu.danhMucId,
      viTriKhoId: duLieu.viTriKhoId,
    });

    await kiemTraSucChuaViTri({
      viTriKho,
      viTriKhoId: duLieu.viTriKhoId,
      tongSoLuong: duLieu.tongSoLuong,
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

    const { viTriKho } = await kiemTraTonTaiDuLieuLienQuan({
      hangId: duLieu.hangId,
      danhMucId: duLieu.danhMucId,
      viTriKhoId: duLieu.viTriKhoId,
    });

    const soLuongDangSuDung = await adminAccessoryRepository.tinhSoLuongDangSuDungCuaPhuKien(
      id
    );

    if (duLieu.tongSoLuong < soLuongDangSuDung) {
      throw new Error(
        `Tổng số lượng không được nhỏ hơn ${soLuongDangSuDung} vì phụ kiện đang được giữ/thuê`
      );
    }

    await kiemTraSucChuaViTri({
      viTriKho,
      viTriKhoId: duLieu.viTriKhoId,
      tongSoLuong: duLieu.tongSoLuong,
      idBoQua: id,
    });

    await adminAccessoryRepository.capNhatPhuKien(id, duLieu);

    return AccessoryModel.layChiTietPhuKienAdminService(id);
  }

  static async xoaMemPhuKienAdminService(id) {
    const phuKien = await adminAccessoryRepository.layPhuKienTheoId(id);

    if (!phuKien) {
      throw new Error("Không tìm thấy phụ kiện");
    }

    const soLuongDangSuDung = await adminAccessoryRepository.tinhSoLuongDangSuDungCuaPhuKien(
      id
    );

    if (soLuongDangSuDung > 0) {
      throw new Error("Không thể xóa phụ kiện đang được giữ/thuê");
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
