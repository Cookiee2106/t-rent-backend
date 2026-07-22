const cartRepository = require("../repositories/cartRepository");

async function layHoacTaoGioHang(khachHangId) {
  let gioHang = await cartRepository.layGioHangTheoKhachHangId(khachHangId);

  if (!gioHang) {
    gioHang = await cartRepository.taoGioHang(khachHangId);
  }

  return gioHang;
}

function layNgayMaiText() {
  const ngayMai = new Date();
  ngayMai.setDate(ngayMai.getDate() + 1);

  const nam = ngayMai.getFullYear();
  const thang = String(ngayMai.getMonth() + 1).padStart(2, "0");
  const ngay = String(ngayMai.getDate()).padStart(2, "0");

  return `${nam}-${thang}-${ngay}`;
}

function kiemTraNgayThue(ngayNhan, ngayTra) {
  if (!ngayNhan || !ngayTra) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  const dateNhan = new Date(ngayNhan);
  const dateTra = new Date(ngayTra);

  if (
    Number.isNaN(dateNhan.getTime()) ||
    Number.isNaN(dateTra.getTime()) ||
    dateTra <= dateNhan
  ) {
    throw new Error("Ngày nhận và ngày trả không hợp lệ");
  }

  if (String(ngayNhan).slice(0, 10) < layNgayMaiText()) {
    throw new Error("Ngày nhận phải từ ngày mai trở đi");
  }

  return {
    ngayNhan: dateNhan,
    ngayTra: dateTra,
  };
}

function docSoLuong(soLuong) {
  const giaTri = Number(soLuong);

  if (!Number.isInteger(giaTri) || giaTri < 1) {
    throw new Error("Số lượng phải lớn hơn 0");
  }

  return giaTri;
}

async function tinhSoLuongKhaDungCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const tong = await cartRepository.demThietBiSanSangCuaMau(mauThietBiId);
  const daDat = await cartRepository.tinhSoLuongDaDatCuaMau(
    mauThietBiId,
    ngayNhan,
    ngayTra
  );

  const conLai = tong - daDat;
  return conLai > 0 ? conLai : 0;
}

async function tinhSoLuongKhaDungCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const tong = await cartRepository.layTongSoLuongPhuKien(phuKienId);
  const daDat = await cartRepository.tinhSoLuongDaDatCuaPhuKien(
    phuKienId,
    ngayNhan,
    ngayTra
  );

  const conLai = tong - daDat;
  return conLai > 0 ? conLai : 0;
}

async function kiemTraMauCoTheThemVaoGio({
  mauThietBiId,
  tenMau,
  ngayNhan,
  ngayTra,
  soLuong,
}) {
  const soLuongMauChinh = await tinhSoLuongKhaDungCuaMau(
    mauThietBiId,
    ngayNhan,
    ngayTra
  );

  if (soLuongMauChinh < soLuong) {
    throw new Error(`Thiết bị "${tenMau}" không đủ số lượng khả dụng`);
  }

  const boDiKem = await cartRepository.layBoDiKemCuaMau(mauThietBiId);

  for (const item of boDiKem) {
    const soLuongCan = Number(item.so_luong || 0) * soLuong;

    if (item.mau_thiet_bi_phu_id) {
      const soLuongPhu = await tinhSoLuongKhaDungCuaMau(
        item.mau_thiet_bi_phu_id,
        ngayNhan,
        ngayTra
      );

      if (soLuongPhu < soLuongCan) {
        throw new Error(`Bộ đi kèm của "${tenMau}" không đủ số lượng khả dụng`);
      }
    }

    if (item.phu_kien_id) {
      const soLuongPhuKien = await tinhSoLuongKhaDungCuaPhuKien(
        item.phu_kien_id,
        ngayNhan,
        ngayTra
      );

      if (soLuongPhuKien < soLuongCan) {
        throw new Error(`Phụ kiện đi kèm của "${tenMau}" không đủ số lượng khả dụng`);
      }
    }
  }
}

class CartModel {
  constructor({
    gio_hang_id,
    items = [],
  } = {}) {
    this.gio_hang_id = gio_hang_id || null;

    this.items = items.map((item) => ({
      id: item.id,
      mau_thiet_bi_id: item.mau_thiet_bi_id,

      so_luong: Number(item.so_luong || 0),

      ngay_nhan: item.ngay_nhan || null,
      ngay_tra: item.ngay_tra || null,

      gia_thue_ngay_snapshot: Number(item.gia_thue_ngay_snapshot || 0),
      tien_coc_snapshot: Number(item.tien_coc_snapshot || 0),

      ten_hang: item.ten_hang || "",
      ten_mau: item.ten_mau || "",
      anh_url: item.anh_url || "",
      ten_danh_muc: item.ten_danh_muc || "",
    }));
  }

