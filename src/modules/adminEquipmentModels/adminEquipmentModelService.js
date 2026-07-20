const cloudinary = require("../../config/cloudinary");
const EquipmentModelModel = require("../../models/EquipmentModelModel");
const BundleItemModel = require("../../models/BundleItemModel");
const adminEquipmentModelRepository = require("../../repositories/adminEquipmentModelRepository");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function docSoTien(giaTri, tenTruong) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error(`${tenTruong} phải là số nguyên lớn hơn hoặc bằng 0`);
  }

  return so;
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (trangThai !== TRANG_THAI_HIEN_THI && trangThai !== TRANG_THAI_DA_AN) {
    throw new Error("Trạng thái mẫu thiết bị không hợp lệ");
  }

  return trangThai;
}

function docSoLuongBoDiKem(giaTri) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so <= 0) {
    throw new Error("Số lượng phải là số nguyên lớn hơn 0");
  }

  return so;
}

function kiemTraFileAnh(file) {
  return file && file.mimetype && file.mimetype.startsWith("image/");
}

function uploadAnhLenCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "t-rent/mau-thiet-bi",
        resource_type: "image",
      },
      (loi, ketQua) => {
        if (loi) {
          reject(loi);
        } else {
          resolve(ketQua);
        }
      }
    );

    stream.end(file.buffer);
  });
}

async function layMauBatBuocTonTai(id) {
  const mau = await adminEquipmentModelRepository.layMauThietBiTheoId(id);

  if (!mau) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  return mau;
}

async function kiemTraDanhMucHopLe(danhMucId) {
  const danhMuc = await adminEquipmentModelRepository.layDanhMucHopLe(danhMucId);

  if (!danhMuc) {
    throw new Error("Danh mục thiết bị không tồn tại hoặc đã bị ẩn");
  }

  return danhMuc;
}

async function kiemTraHangHopLe(hangId) {
  const hang = await adminEquipmentModelRepository.layHangHopLe(hangId);

  if (!hang) {
    throw new Error("Hãng thiết bị không tồn tại hoặc đã bị ẩn");
  }

  return hang;
}

async function kiemTraTenMauTrung(tenMau, idBoQua = null) {
  const mauTrung = await adminEquipmentModelRepository.timMauTrungTen(
    tenMau,
    idBoQua
  );

  if (mauTrung) {
    throw new Error("Tên mẫu thiết bị đã tồn tại");
  }
}

async function layDanhSachMauThietBiAdminService() {
  const rows = await adminEquipmentModelRepository.layDanhSachMauThietBiAdmin();

  return rows.map((item) => new EquipmentModelModel(item));
}

async function layChiTietMauThietBiAdminService(id) {
  const mau = await layMauBatBuocTonTai(id);
  const boDiKem = await layDanhSachBoDiKemAdminService(id);

  return new EquipmentModelModel({
    ...mau,
    bo_di_kem: boDiKem,
  });
}

async function taoMauThietBiAdminService(body = {}, fileAnh = null) {
  const danhMucId = chuanHoaChuoi(body.danh_muc_id);
  const hangId = chuanHoaChuoi(body.hang_id);
  const tenMau = chuanHoaChuoi(body.ten_mau);
  const moTa = chuanHoaChuoi(body.mo_ta) || null;
  const giaThueNgay = docSoTien(body.gia_thue_ngay || 0, "Giá thuê/ngày");
  const tienCoc = docSoTien(body.tien_coc || 0, "Tiền cọc");

  if (!danhMucId) {
    throw new Error("Vui lòng chọn danh mục");
  }

  if (!hangId) {
    throw new Error("Vui lòng chọn hãng");
  }

  if (!tenMau) {
    throw new Error("Vui lòng nhập tên mẫu");
  }

  await kiemTraDanhMucHopLe(danhMucId);
  await kiemTraHangHopLe(hangId);
  await kiemTraTenMauTrung(tenMau);

  let anhUrl = null;

  if (fileAnh) {
    if (!kiemTraFileAnh(fileAnh)) {
      throw new Error("File tải lên phải là ảnh");
    }

    const ketQuaUpload = await uploadAnhLenCloudinary(fileAnh);
    anhUrl = ketQuaUpload.secure_url;
  }

  const ketQua = await adminEquipmentModelRepository.taoMauThietBi({
    danhMucId,
    hangId,
    tenMau,
    moTa,
    anhUrl,
    giaThueNgay,
    tienCoc,
    trangThai: TRANG_THAI_HIEN_THI,
  });

  const mauMoi = await adminEquipmentModelRepository.layMauThietBiTheoId(
    ketQua.id
  );

  return new EquipmentModelModel(mauMoi);
}

