const UserModel = require("../../models/UserModel");
const VerificationProfileModel = require("../../models/VerificationProfileModel");

const {
  timNguoiDungKhacTheoSoDienThoai,
  capNhatThongTinCaNhan,
} = require("../../repositories/userRepository");

const {
  layHoSoXacMinhCuaKhachHang,
  layTrangThaiXacMinhNguoiDung,
  timHoSoDangChoDuyetHoacDaDuyetTheoSoCccd,
  taoHoSoXacMinhVaCapNhatTrangThai,
} = require("../../repositories/verificationProfileRepository");

const {
  taiAnhLenCloudinaryService,
} = require("../uploads/uploadService");

function chuanHoaChuoi(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return "";
  }

  return String(giaTri).trim();
}

function kiemTraSoDienThoai(soDienThoai) {
  return /^0[0-9]{9}$/.test(soDienThoai);
}

function kiemTraSoCccd(soCccd) {
  return /^[0-9]{12}$/.test(soCccd);
}

function kiemTraFileAnh(file) {
  return file && file.mimetype && file.mimetype.startsWith("image/");
}

async function capNhatThongTinCaNhanService(nguoiDungId, duLieu = {}) {
  const hoTen = chuanHoaChuoi(duLieu.ho_ten);
  const soDienThoai = chuanHoaChuoi(duLieu.so_dien_thoai);
  const diaChi = chuanHoaChuoi(duLieu.dia_chi);

  if (!hoTen || !soDienThoai || !diaChi) {
    throw new Error("Vui lòng nhập đầy đủ thông tin");
  }

  if (!kiemTraSoDienThoai(soDienThoai)) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  const soDienThoaiTonTai = await timNguoiDungKhacTheoSoDienThoai(
    nguoiDungId,
    soDienThoai
  );

  if (soDienThoaiTonTai) {
    throw new Error("Số điện thoại đã được sử dụng");
  }

  const row = await capNhatThongTinCaNhan(nguoiDungId, {
    hoTen,
    soDienThoai,
    diaChi,
  });

  if (!row) {
    throw new Error("Không tìm thấy người dùng");
  }

  return new UserModel(row);
}

async function layHoSoXacMinhCuaToiService(nguoiDungId) {
  const row = await layHoSoXacMinhCuaKhachHang(nguoiDungId);

  if (!row) {
    throw new Error("Không tìm thấy người dùng");
  }

  return new VerificationProfileModel(row);
}

async function guiHoSoXacMinhService(nguoiDungId, duLieu = {}) {
  const soCccd = chuanHoaChuoi(duLieu.so_cccd);
  const anhMatTruoc = duLieu.anh_mat_truoc;
  const anhMatSau = duLieu.anh_mat_sau;
  const anhCamCccd = duLieu.anh_cam_cccd;

  if (!soCccd || !anhMatTruoc || !anhMatSau || !anhCamCccd) {
    throw new Error("Vui lòng nhập đầy đủ hồ sơ xác minh");
  }

  if (!kiemTraSoCccd(soCccd)) {
    throw new Error("Số CCCD phải gồm 12 chữ số");
  }

  const cccdTonTai = await timHoSoDangChoDuyetHoacDaDuyetTheoSoCccd(
    nguoiDungId,
    soCccd
  );

  if (cccdTonTai) {
    throw new Error("Số CCCD đã được sử dụng");
  }

  if (
    !kiemTraFileAnh(anhMatTruoc) ||
    !kiemTraFileAnh(anhMatSau) ||
    !kiemTraFileAnh(anhCamCccd)
  ) {
    throw new Error("File tải lên phải là ảnh");
  }

  const nguoiDung = await layTrangThaiXacMinhNguoiDung(nguoiDungId);

  if (!nguoiDung) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (Number(nguoiDung.trang_thai_xac_minh) === 202) {
    throw new Error("Hồ sơ của bạn đang chờ duyệt");
  }

  if (Number(nguoiDung.trang_thai_xac_minh) === 203) {
    throw new Error("Hồ sơ của bạn đã được duyệt");
  }

  const ketQuaAnhMatTruoc = await taiAnhLenCloudinaryService(
    anhMatTruoc,
    "verification"
  );

  const ketQuaAnhMatSau = await taiAnhLenCloudinaryService(
    anhMatSau,
    "verification"
  );

  const ketQuaAnhCamCccd = await taiAnhLenCloudinaryService(
    anhCamCccd,
    "verification"
  );

  await taoHoSoXacMinhVaCapNhatTrangThai({
    nguoiDungId,
    soCccd,
    anhMatTruocUrl: ketQuaAnhMatTruoc.url,
    anhMatSauUrl: ketQuaAnhMatSau.url,
    anhCamCccdUrl: ketQuaAnhCamCccd.url,
  });

  return await layHoSoXacMinhCuaToiService(nguoiDungId);
}

module.exports = {
  capNhatThongTinCaNhanService,
  layHoSoXacMinhCuaToiService,
  guiHoSoXacMinhService,
};