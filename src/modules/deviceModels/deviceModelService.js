const DeviceModelModel = require("../../models/DeviceModelModel");
const deviceModelRepository = require("../../repositories/deviceModelRepository");

function kiemTraNgayHopLe(ngay) {
  return ngay && !Number.isNaN(new Date(ngay).getTime());
}

function kiemTraNgayThue(ngayNhan, ngayTra) {
  if (!ngayNhan || !ngayTra) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  if (!kiemTraNgayHopLe(ngayNhan) || !kiemTraNgayHopLe(ngayTra)) {
    throw new Error("Ngày nhận hoặc ngày trả không hợp lệ");
  }

  const homNay = new Date();
  const nam = homNay.getFullYear();
  const thang = String(homNay.getMonth() + 1).padStart(2, "0");
  const ngay = String(homNay.getDate()).padStart(2, "0");
  const ngayHomNay = `${nam}-${thang}-${ngay}`;

  if (ngayNhan < ngayHomNay || ngayTra < ngayHomNay) {
    throw new Error("Ngày nhận và ngày trả không được là ngày trong quá khứ");
  }

  if (new Date(ngayTra) <= new Date(ngayNhan)) {
    throw new Error("Ngày trả phải sau ngày nhận");
  }
}

function docSoLuong(giaTri) {
  const soLuong = Number(giaTri || 1);

  if (!Number.isInteger(soLuong) || soLuong < 1) {
    throw new Error("Số lượng thuê phải là số nguyên lớn hơn 0");
  }

  return soLuong;
}

async function tinhSoLuongKhaDungCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const tongThietBi = await deviceModelRepository.tinhTongThietBiSanSangCuaMau(
    mauThietBiId
  );

  const soLuongDaDat = await deviceModelRepository.tinhSoLuongDaDatCuaMau(
    mauThietBiId,
    ngayNhan,
    ngayTra
  );

  const soLuongConLai = tongThietBi - soLuongDaDat;

  return soLuongConLai > 0 ? soLuongConLai : 0;
}

async function tinhSoLuongKhaDungCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const tongPhuKien = await deviceModelRepository.layTongSoLuongPhuKien(
    phuKienId
  );

  const soLuongDaDat = await deviceModelRepository.tinhSoLuongDaDatCuaPhuKien(
    phuKienId,
    ngayNhan,
    ngayTra
  );

  const soLuongConLai = tongPhuKien - soLuongDaDat;

  return soLuongConLai > 0 ? soLuongConLai : 0;
}

async function layBoDiKemCuaMau(mauThietBiId) {
  const rows = await deviceModelRepository.layBoDiKemCuaMau(mauThietBiId);

  return rows.map((item) => ({
    ...item,
    ten_hien_thi: item.mau_thiet_bi_phu_id
      ? `${item.ten_hang_phu || ""} ${item.ten_mau_phu || ""}`.trim()
      : item.ten_phu_kien,
  }));
}

async function ganBoDiKemChoDanhSachMau(danhSachMau) {
  const ketQua = [];

  for (const mau of danhSachMau) {
    let boDiKem = [];

    try {
      boDiKem = await layBoDiKemCuaMau(mau.id);
    } catch {
      boDiKem = [];
    }

    ketQua.push(
      new DeviceModelModel({
        ...mau,
        bo_di_kem: boDiKem,
      })
    );
  }

  return ketQua;
}

