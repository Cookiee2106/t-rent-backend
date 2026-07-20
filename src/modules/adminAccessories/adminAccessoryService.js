const AccessoryModel = require("../../models/AccessoryModel");
const adminAccessoryRepository = require("../../repositories/adminAccessoryRepository");

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

async function layDanhSachPhuKienAdminService() {
  const danhSach = await adminAccessoryRepository.layDanhSachPhuKien();

  return danhSach.map((item) => new AccessoryModel(item));
}

async function layChiTietPhuKienAdminService(id) {
  const phuKien = await adminAccessoryRepository.layPhuKienTheoId(id);

  if (!phuKien) {
    throw new Error("Không tìm thấy phụ kiện");
  }

  return new AccessoryModel(phuKien);
}

async function taoPhuKienAdminService(body = {}) {
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

  return layChiTietPhuKienAdminService(phuKienMoi.id);
}

async function capNhatPhuKienAdminService(id, body = {}) {
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

  return layChiTietPhuKienAdminService(id);
}

async function xoaMemPhuKienAdminService(id) {
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

module.exports = {
  layDanhSachPhuKienAdminService,
  layChiTietPhuKienAdminService,
  taoPhuKienAdminService,
  capNhatPhuKienAdminService,
  xoaMemPhuKienAdminService,
};
