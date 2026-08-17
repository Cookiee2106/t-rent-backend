const UserModel = require("./UserModel");

const {
  timNguoiDungKhacTheoSoDienThoai,
  capNhatThongTinCaNhan,
} = require("../repositories/userRepository");

const {
  layHoSoXacMinhCuaKhachHang,
  layTrangThaiXacMinhNguoiDung,
  timHoSoDangChoDuyetHoacDaDuyetTheoSoCccd,
  taoHoSoXacMinhVaCapNhatTrangThai,
} = require("../repositories/verificationProfileRepository");

const {
  taiAnhBaoVeLenCloudinaryService,
} = require("../modules/uploads/uploadService");

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

class VerificationProfileModel {
  constructor({
    id,
    ho_ten,
    email,
    so_dien_thoai,
    dia_chi,

    trang_thai,
    ten_trang_thai_tai_khoan,

    trang_thai_xac_minh,
    ten_trang_thai_xac_minh,

    ho_so_xac_minh_id,
    so_cccd,
    co_anh_mat_truoc,
    co_anh_mat_sau,
    co_anh_cam_cccd,

    trang_thai_ho_so,
    ten_trang_thai_ho_so,

    ly_do_tu_choi,
    duyet_luc,
    ngay_gui,
  } = {}) {
    this.id = id;
    this.ho_ten = ho_ten;
    this.email = email;
    this.so_dien_thoai = so_dien_thoai;
    this.dia_chi = dia_chi ?? null;

    this.trang_thai = trang_thai;
    this.ten_trang_thai_tai_khoan = ten_trang_thai_tai_khoan ?? null;

    this.trang_thai_xac_minh = trang_thai_xac_minh;
    this.ten_trang_thai_xac_minh = ten_trang_thai_xac_minh ?? null;

    this.ho_so_xac_minh_id = ho_so_xac_minh_id ?? null;
    this.so_cccd = so_cccd ?? null;
    this.co_anh_mat_truoc = Boolean(co_anh_mat_truoc);
    this.co_anh_mat_sau = Boolean(co_anh_mat_sau);
    this.co_anh_cam_cccd = Boolean(co_anh_cam_cccd);

    this.trang_thai_ho_so = trang_thai_ho_so ?? null;
    this.ten_trang_thai_ho_so = ten_trang_thai_ho_so ?? null;

    this.ly_do_tu_choi = ly_do_tu_choi ?? null;
    this.duyet_luc = duyet_luc ?? null;
    this.ngay_gui = ngay_gui ?? null;
  }

  // Cập nhật thông tin cá nhân.
  static async capNhatThongTinCaNhanService(nguoiDungId, duLieu = {}) {
    const thongTinHienTai = await layTrangThaiXacMinhNguoiDung(nguoiDungId);

    if (!thongTinHienTai) {
      throw new Error("Không tìm thấy người dùng");
    }

    let hoTen = chuanHoaChuoi(duLieu.ho_ten);
    const soDienThoai = chuanHoaChuoi(duLieu.so_dien_thoai);
    const diaChi = chuanHoaChuoi(duLieu.dia_chi);

    const daDuocDuyet = Number(thongTinHienTai.trang_thai_xac_minh) === 203;

    // Sau khi đã được duyệt xác minh, họ tên phải giữ nguyên.
    if (daDuocDuyet) {
      const hoTenHienTai = chuanHoaChuoi(thongTinHienTai.ho_ten);

      if (hoTen && hoTen !== hoTenHienTai) {
        throw new Error(
          "Sau khi tài khoản đã được duyệt xác minh, bạn chỉ được cập nhật số điện thoại và địa chỉ"
        );
      }

      hoTen = hoTenHienTai;
    }

    if (!daDuocDuyet && !hoTen) {
      throw new Error("Vui lòng nhập họ tên");
    }

    if (!soDienThoai) {
      throw new Error("Vui lòng nhập số điện thoại");
    }

    if (!diaChi) {
      throw new Error("Vui lòng nhập địa chỉ hiện tại");
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

  // Lấy hồ sơ xác minh của khách hàng đang đăng nhập.
  static async layHoSoXacMinhCuaToiService(nguoiDungId) {
    const row = await layHoSoXacMinhCuaKhachHang(nguoiDungId);

    if (!row) {
      throw new Error("Không tìm thấy người dùng");
    }

    return new VerificationProfileModel(row);
  }

  // Gửi hồ sơ xác minh.
  static async guiHoSoXacMinhService(nguoiDungId, duLieu = {}) {
    const soCccd = chuanHoaChuoi(duLieu.so_cccd);
    const anhMatTruoc = duLieu.anh_mat_truoc;
    const anhMatSau = duLieu.anh_mat_sau;
    const anhCamCccd = duLieu.anh_cam_cccd;

    // Lấy thông tin tài khoản trước để kiểm tra điều kiện gửi xác minh.
    const nguoiDung = await layTrangThaiXacMinhNguoiDung(nguoiDungId);

    if (!nguoiDung) {
      throw new Error("Không tìm thấy người dùng");
    }

    if (
      !chuanHoaChuoi(nguoiDung.so_dien_thoai) ||
      !chuanHoaChuoi(nguoiDung.dia_chi)
    ) {
      throw new Error(
        "Vui lòng cập nhật số điện thoại và địa chỉ hiện tại trước khi gửi hồ sơ xác minh"
      );
    }

    if (Number(nguoiDung.trang_thai_xac_minh) === 202) {
      throw new Error("Hồ sơ của bạn đang chờ duyệt");
    }

    if (Number(nguoiDung.trang_thai_xac_minh) === 203) {
      throw new Error("Hồ sơ của bạn đã được duyệt");
    }

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

    const ketQuaAnhMatTruoc = await taiAnhBaoVeLenCloudinaryService(
      anhMatTruoc,
      "t-rent/users/verification"
    );

    const ketQuaAnhMatSau = await taiAnhBaoVeLenCloudinaryService(
      anhMatSau,
      "t-rent/users/verification"
    );

    const ketQuaAnhCamCccd = await taiAnhBaoVeLenCloudinaryService(
      anhCamCccd,
      "t-rent/users/verification"
    );

    await taoHoSoXacMinhVaCapNhatTrangThai({
      nguoiDungId,
      soCccd,
      // Giữ URL cũ trong DB để tương thích, nhưng không trả trực tiếp cho Frontend.
      anhMatTruocUrl: ketQuaAnhMatTruoc.secure_url,
      anhMatSauUrl: ketQuaAnhMatSau.secure_url,
      anhCamCccdUrl: ketQuaAnhCamCccd.secure_url,
      anhMatTruocPublicId: ketQuaAnhMatTruoc.public_id,
      anhMatSauPublicId: ketQuaAnhMatSau.public_id,
      anhCamCccdPublicId: ketQuaAnhCamCccd.public_id,
    });

    return await VerificationProfileModel.layHoSoXacMinhCuaToiService(
      nguoiDungId
    );
  }
}

module.exports = VerificationProfileModel;