async function kiemTraMauCoTheThue(mauThietBiId, ngayNhan, ngayTra, soLuong) {
  kiemTraNgayThue(ngayNhan, ngayTra);

  const soLuongMuonThue = docSoLuong(soLuong);

  const soLuongMauChinh = await tinhSoLuongKhaDungCuaMau(
    mauThietBiId,
    ngayNhan,
    ngayTra
  );

  const boDiKem = await layBoDiKemCuaMau(mauThietBiId);

  let soLuongSanSangTheoBo = soLuongMauChinh;
  const chiTietKhaDung = [];

  if (soLuongMauChinh < soLuongMuonThue) {
    return {
      co_the_thue: false,
      so_luong_san_sang: soLuongMauChinh,
      ly_do_khong_the_thue: "Mẫu thiết bị chính không đủ số lượng sẵn sàng",
      chi_tiet_kha_dung: chiTietKhaDung,
    };
  }

  for (const item of boDiKem) {
    const soLuongCan = Number(item.so_luong) * soLuongMuonThue;

    if (item.mau_thiet_bi_phu_id) {
      const soLuongPhuSanSang = await tinhSoLuongKhaDungCuaMau(
        item.mau_thiet_bi_phu_id,
        ngayNhan,
        ngayTra
      );

      const toiDaTheoThanhPhan = Math.floor(
        soLuongPhuSanSang / Number(item.so_luong)
      );

      soLuongSanSangTheoBo = Math.min(
        soLuongSanSangTheoBo,
        toiDaTheoThanhPhan
      );

      chiTietKhaDung.push({
        ten_vat_pham: item.ten_hien_thi,
        loai: "THIET_BI_PHU",
        so_luong_can: soLuongCan,
        so_luong_san_sang: soLuongPhuSanSang,
      });

      if (soLuongPhuSanSang < soLuongCan) {
        return {
          co_the_thue: false,
          so_luong_san_sang: soLuongSanSangTheoBo,
          ly_do_khong_the_thue: `Thiết bị đi kèm ${item.ten_hien_thi} không đủ số lượng sẵn sàng`,
          chi_tiet_kha_dung: chiTietKhaDung,
        };
      }
    }

    if (item.phu_kien_id) {
      const soLuongPhuKienSanSang = await tinhSoLuongKhaDungCuaPhuKien(
        item.phu_kien_id,
        ngayNhan,
        ngayTra
      );

      const toiDaTheoThanhPhan = Math.floor(
        soLuongPhuKienSanSang / Number(item.so_luong)
      );

      soLuongSanSangTheoBo = Math.min(
        soLuongSanSangTheoBo,
        toiDaTheoThanhPhan
      );

      chiTietKhaDung.push({
        ten_vat_pham: item.ten_phu_kien,
        loai: "PHU_KIEN",
        so_luong_can: soLuongCan,
        so_luong_san_sang: soLuongPhuKienSanSang,
      });

      if (soLuongPhuKienSanSang < soLuongCan) {
        return {
          co_the_thue: false,
          so_luong_san_sang: soLuongSanSangTheoBo,
          ly_do_khong_the_thue: `Phụ kiện ${item.ten_phu_kien} không đủ số lượng sẵn sàng`,
          chi_tiet_kha_dung: chiTietKhaDung,
        };
      }
    }
  }

  return {
    co_the_thue: true,
    so_luong_san_sang: soLuongSanSangTheoBo,
    ly_do_khong_the_thue: "",
    chi_tiet_kha_dung: chiTietKhaDung,
  };
}

async function layDanhSachMauThietBiService(query = {}) {
  const ngayNhan = query.ngay_nhan;
  const ngayTra = query.ngay_tra;
  const soLuong = query.so_luong || 1;

  const danhSach = await deviceModelRepository.layDanhSachMauThietBi({
    hangId: query.hang_id || "",
    danhMucId: query.danh_muc_id || "",
  });

  if (!ngayNhan && !ngayTra) {
    return await ganBoDiKemChoDanhSachMau(danhSach);
  }

  if ((ngayNhan && !ngayTra) || (!ngayNhan && ngayTra)) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  const ketQua = [];

  for (const mau of danhSach) {
    const kiemTra = await kiemTraMauCoTheThue(
      mau.id,
      ngayNhan,
      ngayTra,
      soLuong
    );

    if (kiemTra.co_the_thue) {
      ketQua.push({
        ...mau,
        so_luong_san_sang: kiemTra.so_luong_san_sang,
      });
    }
  }

  return await ganBoDiKemChoDanhSachMau(ketQua);
}

async function layChiTietMauThietBiService(id, query = {}) {
  const mauThietBi = await deviceModelRepository.layMauThietBiTheoId(id);

  if (!mauThietBi) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  const boDiKem = await layBoDiKemCuaMau(id);

  const sanPhamTuongTu = await deviceModelRepository.laySanPhamTuongTu(
    id,
    mauThietBi.danh_muc_id
  );

  if (!query.ngay_nhan && !query.ngay_tra) {
    return new DeviceModelModel({
      ...mauThietBi,
      bo_di_kem: boDiKem,
      co_the_thue: null,
      so_luong_san_sang: null,
      ly_do_khong_the_thue: "",
      chi_tiet_kha_dung: [],
      san_pham_tuong_tu: sanPhamTuongTu,
    });
  }

  if ((query.ngay_nhan && !query.ngay_tra) || (!query.ngay_nhan && query.ngay_tra)) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  const kiemTra = await kiemTraMauCoTheThue(
    id,
    query.ngay_nhan,
    query.ngay_tra,
    query.so_luong || 1
  );

  return new DeviceModelModel({
    ...mauThietBi,
    bo_di_kem: boDiKem,
    ...kiemTra,
    san_pham_tuong_tu: sanPhamTuongTu,
  });
}

module.exports = {
  layDanhSachMauThietBiService,
  layChiTietMauThietBiService,
  kiemTraMauCoTheThue,
};
