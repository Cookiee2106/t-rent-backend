const equipmentNeedRepository = require("../repositories/equipmentNeedRepository");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (
    trangThai !== TRANG_THAI_HIEN_THI &&
    trangThai !== TRANG_THAI_DA_AN
  ) {
    throw new Error("Trạng thái nhu cầu không hợp lệ");
  }

  return trangThai;
}

function coThuocTinh(doiTuong, tenThuocTinh) {
  return Object.prototype.hasOwnProperty.call(
    doiTuong || {},
    tenThuocTinh
  );
}

async function layNhuCauBatBuocTonTai(id) {
  const nhuCau = await equipmentNeedRepository.layNhuCauTheoId(id);

  if (!nhuCau) {
    throw new Error("Không tìm thấy nhu cầu");
  }

  return nhuCau;
}

async function kiemTraTenNhuCauTrung(
  tenNhuCau,
  idBoQua = null
) {
  const trung = await equipmentNeedRepository.timNhuCauTrungTen(
    tenNhuCau,
    idBoQua
  );

  if (trung) {
    throw new Error("Tên nhu cầu đã tồn tại");
  }
}

class EquipmentNeedModel {
  constructor({
    id,
    ten_nhu_cau,
    mo_ta,
    trang_thai,
    ten_trang_thai,
    so_mau_dang_dung,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_nhu_cau = ten_nhu_cau;
    this.mo_ta = mo_ta || null;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.so_mau_dang_dung = Number(so_mau_dang_dung || 0);
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachNhuCauService() {
    const rows = await equipmentNeedRepository.layDanhSachNhuCau();

    return rows.map((item) => new EquipmentNeedModel(item));
  }

  static async layDanhSachNhuCauDangHienThiService() {
    return await equipmentNeedRepository.layDanhSachNhuCauDangHienThi();
  }

  static async taoNhuCauService(body = {}) {
    const tenNhuCau = chuanHoaChuoi(body.ten_nhu_cau);
    const moTa = chuanHoaChuoi(body.mo_ta) || null;

    if (!tenNhuCau) {
      throw new Error("Vui lòng nhập tên nhu cầu");
    }

    await kiemTraTenNhuCauTrung(tenNhuCau);

    const ketQua = await equipmentNeedRepository.taoNhuCau({
      tenNhuCau,
      moTa,
    });

    const nhuCauMoi =
      await equipmentNeedRepository.layNhuCauTheoId(ketQua.id);

    return new EquipmentNeedModel(nhuCauMoi);
  }

  static async capNhatNhuCauService(id, body = {}) {
    const hienTai = await layNhuCauBatBuocTonTai(id);

    const tenNhuCau = coThuocTinh(body, "ten_nhu_cau")
      ? chuanHoaChuoi(body.ten_nhu_cau)
      : hienTai.ten_nhu_cau;

    const moTa = coThuocTinh(body, "mo_ta")
      ? chuanHoaChuoi(body.mo_ta) || null
      : hienTai.mo_ta;

    if (!tenNhuCau) {
      throw new Error("Vui lòng nhập tên nhu cầu");
    }

    await kiemTraTenNhuCauTrung(tenNhuCau, id);

    const ketQua = await equipmentNeedRepository.capNhatNhuCau(
      id,
      {
        tenNhuCau,
        moTa,
      }
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy nhu cầu");
    }

    const nhuCauSauCapNhat =
      await equipmentNeedRepository.layNhuCauTheoId(id);

    return new EquipmentNeedModel(nhuCauSauCapNhat);
  }

  static async capNhatTrangThaiNhuCauService(
    id,
    body = {}
  ) {
    await layNhuCauBatBuocTonTai(id);

    const trangThai = docTrangThai(body.trang_thai);

    // Vẫn cho phép ẩn khi đang có mẫu sử dụng.
    // Liên kết mau_thiet_bi_nhu_cau không bị xóa.
    const ketQua =
      await equipmentNeedRepository.capNhatTrangThaiNhuCau(
        id,
        trangThai
      );

    if (!ketQua) {
      throw new Error("Không tìm thấy nhu cầu");
    }

    const nhuCauSauCapNhat =
      await equipmentNeedRepository.layNhuCauTheoId(id);

    return new EquipmentNeedModel(nhuCauSauCapNhat);
  }
}

module.exports = EquipmentNeedModel;
