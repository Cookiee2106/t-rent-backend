const cloudinary = require("../config/cloudinary");
const BundleItemModel = require("./BundleItemModel");
const adminEquipmentModelRepository = require("../repositories/adminEquipmentModelRepository");
const equipmentMountRepository = require("../repositories/equipmentMountRepository");
const equipmentNeedRepository = require("../repositories/equipmentNeedRepository");

const TRANG_THAI_HIEN_THI = 601;
const TRANG_THAI_DA_AN = 602;

// Tỷ lệ tiền cọc mặc định được quản lý tại Backend.
const TY_LE_COC_MAC_DINH = 30;

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


function docDanhSachId(giaTri) {
  if (giaTri === undefined || giaTri === null) {
    return [];
  }

  let danhSach = giaTri;

  if (typeof giaTri === "string") {
    const chuoi = giaTri.trim();

    if (!chuoi) {
      return [];
    }

    if (chuoi.startsWith("[")) {
      try {
        danhSach = JSON.parse(chuoi);
      } catch {
        throw new Error("Danh sách nhu cầu không hợp lệ");
      }
    } else {
      danhSach = chuoi.split(",");
    }
  }

  if (!Array.isArray(danhSach)) {
    danhSach = [danhSach];
  }

  const ketQua = [
    ...new Set(
      danhSach
        .map((id) => String(id || "").trim())
        .filter(Boolean)
    ),
  ];

  if (ketQua.some((id) => !kiemTraUuid(id))) {
    throw new Error("Danh sách nhu cầu có id không hợp lệ");
  }

  return ketQua;
}

function coThuocTinh(doiTuong, tenThuocTinh) {
  return Object.prototype.hasOwnProperty.call(
    doiTuong || {},
    tenThuocTinh
  );
}

function laDanhMucCanNgam(danhMuc) {
  const tenDanhMuc = String(
    danhMuc?.ten_danh_muc || ""
  )
    .trim()
    .toLowerCase();

  return (
    tenDanhMuc === "máy ảnh" ||
    tenDanhMuc === "ống kính"
  );
}

function chuanHoaTenDanhMuc(giaTri) {
  return String(giaTri || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function laDanhMucOngKinh(danhMuc) {
  return (
    chuanHoaTenDanhMuc(danhMuc?.ten_danh_muc) ===
    "ong kinh"
  );
}

function laDanhMucCapSau(danhMuc) {
  return (
    chuanHoaTenDanhMuc(danhMuc?.ten_danh_muc) ===
    "cap sau"
  );
}

function docSoTien(giaTri, tenTruong) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so < 0) {
    throw new Error(`${tenTruong} phải là số nguyên lớn hơn hoặc bằng 0`);
  }

  return so;
}

function docTyLePhanTram(giaTri, tenTruong) {
  const so = Number(giaTri);

  if (!Number.isFinite(so) || so < 0 || so > 100) {
    throw new Error(`${tenTruong} phải từ 0 đến 100`);
  }

  return so;
}

function tinhTienCoc(giaTriThietBi, tyLeCoc) {
  return Math.round(
    Number(giaTriThietBi) * Number(tyLeCoc) / 100
  );
}