async function capNhatMauThietBiAdminService(id, body = {}, fileAnh = null) {
  const mauHienTai = await layMauBatBuocTonTai(id);

  const danhMucId =
    body.danh_muc_id !== undefined
      ? chuanHoaChuoi(body.danh_muc_id)
      : mauHienTai.danh_muc_id;

  const hangId =
    body.hang_id !== undefined
      ? chuanHoaChuoi(body.hang_id)
      : mauHienTai.hang_id;

  const tenMau =
    body.ten_mau !== undefined
      ? chuanHoaChuoi(body.ten_mau)
      : mauHienTai.ten_mau;

  const moTa =
    body.mo_ta !== undefined
      ? chuanHoaChuoi(body.mo_ta) || null
      : mauHienTai.mo_ta;

  const giaThueNgay =
    body.gia_thue_ngay !== undefined
      ? docSoTien(body.gia_thue_ngay, "Giá thuê/ngày")
      : Number(mauHienTai.gia_thue_ngay);

  const tienCoc =
    body.tien_coc !== undefined
      ? docSoTien(body.tien_coc, "Tiền cọc")
      : Number(mauHienTai.tien_coc);

  if (!danhMucId) {
    throw new Error("Vui lòng chọn danh mục");
  }

  if (!hangId) {
    throw new Error("Vui lòng chọn hãng");
  }

  if (!tenMau) {
    throw new Error("Vui lòng nhập tên mẫu");
  }

  await kiemTraDanhMucHopLe(danhMucId);
  await kiemTraHangHopLe(hangId);
  await kiemTraTenMauTrung(tenMau, id);

  let anhUrl = mauHienTai.anh_url;

  if (fileAnh) {
    if (!kiemTraFileAnh(fileAnh)) {
      throw new Error("File tải lên phải là ảnh");
    }

    const ketQuaUpload = await uploadAnhLenCloudinary(fileAnh);
    anhUrl = ketQuaUpload.secure_url;
  }

  const ketQua = await adminEquipmentModelRepository.capNhatMauThietBi(id, {
    danhMucId,
    hangId,
    tenMau,
    moTa,
    anhUrl,
    giaThueNgay,
    tienCoc,
  });

  if (!ketQua) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  const mauSauCapNhat = await adminEquipmentModelRepository.layMauThietBiTheoId(
    id
  );

  return new EquipmentModelModel(mauSauCapNhat);
}

async function capNhatTrangThaiMauThietBiAdminService(id, body = {}) {
  await layMauBatBuocTonTai(id);

  const trangThai = docTrangThai(body.trang_thai);

  const ketQua = await adminEquipmentModelRepository.capNhatTrangThaiMauThietBi(
    id,
    trangThai
  );

  if (!ketQua) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  const mauSauCapNhat = await adminEquipmentModelRepository.layMauThietBiTheoId(
    id
  );

  return new EquipmentModelModel(mauSauCapNhat);
}

async function layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId) {
  const mau = await adminEquipmentModelRepository.layThongTinMauThietBiChinh(
    mauThietBiChinhId
  );

  if (!mau) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  return mau;
}

async function layDanhSachBoDiKemAdminService(mauThietBiChinhId) {
  await layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

  const rows = await adminEquipmentModelRepository.layDanhSachBoDiKem(
    mauThietBiChinhId
  );

  return rows.map((item) => new BundleItemModel(item));
}

