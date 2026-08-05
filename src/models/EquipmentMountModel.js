const equipmentMountRepository = require("../repositories/equipmentMountRepository");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function kiemTraUuid(giaTri) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(giaTri || "")
  );
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (
    trangThai !== TRANG_THAI_HIEN_THI &&
    trangThai !== TRANG_THAI_DA_AN
  ) {
    throw new Error("Trạng thái ngàm không hợp lệ");
  }

  return trangThai;
}

function coThuocTinh(doiTuong, tenThuocTinh) {
  return Object.prototype.hasOwnProperty.call(
    doiTuong || {},
    tenThuocTinh
  );
}

async function layNgamBatBuocTonTai(id) {
  const ngam = await equipmentMountRepository.layNgamTheoId(id);

  if (!ngam) {
    throw new Error("Không tìm thấy ngàm");
  }

  return ngam;
}

async function kiemTraHangHopLe(hangId) {
  if (!hangId || !kiemTraUuid(hangId)) {
    throw new Error("Vui lòng chọn hãng");
  }

  const hang = await equipmentMountRepository.layHangHopLe(hangId);

  if (!hang) {
    throw new Error("Hãng thiết bị không tồn tại hoặc đã bị ẩn");
  }

  return hang;
}

async function kiemTraTenNgamTrung(tenNgam, idBoQua = null) {
  const trung = await equipmentMountRepository.timNgamTrungTen(
    tenNgam,
    idBoQua
  );

  if (trung) {
    throw new Error("Tên ngàm đã tồn tại");
  }
}

class EquipmentMountModel {
  constructor({
    id,
    ten_ngam,
    hang_so_huu_id,
    ten_hang,
    trang_thai,
    ten_trang_thai,
    so_mau_dang_dung,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_ngam = ten_ngam;
    this.hang_so_huu_id = hang_so_huu_id;
    this.ten_hang = ten_hang || null;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.so_mau_dang_dung = Number(so_mau_dang_dung || 0);
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachNgamService() {
    const rows = await equipmentMountRepository.layDanhSachNgam();

    return rows.map((item) => new EquipmentMountModel(item));
  }

  static async layDanhSachNgamDangHienThiService() {
    return await equipmentMountRepository.layDanhSachNgamDangHienThi();
  }

  static async taoNgamService(body = {}) {
    const tenNgam = chuanHoaChuoi(body.ten_ngam);
    const hangId = chuanHoaChuoi(body.hang_so_huu_id);

    if (!tenNgam) {
      throw new Error("Vui lòng nhập tên ngàm");
    }

    await kiemTraHangHopLe(hangId);
    await kiemTraTenNgamTrung(tenNgam);

    const ketQua = await equipmentMountRepository.taoNgam({
      tenNgam,
      hangId,
    });

    const ngamMoi = await equipmentMountRepository.layNgamTheoId(
      ketQua.id
    );

    return new EquipmentMountModel(ngamMoi);
  }

  static async capNhatNgamService(id, body = {}) {
    const hienTai = await layNgamBatBuocTonTai(id);

    const tenNgam = coThuocTinh(body, "ten_ngam")
      ? chuanHoaChuoi(body.ten_ngam)
      : hienTai.ten_ngam;

    const hangId = coThuocTinh(body, "hang_so_huu_id")
      ? chuanHoaChuoi(body.hang_so_huu_id)
      : hienTai.hang_so_huu_id;

    if (!tenNgam) {
      throw new Error("Vui lòng nhập tên ngàm");
    }

    await kiemTraHangHopLe(hangId);
    await kiemTraTenNgamTrung(tenNgam, id);

    const ketQua = await equipmentMountRepository.capNhatNgam(
      id,
      {
        tenNgam,
        hangId,
      }
    );

    if (!ketQua) {
      throw new Error("Không tìm thấy ngàm");
    }

    const ngamSauCapNhat =
      await equipmentMountRepository.layNgamTheoId(id);

    return new EquipmentMountModel(ngamSauCapNhat);
  }

  static async capNhatTrangThaiNgamService(id, body = {}) {
    const hienTai = await layNgamBatBuocTonTai(id);
    const trangThai = docTrangThai(body.trang_thai);

    // Chỉ khi hiện lại mới kiểm tra hãng còn hoạt động.
    // Khi ẩn vẫn cho phép dù ngàm đang có mẫu sử dụng.
    if (trangThai === TRANG_THAI_HIEN_THI) {
      await kiemTraHangHopLe(hienTai.hang_so_huu_id);
    }

    const ketQua =
      await equipmentMountRepository.capNhatTrangThaiNgam(
        id,
        trangThai
      );

    if (!ketQua) {
      throw new Error("Không tìm thấy ngàm");
    }

    const ngamSauCapNhat =
      await equipmentMountRepository.layNgamTheoId(id);

    return new EquipmentMountModel(ngamSauCapNhat);
  }
}

module.exports = EquipmentMountModel;