function docTrangThai(giaTri) {
  const trangThai = Number(giaTri);

  if (trangThai !== TRANG_THAI_HIEN_THI && trangThai !== TRANG_THAI_DA_AN) {
    throw new Error("Trạng thái phải là 601 (Hiển thị) hoặc 602 (Đã ẩn)");
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


async function kiemTraNgamHopLe(ngamId) {
  if (!ngamId || !kiemTraUuid(ngamId)) {
    throw new Error("Ngàm thiết bị không hợp lệ");
  }

  const ngam =
    await equipmentMountRepository.layNgamHopLe(
      ngamId
    );

  if (!ngam) {
    throw new Error(
      "Ngàm thiết bị không tồn tại, hãng đã bị ẩn hoặc ngàm đã bị ẩn"
    );
  }

  return ngam;
}

async function kiemTraDanhSachNhuCauHopLe(
  danhSachNhuCauId = []
) {
  if (danhSachNhuCauId.length === 0) {
    throw new Error("Vui lòng chọn ít nhất một nhu cầu sử dụng");
  }

  const rows =
    await equipmentNeedRepository.layNhieuNhuCauHopLe(
      danhSachNhuCauId
    );

  if (rows.length !== danhSachNhuCauId.length) {
    throw new Error(
      "Có nhu cầu sử dụng không tồn tại hoặc đã bị ẩn"
    );
  }

  return rows;
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

class EquipmentModelModel {
  constructor({
    id,
    danh_muc_id,
    ten_danh_muc,
    tinh_chat_id,
    hang_id,
    ten_hang,
    ngam_id,
    ten_ngam,
    trang_thai_ngam,
    nhu_cau_su_dung,
    ten_mau,
    mo_ta,
    anh_url,
    gia_thue_ngay,
    gia_tri_thiet_bi,
    ty_le_coc,
    tien_coc,
    trang_thai,
    ten_trang_thai,
    tong_thiet_bi_vat_ly,
    so_luong_san_sang,
    bo_di_kem,
    created_at,
    updated_at,
  } = {}) {
    this.id = id;
    this.danh_muc_id = danh_muc_id;
    this.ten_danh_muc = ten_danh_muc || null;
    this.tinh_chat_id = tinh_chat_id || null;

    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;

    this.ngam_id = ngam_id || null;
    this.ten_ngam = ten_ngam || null;
    this.trang_thai_ngam =
      trang_thai_ngam === undefined ||
      trang_thai_ngam === null
        ? null
        : Number(trang_thai_ngam);

    this.nhu_cau_su_dung = Array.isArray(nhu_cau_su_dung)
      ? nhu_cau_su_dung
      : [];

    this.ten_mau = ten_mau;
    this.mo_ta = mo_ta || null;
    this.anh_url = anh_url || null;

    this.gia_thue_ngay = Number(gia_thue_ngay || 0);
    this.gia_tri_thiet_bi =
      gia_tri_thiet_bi === undefined ||
      gia_tri_thiet_bi === null
        ? null
        : Number(gia_tri_thiet_bi);
    this.ty_le_coc =
      ty_le_coc === undefined ||
      ty_le_coc === null
        ? null
        : Number(ty_le_coc);
    this.tien_coc = Number(tien_coc || 0);

    this.trang_thai = trang_thai;
    this.ten_trang_thai = ten_trang_thai || null;

    this.tong_thiet_bi_vat_ly = Number(tong_thiet_bi_vat_ly || 0);
    this.so_luong_san_sang = Number(so_luong_san_sang || 0);

    this.bo_di_kem = bo_di_kem || [];
    this.created_at = created_at || null;
    this.updated_at = updated_at || null;
  }

  // Chỉ lấy ngàm và nhu cầu đang hiển thị cho form thêm/cập nhật mẫu.
  // Dữ liệu được lấy từ repository riêng của từng nghiệp vụ.
  static async layLuaChonCauHinhMauAdminService() {
    const [ngam, nhuCau] = await Promise.all([
      equipmentMountRepository.layDanhSachNgamDangHienThi(),
      equipmentNeedRepository.layDanhSachNhuCauDangHienThi(),
    ]);

    return {
      ngam,
      nhu_cau: nhuCau,
      ty_le_coc_mac_dinh: TY_LE_COC_MAC_DINH,
    };
  }


  static async layDanhSachMauThietBiAdminService() {
    const rows = await adminEquipmentModelRepository.layDanhSachMauThietBiAdmin();

    return rows.map((item) => new EquipmentModelModel(item));
  }

  static async layChiTietMauThietBiAdminService(id) {
    const mau = await layMauBatBuocTonTai(id);
    const boDiKem = await EquipmentModelModel.layDanhSachBoDiKemAdminService(id);

    return new EquipmentModelModel({
      ...mau,
      bo_di_kem: boDiKem,
    });
  }

  static async taoMauThietBiAdminService(body = {}, fileAnh = null) {
    const danhMucId = chuanHoaChuoi(body.danh_muc_id);
    const hangId = chuanHoaChuoi(body.hang_id);
    const tenMau = chuanHoaChuoi(body.ten_mau);
    const moTa = chuanHoaChuoi(body.mo_ta) || null;
    const giaThueNgay = docSoTien(
      body.gia_thue_ngay || 0,
      "Giá thuê/ngày"
    );
    const giaTriThietBi = docSoTien(
      body.gia_tri_thiet_bi,
      "Giá trị thiết bị"
    );

    const tyLeCoc = docTyLePhanTram(
      body.ty_le_coc === undefined ||
      body.ty_le_coc === null ||
      String(body.ty_le_coc).trim() === ""
        ? TY_LE_COC_MAC_DINH
        : body.ty_le_coc,
      "Tỷ lệ tiền cọc"
    );

    // Tiền cọc do Backend tự tính, không nhận số tiền cọc do Frontend quyết định.
    const tienCoc = tinhTienCoc(
      giaTriThietBi,
      tyLeCoc
    );

    if (!danhMucId) {
      throw new Error("Vui lòng chọn danh mục");
    }

    if (!hangId) {
      throw new Error("Vui lòng chọn hãng");
    }

    if (!tenMau) {
      throw new Error("Vui lòng nhập tên mẫu");
    }

    const danhMuc = await kiemTraDanhMucHopLe(
      danhMucId
    );

    await kiemTraHangHopLe(hangId);
    await kiemTraTenMauTrung(tenMau);

    let ngamId = null;
    let nhuCauIds = [];

    if (laDanhMucCanNgam(danhMuc)) {
      ngamId = chuanHoaChuoi(body.ngam_id);
      nhuCauIds = docDanhSachId(body.nhu_cau_ids);

      if (!ngamId) {
        throw new Error("Vui lòng chọn ngàm");
      }

      const ngam = await kiemTraNgamHopLe(ngamId);

      if (String(ngam.hang_so_huu_id) !== String(hangId)) {
        throw new Error("Ngàm không thuộc hãng đã chọn");
      }

      await kiemTraDanhSachNhuCauHopLe(
        nhuCauIds
      );
    }

    let anhUrl = null;

    if (fileAnh) {
      if (!kiemTraFileAnh(fileAnh)) {
        throw new Error("File tải lên phải là ảnh");
      }

      const ketQuaUpload =
        await uploadAnhLenCloudinary(fileAnh);

      anhUrl = ketQuaUpload.secure_url;
    }

    const ketQua =
      await adminEquipmentModelRepository.taoMauThietBi({
        danhMucId,
        hangId,
        ngamId,
        nhuCauIds,
        tenMau,
        moTa,
        anhUrl,
        giaThueNgay,
        giaTriThietBi,
        tyLeCoc,
        tienCoc,
        trangThai: TRANG_THAI_HIEN_THI,
      });

    const mauMoi =
      await adminEquipmentModelRepository.layMauThietBiTheoId(
        ketQua.id
      );

    return new EquipmentModelModel(mauMoi);
  }

  static async capNhatMauThietBiAdminService(
    id,
    body = {},
    fileAnh = null
  ) {
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
        ? docSoTien(
            body.gia_thue_ngay,
            "Giá thuê/ngày"
          )
        : Number(mauHienTai.gia_thue_ngay);

    const giaTriThietBi =
      body.gia_tri_thiet_bi !== undefined
        ? docSoTien(
            body.gia_tri_thiet_bi,
            "Giá trị thiết bị"
          )
        : mauHienTai.gia_tri_thiet_bi !== null &&
          mauHienTai.gia_tri_thiet_bi !== undefined
          ? Number(mauHienTai.gia_tri_thiet_bi)
          : null;

    if (giaTriThietBi === null) {
      throw new Error("Vui lòng nhập giá trị thiết bị");
    }

    const tyLeCoc =
      body.ty_le_coc !== undefined &&
      String(body.ty_le_coc).trim() !== ""
        ? docTyLePhanTram(
            body.ty_le_coc,
            "Tỷ lệ tiền cọc"
          )
        : mauHienTai.ty_le_coc !== null &&
          mauHienTai.ty_le_coc !== undefined
          ? docTyLePhanTram(
              mauHienTai.ty_le_coc,
              "Tỷ lệ tiền cọc"
            )
          : docTyLePhanTram(
              TY_LE_COC_MAC_DINH,
              "Tỷ lệ tiền cọc"
            );

    // Luôn tính lại tiền cọc từ giá trị thiết bị và tỷ lệ hiện tại của mẫu.
    const tienCoc = tinhTienCoc(
      giaTriThietBi,
      tyLeCoc
    );

    if (!danhMucId) {
      throw new Error("Vui lòng chọn danh mục");
    }

    if (!hangId) {
      throw new Error("Vui lòng chọn hãng");
    }

    if (!tenMau) {
      throw new Error("Vui lòng nhập tên mẫu");
    }

    const danhMucMoi = await kiemTraDanhMucHopLe(
      danhMucId
    );

    await kiemTraHangHopLe(hangId);
    await kiemTraTenMauTrung(tenMau, id);

    const danhMucCuCanNgam = laDanhMucCanNgam({
      ten_danh_muc: mauHienTai.ten_danh_muc,
    });
    const danhMucMoiCanNgam =
      laDanhMucCanNgam(danhMucMoi);

    let ngamId = null;
    let nhuCauIds = [];
    let capNhatNhuCau = false;

    if (danhMucMoiCanNgam) {
      const coGuiNgam = coThuocTinh(
        body,
        "ngam_id"
      );

      ngamId = coGuiNgam
        ? chuanHoaChuoi(body.ngam_id)
        : mauHienTai.ngam_id;

      if (!ngamId) {
        throw new Error("Vui lòng chọn ngàm");
      }

      // Chỉ kiểm tra trạng thái ngàm khi người dùng đổi ngàm
      // hoặc đổi từ danh mục không dùng ngàm sang Máy ảnh/Ống kính.
      // Nhờ vậy bản ghi cũ vẫn cập nhật được khi ngàm cũ đã bị ẩn.
      if (
        coGuiNgam ||
        !danhMucCuCanNgam ||
        String(hangId) !== String(mauHienTai.hang_id)
      ) {
        const ngam = await kiemTraNgamHopLe(ngamId);

        if (String(ngam.hang_so_huu_id) !== String(hangId)) {
          throw new Error("Ngàm không thuộc hãng đã chọn");
        }
      }

      const coGuiNhuCau = coThuocTinh(
        body,
        "nhu_cau_ids"
      );

      if (coGuiNhuCau || !danhMucCuCanNgam) {
        nhuCauIds = docDanhSachId(
          body.nhu_cau_ids
        );

        await kiemTraDanhSachNhuCauHopLe(
          nhuCauIds
        );

        capNhatNhuCau = true;
      } else {
        nhuCauIds = (
          mauHienTai.nhu_cau_su_dung || []
        )
          .map((item) => item.id)
          .filter(Boolean);

        capNhatNhuCau = false;
      }
    } else {
      // Pin, sạc, thẻ nhớ... không dùng ngàm và nhu cầu.
      ngamId = null;
      nhuCauIds = [];
      capNhatNhuCau = true;
    }

    let anhUrl = mauHienTai.anh_url;

    if (fileAnh) {
      if (!kiemTraFileAnh(fileAnh)) {
        throw new Error("File tải lên phải là ảnh");
      }

      const ketQuaUpload =
        await uploadAnhLenCloudinary(fileAnh);

      anhUrl = ketQuaUpload.secure_url;
    }

    const ketQua =
      await adminEquipmentModelRepository.capNhatMauThietBi(
        id,
        {
          danhMucId,
          hangId,
          ngamId,
          nhuCauIds,
          capNhatNhuCau,
          tenMau,
          moTa,
          anhUrl,
          giaThueNgay,
          giaTriThietBi,
          tyLeCoc,
          tienCoc,
        }
      );

    if (!ketQua) {
      throw new Error("Không tìm thấy mẫu thiết bị");
    }

    const mauSauCapNhat =
      await adminEquipmentModelRepository.layMauThietBiTheoId(
        id
      );

    return new EquipmentModelModel(
      mauSauCapNhat
    );
  }

  static async capNhatTrangThaiMauThietBiAdminService(id, body = {}) {
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

  static async layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId) {
    const mau = await adminEquipmentModelRepository.layThongTinMauThietBiChinh(
      mauThietBiChinhId
    );

    if (!mau) {
      throw new Error("Không tìm thấy mẫu thiết bị");
    }

    return mau;
  }

  static async layDanhSachBoDiKemAdminService(mauThietBiChinhId) {
    await EquipmentModelModel.layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

    const rows = await adminEquipmentModelRepository.layDanhSachBoDiKem(
      mauThietBiChinhId
    );

    return rows.map((item) => new BundleItemModel(item));
  }

  static async layGoiYBoDiKemAdminService(mauThietBiChinhId, query = {}) {
    const mauChinh = await EquipmentModelModel.layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

    const tuKhoa = chuanHoaChuoi(query.q);
    const khoaTim = tuKhoa ? `%${tuKhoa}%` : "";

    const thietBiPhu = await adminEquipmentModelRepository.layGoiYThietBiPhu(
      mauThietBiChinhId,
      mauChinh,
      khoaTim
    );

    const phuKien = await adminEquipmentModelRepository.layGoiYPhuKien(
      mauThietBiChinhId,
      mauChinh,
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

  static async taoBoDiKemAdminService(mauThietBiChinhId, body = {}) {
    const mauChinh = await EquipmentModelModel.layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

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
        throw new Error("Phụ kiện không tồn tại hoặc đã bị ẩn");
      }

      if (laDanhMucCapSau(phuKien)) {
        if (!laDanhMucOngKinh(mauChinh)) {
          throw new Error(
            "Cáp sau chỉ được cấu hình cho mẫu Ống kính"
          );
        }

        if (
          !mauChinh.ngam_id ||
          !phuKien.ngam_id ||
          String(mauChinh.ngam_id) !==
            String(phuKien.ngam_id)
        ) {
          throw new Error(
            "Cáp sau phải có cùng ngàm với mẫu Ống kính"
          );
        }
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

    return await EquipmentModelModel.layDanhSachBoDiKemAdminService(mauThietBiChinhId);
  }

  static async xoaBoDiKemAdminService(mauThietBiChinhId, bundleId) {
    await EquipmentModelModel.layThongTinMauThietBiChinhBatBuoc(mauThietBiChinhId);

    const tonTai = await adminEquipmentModelRepository.layBoDiKemTheoId(
      mauThietBiChinhId,
      bundleId
    );

    if (!tonTai) {
      throw new Error("Không tìm thấy món trong bộ đi kèm");
    }

    const dangDuocDonHoatDongSuDung =
      await adminEquipmentModelRepository.kiemTraBoDiKemDangDuocDonHoatDong(
        bundleId
      );

    if (dangDuocDonHoatDongSuDung) {
      throw new Error(
        "Không thể gỡ món khỏi bộ đi kèm vì mẫu thiết bị đang có đơn giữ chỗ, đang thuê hoặc quá hạn"
      );
    }

    await adminEquipmentModelRepository.xoaBoDiKem(bundleId);

    return {
      message: "Xóa món khỏi bộ đi kèm thành công",
    };
  }
}

module.exports = EquipmentModelModel;
