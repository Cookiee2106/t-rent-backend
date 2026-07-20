const cloudinary = require("../../config/cloudinary");
const AdminOrderModel = require("../../models/AdminOrderModel");
const orderRepository = require("../../repositories/orderRepository");

function taoSoNguyen(giaTri, macDinh) {
  const so = Number(giaTri);

  if (!Number.isInteger(so) || so <= 0) {
    return macDinh;
  }

  return so;
}

function cungId(idA, idB) {
  return String(idA) === String(idB);
}

function taoMapTheoId(danhSach) {
  return new Map(danhSach.map((item) => [String(item.id), item]));
}

function uploadCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `t-rent/${folder}`,
        resource_type: "auto",
      },
      (loi, ketQua) => {
        if (loi) reject(loi);
        else resolve(ketQua);
      }
    );

    stream.end(file.buffer);
  });
}

async function uploadNhieuFile(danhSachFile, folder) {
  const ketQuaUpload = await Promise.all(
    danhSachFile.map((file) => uploadCloudinary(file, folder))
  );

  return ketQuaUpload.map((item, index) => ({
    ten_file_goc: danhSachFile[index].originalname,
    file_url: item.secure_url,
    loai_file: danhSachFile[index].mimetype,
    kich_thuoc_file: danhSachFile[index].size,
  }));
}

function docDanhSachVatPham(vatPham) {
  if (typeof vatPham === "string") {
    try {
      return JSON.parse(vatPham);
    } catch {
      throw new Error("Dữ liệu vật phẩm bàn giao không hợp lệ");
    }
  }

  return vatPham;
}

async function layDanhSachDonThueService({
  trang_thai,
  tu_khoa,
  page = 1,
  limit = 10,
}) {
  const trangHienTai = taoSoNguyen(page, 1);
  const soDong = taoSoNguyen(limit, 10);
  const offset = (trangHienTai - 1) * soDong;
  const trangThai = trang_thai ? Number(trang_thai) : null;
  const tuKhoa = String(tu_khoa || "").trim();

  const [danhSach, total] = await Promise.all([
    orderRepository.layDanhSachDonThue({
      trangThai,
      tuKhoa,
      limit: soDong,
      offset,
    }),
    orderRepository.demDonThue(trangThai, tuKhoa),
  ]);

  return {
    data: danhSach.map((don) => new AdminOrderModel(don)),
    total,
    page: trangHienTai,
    limit: soDong,
  };
}

async function layChiTietDonThueService(donThueId) {
  const donThue = await orderRepository.layDonThueTheoId(donThueId);

  if (!donThue) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  const [chiTiet, vatPhamBanGiao, thanhToan, tepDonThue] = await Promise.all([
    orderRepository.layChiTietDonThue(donThueId),
    orderRepository.layVatPhamBanGiao(donThueId),
    orderRepository.layThanhToanCuaDon(donThueId),
    orderRepository.layTepDonThue(donThueId),
  ]);

  return new AdminOrderModel({
    ...donThue,
    chi_tiet: chiTiet,
    vat_pham_ban_giao: vatPhamBanGiao,
    thanh_toan: thanhToan,
    tep_don_thue: tepDonThue,
  });
}

async function layThietBiSanSangService({ mau_thiet_bi_id, ngay_nhan, ngay_tra }) {
  if (!mau_thiet_bi_id) {
    throw new Error("Thiếu mẫu thiết bị");
  }

  return await orderRepository.layThietBiSanSang({
    mauThietBiId: mau_thiet_bi_id,
    ngayNhan: ngay_nhan || null,
    ngayTra: ngay_tra || null,
  });
}

async function kiemTraSoLuongPhuKien(phuKienGiaoMap) {
  for (const [phuKienId, soLuongGiao] of phuKienGiaoMap.entries()) {
    const phuKien = await orderRepository.layPhuKienTheoId(phuKienId);

    if (!phuKien) {
      throw new Error("Không tìm thấy phụ kiện trong bộ đi kèm");
    }

    const soLuongDangGiao = await orderRepository.demSoLuongPhuKienDangGiao(
      phuKienId
    );

    const soLuongConLai = Number(phuKien.tong_so_luong || 0) - soLuongDangGiao;

    if (soLuongGiao > soLuongConLai) {
      throw new Error(
        `Phụ kiện "${phuKien.ten_phu_kien}" chỉ còn ${soLuongConLai}, không đủ để bàn giao`
      );
    }
  }
}