async function layGoiYBoDiKemAdminService(mauThietBiChinhId, query = {}) {
  const mauChinh = await layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

  const tuKhoa = chuanHoaChuoi(query.q);
  const khoaTim = tuKhoa ? `%${tuKhoa}%` : "";

  const thietBiPhu = await adminEquipmentModelRepository.layGoiYThietBiPhu(
    mauThietBiChinhId,
    mauChinh,
    khoaTim
  );

  const phuKien = await adminEquipmentModelRepository.layGoiYPhuKien(
    mauThietBiChinhId,
    khoaTim
  );

  return {
    thiet_bi_phu: thietBiPhu,
    phu_kien: phuKien.map((item) => ({
      ...item,
      tong_so_luong: Number(item.tong_so_luong || 0),
    })),
  };
}

async function taoBoDiKemAdminService(mauThietBiChinhId, body = {}) {
  const mauChinh = await layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

  const mauThietBiPhuId = chuanHoaChuoi(body.mau_thiet_bi_phu_id);
  const phuKienId = chuanHoaChuoi(body.phu_kien_id);
  const soLuong = docSoLuongBoDiKem(body.so_luong);

  if ((mauThietBiPhuId && phuKienId) || (!mauThietBiPhuId && !phuKienId)) {
    throw new Error("Vui lòng chọn đúng một món đi kèm");
  }

  if (mauThietBiPhuId) {
    const mauPhu = await adminEquipmentModelRepository.layMauThietBiPhuTheoId(
      mauThietBiPhuId
    );

    if (!mauPhu) {
      throw new Error("Mẫu thiết bị phụ không tồn tại hoặc đã bị ẩn");
    }

    const hopLe =
      (mauPhu.hang_id &&
        mauChinh.hang_id &&
        String(mauPhu.hang_id) === String(mauChinh.hang_id) &&
        Number(mauPhu.tinh_chat_id) === 2502) ||
      mauPhu.ten_danh_muc === "Thẻ nhớ";

    if (!hopLe) {
      throw new Error("Mẫu thiết bị phụ không phù hợp với bộ đi kèm");
    }

    const tonTai =
      await adminEquipmentModelRepository.timBoDiKemTheoThietBiPhu(
        mauThietBiChinhId,
        mauThietBiPhuId
      );

    if (tonTai) {
      throw new Error("Thiết bị phụ này đã tồn tại trong bộ đi kèm");
    }

    await adminEquipmentModelRepository.themBoDiKemThietBiPhu(
      mauThietBiChinhId,
      mauThietBiPhuId,
      soLuong
    );
  }

  if (phuKienId) {
    const phuKien = await adminEquipmentModelRepository.layPhuKienTheoId(
      phuKienId
    );

    if (!phuKien) {
      throw new Error("Phụ kiện không tồn tại");
    }

    const tonTai = await adminEquipmentModelRepository.timBoDiKemTheoPhuKien(
      mauThietBiChinhId,
      phuKienId
    );

    if (tonTai) {
      throw new Error("Phụ kiện này đã tồn tại trong bộ đi kèm");
    }

    await adminEquipmentModelRepository.themBoDiKemPhuKien(
      mauThietBiChinhId,
      phuKienId,
      soLuong
    );
  }

  return await layDanhSachBoDiKemAdminService(mauThietBiChinhId);
}

async function xoaBoDiKemAdminService(mauThietBiChinhId, bundleId) {
  await layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

  const tonTai = await adminEquipmentModelRepository.layBoDiKemTheoId(
    mauThietBiChinhId,
    bundleId
  );

  if (!tonTai) {
    throw new Error("Không tìm thấy món trong bộ đi kèm");
  }

  await adminEquipmentModelRepository.xoaBoDiKem(bundleId);

  return {
    message: "Xóa món khỏi bộ đi kèm thành công",
  };
}

module.exports = {
  layDanhSachMauThietBiAdminService,
  layChiTietMauThietBiAdminService,
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
  layDanhSachBoDiKemAdminService,
  layGoiYBoDiKemAdminService,
  taoBoDiKemAdminService,
  xoaBoDiKemAdminService,
};