  // Lấy giỏ hàng của khách hàng.
  static async layGioHangService(khachHangId) {
    const gioHang = await layHoacTaoGioHang(khachHangId);
    const items = await cartRepository.layDanhSachItemTheoGioHang(gioHang.id);

    return new CartModel({
      gio_hang_id: gioHang.id,
      items,
    });
  }

  // Thêm mẫu thiết bị vào giỏ hàng.
  static async themVaoGioHangService(khachHangId, body) {
    const { mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra } = body;

    if (!mau_thiet_bi_id) {
      throw new Error("Vui lòng chọn mẫu thiết bị");
    }

    const soLuongThem = docSoLuong(so_luong);
    const { ngayNhan, ngayTra } = kiemTraNgayThue(ngay_nhan, ngay_tra);

    const mau = await cartRepository.layMauThietBiDangHienThi(
      mau_thiet_bi_id
    );

    if (!mau) {
      throw new Error("Mẫu thiết bị không tồn tại hoặc đang bị ẩn");
    }

    const gioHang = await layHoacTaoGioHang(khachHangId);
    const itemCungMau = await cartRepository.layItemCungMauTrongGio(
      gioHang.id,
      mau_thiet_bi_id
    );

    const soLuongCu = itemCungMau.reduce((tong, item) => {
      return tong + Number(item.so_luong || 0);
    }, 0);

    const soLuongMoi = soLuongCu + soLuongThem;

    try {
      await kiemTraMauCoTheThemVaoGio({
        mauThietBiId: mau_thiet_bi_id,
        tenMau: mau.ten_mau,
        ngayNhan,
        ngayTra,
        soLuong: soLuongMoi,
      });
    } catch (loi) {
      if (soLuongCu > 0) {
        throw new Error(
          `Bạn đã có ${soLuongCu} bộ "${mau.ten_mau}" trong giỏ. Vui lòng vào giỏ hàng để chỉnh số lượng.`
        );
      }

      throw loi;
    }

    if (itemCungMau.length > 0) {
      const itemGiuLai = itemCungMau[0];

      await cartRepository.capNhatItemTrongGio({
        itemId: itemGiuLai.id,
        soLuong: soLuongMoi,
        ngayNhan,
        ngayTra,
        giaThueNgay: mau.gia_thue_ngay,
        tienCoc: mau.tien_coc,
      });

      for (const item of itemCungMau.slice(1)) {
        await cartRepository.xoaItemTheoId(item.id);
      }
    } else {
      await cartRepository.themItemVaoGioHang({
        gioHangId: gioHang.id,
        mauThietBiId: mau_thiet_bi_id,
        soLuong: soLuongThem,
        ngayNhan,
        ngayTra,
        giaThueNgay: mau.gia_thue_ngay,
        tienCoc: mau.tien_coc,
      });
    }

    return { message: "Thêm vào giỏ hàng thành công" };
  }

  // Cập nhật sản phẩm trong giỏ hàng.
  static async capNhatSanPhamService(khachHangId, itemId, body) {
    const item = await cartRepository.layItemThuocKhachHang(
      khachHangId,
      itemId
    );

    if (!item) {
      throw new Error("Sản phẩm trong giỏ hàng không tồn tại");
    }

    const soLuong = docSoLuong(body.so_luong || item.so_luong);
    const { ngayNhan, ngayTra } = kiemTraNgayThue(
      body.ngay_nhan || item.ngay_nhan,
      body.ngay_tra || item.ngay_tra
    );

    await kiemTraMauCoTheThemVaoGio({
      mauThietBiId: item.mau_thiet_bi_id,
      tenMau: item.ten_mau,
      ngayNhan,
      ngayTra,
      soLuong,
    });

    await cartRepository.capNhatItemTrongGio({
      itemId,
      soLuong,
      ngayNhan,
      ngayTra,
    });

    return { message: "Cập nhật sản phẩm thành công" };
  }

  // Xóa sản phẩm khỏi giỏ hàng.
  static async xoaSanPhamService(khachHangId, itemId) {
    const item = await cartRepository.layItemThuocKhachHang(
      khachHangId,
      itemId
    );

    if (!item) {
      throw new Error("Sản phẩm trong giỏ hàng không tồn tại");
    }

    await cartRepository.xoaItemTheoId(itemId);

    return { message: "Xóa sản phẩm thành công" };
  }
}

module.exports = CartModel;