async function lapPhieuBanGiaoService(
  nhanVienId,
  donThueId,
  { ghi_chu_ban_giao, vat_pham },
  files
) {
  const hopDongFiles = files?.hop_dong_giay || [];
  const anhBanGiaoFiles = files?.anh_ban_giao || [];

  if (hopDongFiles.length === 0) {
    throw new Error("Vui lòng tải lên hợp đồng giấy");
  }

  if (anhBanGiaoFiles.length === 0) {
    throw new Error("Vui lòng tải lên ảnh bàn giao");
  }

  const don = await orderRepository.layDonDeBanGiao(donThueId);

  if (!don) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  if (Number(don.trang_thai) !== orderRepository.TRANG_THAI_DA_GIU_CHO) {
    throw new Error("Chỉ bàn giao được đơn ở trạng thái Đã giữ chỗ");
  }

  const daCoc = await orderRepository.kiemTraDonDaCoc(donThueId);

  if (!daCoc) {
    throw new Error("Đơn thuê chưa có dòng tiền đặt cọc");
  }

  const danhSachVatPham = docDanhSachVatPham(vat_pham);

  if (!Array.isArray(danhSachVatPham) || danhSachVatPham.length === 0) {
    throw new Error("Vui lòng chọn vật phẩm bàn giao");
  }

  const chiTietDon = await orderRepository.layChiTietDonDeBanGiao(donThueId);

  if (chiTietDon.length === 0) {
    throw new Error("Đơn thuê chưa có chi tiết thiết bị");
  }

  const chiTietMap = taoMapTheoId(chiTietDon);
  const mauIds = chiTietDon.map((item) => item.mau_thiet_bi_id);
  const boDiKem = await orderRepository.layBoDiKemTheoMauIds(mauIds);

  const boDiKemTheoMau = new Map();

  for (const bdk of boDiKem) {
    const key = String(bdk.mau_thiet_bi_chinh_id);

    if (!boDiKemTheoMau.has(key)) {
      boDiKemTheoMau.set(key, []);
    }

    boDiKemTheoMau.get(key).push(bdk);
  }

  const soLuongThietBiChinh = new Map();
  const soLuongBoDiKem = new Map();
  const thietBiDaChon = new Set();
  const phuKienGiaoMap = new Map();

  const vatPhamCanLuu = [];
  const thietBiCanCapNhat = [];

  for (const vatPham of danhSachVatPham) {
    const chiTietId = vatPham.chi_tiet_don_thue_id;
    const chiTiet = chiTietMap.get(String(chiTietId));

    if (!chiTiet) {
      throw new Error("Vật phẩm bàn giao không thuộc đơn thuê này");
    }

    if (!vatPham.bo_di_kem_id) {
      const thietBiId = vatPham.thiet_bi_id;

      if (!thietBiId) {
        throw new Error("Vui lòng chọn đủ thiết bị chính");
      }

      if (thietBiDaChon.has(String(thietBiId))) {
        throw new Error("Một thiết bị vật lý bị chọn trùng");
      }

      const thietBi = await orderRepository.layThietBiVatLyTheoId(thietBiId);

      if (!thietBi) {
        throw new Error("Không tìm thấy thiết bị vật lý");
      }

      if (Number(thietBi.trang_thai) !== orderRepository.TRANG_THAI_THIET_BI_SAN_SANG) {
        throw new Error(`Thiết bị serial ${thietBi.so_serial} không sẵn sàng`);
      }

      if (!cungId(thietBi.mau_thiet_bi_id, chiTiet.mau_thiet_bi_id)) {
        throw new Error(`Thiết bị serial ${thietBi.so_serial} không đúng mẫu`);
      }

      thietBiDaChon.add(String(thietBiId));
      thietBiCanCapNhat.push(thietBiId);

      soLuongThietBiChinh.set(
        String(chiTiet.id),
        (soLuongThietBiChinh.get(String(chiTiet.id)) || 0) + 1
      );

      vatPhamCanLuu.push({
        chi_tiet_don_thue_id: chiTiet.id,
        bo_di_kem_id: null,
        thiet_bi_id: thietBiId,
        phu_kien_id: null,
        ten_vat_pham_snapshot: thietBi.ten_mau,
        ma_tai_san_snapshot: thietBi.ma_tai_san || null,
        so_serial_snapshot: thietBi.so_serial || null,
        so_luong_giao: 1,
      });

      continue;
    }

    const danhSachBoDiKem = boDiKemTheoMau.get(String(chiTiet.mau_thiet_bi_id)) || [];
    const cauHinhBoDiKem = danhSachBoDiKem.find((bdk) =>
      cungId(bdk.id, vatPham.bo_di_kem_id)
    );

    if (!cauHinhBoDiKem) {
      throw new Error("Bộ đi kèm không đúng với mẫu thiết bị trong đơn");
    }

    const keyBoDiKem = `${chiTiet.id}_${cauHinhBoDiKem.id}`;

    if (cauHinhBoDiKem.mau_thiet_bi_phu_id) {
      const thietBiId = vatPham.thiet_bi_id;

      if (!thietBiId) {
        throw new Error("Vui lòng chọn đủ thiết bị đi kèm");
      }

      if (thietBiDaChon.has(String(thietBiId))) {
        throw new Error("Một thiết bị vật lý bị chọn trùng");
      }

      const thietBi = await orderRepository.layThietBiVatLyTheoId(thietBiId);

      if (!thietBi) {
        throw new Error("Không tìm thấy thiết bị đi kèm");
      }

      if (Number(thietBi.trang_thai) !== orderRepository.TRANG_THAI_THIET_BI_SAN_SANG) {
        throw new Error(`Thiết bị đi kèm serial ${thietBi.so_serial} không sẵn sàng`);
      }

      if (!cungId(thietBi.mau_thiet_bi_id, cauHinhBoDiKem.mau_thiet_bi_phu_id)) {
        throw new Error(`Thiết bị đi kèm serial ${thietBi.so_serial} không đúng mẫu`);
      }

      thietBiDaChon.add(String(thietBiId));
      thietBiCanCapNhat.push(thietBiId);

      soLuongBoDiKem.set(
        keyBoDiKem,
        (soLuongBoDiKem.get(keyBoDiKem) || 0) + 1
      );

      vatPhamCanLuu.push({
        chi_tiet_don_thue_id: chiTiet.id,
        bo_di_kem_id: cauHinhBoDiKem.id,
        thiet_bi_id: thietBiId,
        phu_kien_id: null,
        ten_vat_pham_snapshot: thietBi.ten_mau,
        ma_tai_san_snapshot: thietBi.ma_tai_san || null,
        so_serial_snapshot: thietBi.so_serial || null,
        so_luong_giao: 1,
      });

      continue;
    }

    if (cauHinhBoDiKem.phu_kien_id) {
      const soLuongGiao = Number(vatPham.so_luong_giao || 0);

      if (soLuongGiao <= 0) {
        throw new Error("Số lượng phụ kiện bàn giao phải lớn hơn 0");
      }

      if (!cungId(vatPham.phu_kien_id, cauHinhBoDiKem.phu_kien_id)) {
        throw new Error("Phụ kiện bàn giao không đúng cấu hình bộ đi kèm");
      }

      const phuKien = await orderRepository.layPhuKienTheoId(
        cauHinhBoDiKem.phu_kien_id
      );

      if (!phuKien) {
        throw new Error("Không tìm thấy phụ kiện trong bộ đi kèm");
      }

      soLuongBoDiKem.set(
        keyBoDiKem,
        (soLuongBoDiKem.get(keyBoDiKem) || 0) + soLuongGiao
      );

      phuKienGiaoMap.set(
        String(phuKien.id),
        (phuKienGiaoMap.get(String(phuKien.id)) || 0) + soLuongGiao
      );

      vatPhamCanLuu.push({
        chi_tiet_don_thue_id: chiTiet.id,
        bo_di_kem_id: cauHinhBoDiKem.id,
        thiet_bi_id: null,
        phu_kien_id: phuKien.id,
        ten_vat_pham_snapshot: phuKien.ten_phu_kien,
        ma_tai_san_snapshot: null,
        so_serial_snapshot: null,
        so_luong_giao: soLuongGiao,
      });
    }
  }

  for (const chiTiet of chiTietDon) {
    const soLuongChinhDaGiao = soLuongThietBiChinh.get(String(chiTiet.id)) || 0;

    if (soLuongChinhDaGiao !== Number(chiTiet.so_luong)) {
      throw new Error("Chưa chọn đủ số lượng thiết bị chính");
    }

    const danhSachBoDiKem = boDiKemTheoMau.get(String(chiTiet.mau_thiet_bi_id)) || [];

    for (const bdk of danhSachBoDiKem) {
      const soLuongCan = Number(bdk.so_luong || 1) * Number(chiTiet.so_luong || 0);
      const keyBoDiKem = `${chiTiet.id}_${bdk.id}`;
      const soLuongDaGiao = soLuongBoDiKem.get(keyBoDiKem) || 0;

      if (soLuongDaGiao !== soLuongCan) {
        throw new Error("Chưa chọn đủ số lượng bộ đi kèm");
      }
    }
  }

  await kiemTraSoLuongPhuKien(phuKienGiaoMap);

  const tepHopDong = await uploadNhieuFile(hopDongFiles, "hop-dong");
  const tepAnhBanGiao = await uploadNhieuFile(anhBanGiaoFiles, "anh-ban-giao");

  await orderRepository.luuPhieuBanGiao({
    donThueId,
    nhanVienId,
    ghiChuBanGiao: ghi_chu_ban_giao || null,
    vatPham: vatPhamCanLuu,
    tepHopDong,
    tepAnhBanGiao,
    thietBiCanCapNhat,
    tongTienThue: don.tong_tien_thue,
  });

  return {
    message: "Lập phiếu bàn giao thành công",
  };
}

module.exports = {
  layDanhSachDonThueService,
  layChiTietDonThueService,
  layThietBiSanSangService,
  lapPhieuBanGiaoService,
};
