const equipmentCategoryRepository = require("../repositories/equipmentCategoryRepository");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function docTinhChatId(giaTri) {
  if (giaTri === undefined || giaTri === null || String(giaTri).trim() === "") {
    throw new Error("Vui lòng chọn tính chất danh mục");
  }

  const so = Number(giaTri);

  if (![2501, 2502, 2503].includes(so)) {
    throw new Error("Tính chất danh mục không hợp lệ");
  }

  return so;
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (trangThai !== 601 && trangThai !== 602) {
    throw new Error("Trạng thái danh mục không hợp lệ");
  }

  return trangThai;
}

function docDanhSachTinhChatId(giaTri) {
  if (giaTri === undefined || giaTri === null || String(giaTri).trim() === "") {
    throw new Error("Vui lòng truyền tinh_chat_id");
  }

  const danhSach = String(giaTri)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));

  if (danhSach.length === 0) {
    throw new Error("tinh_chat_id không hợp lệ");
  }

  const hopLe = danhSach.every((id) => [2501, 2502, 2503].includes(id));

  if (!hopLe) {
    throw new Error("tinh_chat_id không hợp lệ");
  }

  return danhSach;
}

async function layDanhMucBatBuocTonTai(id) {
  const danhMuc = await equipmentCategoryRepository.layDanhMucTheoId(id);

  if (!danhMuc) {
    throw new Error("Không tìm thấy danh mục thiết bị");
  }

  return danhMuc;
}

async function kiemTraTinhChatHopLe(tinhChatId) {
  const tinhChat = await equipmentCategoryRepository.timTinhChatTheoId(
    tinhChatId
  );

  if (!tinhChat) {
    throw new Error("Tính chất danh mục không tồn tại");
  }
}

async function kiemTraTenDanhMucTrung(tenDanhMuc, idBoQua = null) {
  const trung = await equipmentCategoryRepository.timDanhMucTrungTen(
    tenDanhMuc,
    idBoQua
  );

  if (trung) {
    throw new Error("Tên danh mục thiết bị đã tồn tại");
  }
}

class EquipmentCategoryModel {
  constructor({
    id,
    ten_danh_muc,
    tinh_chat_id,
    ten_tinh_chat,
    trang_thai,
    ten_trang_thai,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.ten_danh_muc = ten_danh_muc;
    this.tinh_chat_id = tinh_chat_id;
    this.ten_tinh_chat = ten_tinh_chat || null;
    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  static async layDanhSachDanhMucThietBiService() {
    const rows = await equipmentCategoryRepository.layDanhSachDanhMucThietBi();

    return rows.map((item) => new EquipmentCategoryModel(item));
  }

  static async layDanhSachDanhMucHienThiService(tinhChatIdQuery) {
    const danhSachTinhChatId = docDanhSachTinhChatId(tinhChatIdQuery);

    return await equipmentCategoryRepository.layDanhSachDanhMucHienThi(
      danhSachTinhChatId
    );
  }

  static async layDanhSachTinhChatDanhMucThietBiService() {
    return await equipmentCategoryRepository.layDanhSachTinhChatDanhMuc();
  }

  static async taoDanhMucThietBiService(body = {}) {
    const tenDanhMuc = chuanHoaChuoi(body.ten_danh_muc);
    const tinhChatId = docTinhChatId(body.tinh_chat_id);

    if (!tenDanhMuc) {
      throw new Error("Vui lòng nhập tên danh mục");
    }

    await kiemTraTinhChatHopLe(tinhChatId);
    await kiemTraTenDanhMucTrung(tenDanhMuc);

    const ketQua = await equipmentCategoryRepository.taoDanhMucThietBi({
      tenDanhMuc,
      tinhChatId,
    });

    const danhMucMoi = await equipmentCategoryRepository.layDanhMucTheoId(
      ketQua.id
    );

    return new EquipmentCategoryModel(danhMucMoi);
  }

  static async capNhatDanhMucThietBiService(id, body = {}) {
    const danhMucHienTai = await layDanhMucBatBuocTonTai(id);

    const tenDanhMuc =
      body.ten_danh_muc !== undefined
        ? chuanHoaChuoi(body.ten_danh_muc)
        : danhMucHienTai.ten_danh_muc;

    const tinhChatId =
      body.tinh_chat_id !== undefined
        ? docTinhChatId(body.tinh_chat_id)
        : Number(danhMucHienTai.tinh_chat_id);

    if (!tenDanhMuc) {
      throw new Error("Vui lòng nhập tên danh mục");
    }

    await kiemTraTinhChatHopLe(tinhChatId);
    await kiemTraTenDanhMucTrung(tenDanhMuc, id);

    const ketQua = await equipmentCategoryRepository.capNhatDanhMucThietBi(id, {
      tenDanhMuc,
      tinhChatId,
    });

    if (!ketQua) {
      throw new Error("Không tìm thấy danh mục thiết bị");
    }

    const danhMucSauCapNhat = await equipmentCategoryRepository.layDanhMucTheoId(
      id
    );

    return new EquipmentCategoryModel(danhMucSauCapNhat);
  }

  static async capNhatTrangThaiDanhMucThietBiService(id, body = {}) {
    await layDanhMucBatBuocTonTai(id);

    const trangThai = docTrangThai(body.trang_thai);

    const ketQua =
      await equipmentCategoryRepository.capNhatTrangThaiDanhMucThietBi(
        id,
        trangThai
      );

    if (!ketQua) {
      throw new Error("Không tìm thấy danh mục thiết bị");
    }

    const danhMucSauCapNhat = await equipmentCategoryRepository.layDanhMucTheoId(
      id
    );

    return new EquipmentCategoryModel(danhMucSauCapNhat);
  }

  static async xoaMemDanhMucThietBiService(id) {
    await layDanhMucBatBuocTonTai(id);

    const mauDangDung = await equipmentCategoryRepository.timMauThietBiTheoDanhMuc(
      id
    );

    if (mauDangDung) {
      throw new Error("Danh mục đang được mẫu thiết bị sử dụng, không thể xóa");
    }

    const phuKienDangDung =
      await equipmentCategoryRepository.timPhuKienTheoDanhMuc(id);

    if (phuKienDangDung) {
      throw new Error("Danh mục đang được phụ kiện sử dụng, không thể xóa");
    }

    const ketQua = await equipmentCategoryRepository.xoaMemDanhMucThietBi(id);

    if (!ketQua) {
      throw new Error("Không tìm thấy danh mục thiết bị");
    }

    return {
      message: "Xóa mềm danh mục thiết bị thành công",
    };
  }
}

module.exports = EquipmentCategoryModel;