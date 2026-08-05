const deviceModelRepository = require("../repositories/deviceModelRepository");

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


function kiemTraUuid(giaTri) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(giaTri || "")
  );
}

function docSoTienLoc(giaTri, tenTruong) {
  if (giaTri === undefined || giaTri === null || giaTri === "") {
    return null;
  }

  const soTien = Number(giaTri);

  if (!Number.isFinite(soTien) || soTien < 0) {
    throw new Error(`${tenTruong} phải là số không âm`);
  }

  return Math.floor(soTien);
}

function laDanhMucOngKinh(tenDanhMuc) {
  return String(tenDanhMuc || "").trim().toLowerCase() === "ống kính";
}

function taoTenHienThiBoDiKem(item) {
  if (item.mau_thiet_bi_phu_id) {
    return `${item.ten_hang_phu || ""} ${
      item.ten_mau_phu || ""
    }`.trim();
  }

  return item.ten_phu_kien || "";
}

function taoMapBoDiKem(danhSachBoDiKem = []) {
  const map = new Map();

  for (const item of danhSachBoDiKem) {
    const mauChinhId = String(item.mau_thiet_bi_chinh_id);

    if (!map.has(mauChinhId)) {
      map.set(mauChinhId, []);
    }

    map.get(mauChinhId).push({
      ...item,
      ten_hien_thi: taoTenHienThiBoDiKem(item),
    });
  }

  return map;
}

function taoMapSoLuong(danhSach = [], tenCotId) {
  const map = new Map();

  for (const item of danhSach) {
    map.set(
      String(item[tenCotId]),
      Number(item.so_luong_kha_dung || 0)
    );
  }

  return map;
}

// Gắn bộ đi kèm đã lấy theo lô vào từng mẫu.
// Hàm này không gọi database trong vòng lặp.
function ganBoDiKemChoDanhSachMau(danhSachMau, mapBoDiKem) {
  return danhSachMau.map(
    (mau) =>
      new DeviceModelModel({
        ...mau,
        bo_di_kem: mapBoDiKem.get(String(mau.id)) || [],
      })
  );
}

// Tính bộ sẵn sàng hoàn toàn từ dữ liệu đã tải.
// Không còn await truy vấn trong vòng lặp từng món đi kèm.
function kiemTraMauBangDuLieuDaTai({
  mauThietBiId,
  soLuongMuonThue,
  mapBoDiKem,
  mapKhaDungMau,
  mapKhaDungPhuKien,
}) {
  const soLuongMauChinh =
    mapKhaDungMau.get(String(mauThietBiId)) || 0;

  const boDiKem =
    mapBoDiKem.get(String(mauThietBiId)) || [];

  let soLuongSanSangTheoBo = soLuongMauChinh;
  const chiTietKhaDung = [];

  if (soLuongMauChinh < soLuongMuonThue) {
    return {
      co_the_thue: false,
      so_luong_san_sang: soLuongMauChinh,
      ly_do_khong_the_thue:
        "Mẫu thiết bị chính không đủ số lượng sẵn sàng",
      chi_tiet_kha_dung: chiTietKhaDung,
    };
  }

  for (const item of boDiKem) {
    const soLuongMoiBo = Number(item.so_luong || 0);

    if (soLuongMoiBo <= 0) {
      continue;
    }

    const soLuongCan = soLuongMoiBo * soLuongMuonThue;

    if (item.mau_thiet_bi_phu_id) {
      const soLuongPhuSanSang =
        mapKhaDungMau.get(String(item.mau_thiet_bi_phu_id)) || 0;

      const toiDaTheoThanhPhan = Math.floor(
        soLuongPhuSanSang / soLuongMoiBo
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
          ly_do_khong_the_thue:
            `Thiết bị đi kèm ${item.ten_hien_thi} ` +
            "không đủ số lượng sẵn sàng",
          chi_tiet_kha_dung: chiTietKhaDung,
        };
      }
    }

    if (item.phu_kien_id) {
      const soLuongPhuKienSanSang =
        mapKhaDungPhuKien.get(String(item.phu_kien_id)) || 0;

      const toiDaTheoThanhPhan = Math.floor(
        soLuongPhuKienSanSang / soLuongMoiBo
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
          ly_do_khong_the_thue:
            `Phụ kiện ${item.ten_phu_kien} ` +
            "không đủ số lượng sẵn sàng",
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

async function taiDuLieuKhaDungTheoLo(
  danhSachMauId,
  ngayNhan,
  ngayTra
) {
  const [
    danhSachBoDiKem,
    danhSachKhaDungMau,
    danhSachKhaDungPhuKien,
  ] = await Promise.all([
    deviceModelRepository.layBoDiKemCuaNhieuMau(danhSachMauId),
    deviceModelRepository.laySoLuongKhaDungCuaTatCaMau(
      ngayNhan,
      ngayTra
    ),
    deviceModelRepository.laySoLuongKhaDungCuaTatCaPhuKien(
      ngayNhan,
      ngayTra
    ),
  ]);

  return {
    mapBoDiKem: taoMapBoDiKem(danhSachBoDiKem),

    mapKhaDungMau: taoMapSoLuong(
      danhSachKhaDungMau,
      "mau_thiet_bi_id"
    ),

    mapKhaDungPhuKien: taoMapSoLuong(
      danhSachKhaDungPhuKien,
      "phu_kien_id"
    ),
  };
}

class DeviceModelModel {
  constructor({
    id,
    danh_muc_id,
    ten_danh_muc,
    tinh_chat_id,
    hang_id,
    ten_hang,
    ngam_id,
    ten_ngam,
    nhu_cau_su_dung,
    ten_mau,
    mo_ta,
    anh_url,
    gia_thue_ngay,
    tien_coc,
    so_luong_san_sang,
    bo_di_kem,
    co_the_thue,
    ly_do_khong_the_thue,
    chi_tiet_kha_dung,
    san_pham_tuong_tu,
  } = {}) {
    this.id = id;
    this.danh_muc_id = danh_muc_id || null;
    this.ten_danh_muc = ten_danh_muc || null;
    this.tinh_chat_id = tinh_chat_id || null;
    this.hang_id = hang_id || null;
    this.ten_hang = ten_hang || null;

    this.ngam_id = ngam_id || null;
    this.ten_ngam = ten_ngam || null;
    this.nhu_cau_su_dung = Array.isArray(nhu_cau_su_dung)
      ? nhu_cau_su_dung
      : [];

    this.ten_mau = ten_mau;
    this.mo_ta = mo_ta || "";
    this.anh_url = anh_url || null;
    this.gia_thue_ngay = gia_thue_ngay || "0";
    this.tien_coc = tien_coc || "0";

    this.so_luong_san_sang =
      so_luong_san_sang === undefined
        ? null
        : Number(so_luong_san_sang || 0);

    this.bo_di_kem = bo_di_kem || [];
    this.co_the_thue = co_the_thue ?? null;
    this.ly_do_khong_the_thue = ly_do_khong_the_thue || "";
    this.chi_tiet_kha_dung = chi_tiet_kha_dung || [];
    this.san_pham_tuong_tu = san_pham_tuong_tu || [];
  }

  // Kiểm tra một mẫu bằng các query theo lô.
  static async kiemTraMauCoTheThue(
    mauThietBiId,
    ngayNhan,
    ngayTra,
    soLuong
  ) {
    kiemTraNgayThue(ngayNhan, ngayTra);

    const soLuongMuonThue = docSoLuong(soLuong);

    const {
      mapBoDiKem,
      mapKhaDungMau,
      mapKhaDungPhuKien,
    } = await taiDuLieuKhaDungTheoLo(
      [mauThietBiId],
      ngayNhan,
      ngayTra
    );

    return kiemTraMauBangDuLieuDaTai({
      mauThietBiId,
      soLuongMuonThue,
      mapBoDiKem,
      mapKhaDungMau,
      mapKhaDungPhuKien,
    });
  }

  // Lấy dữ liệu cho bộ lọc khách hàng.
  // Chỉ trả nhu cầu, máy ảnh và ngàm đang hiển thị.
  static async layLuaChonBoLocService() {
    const [nhuCau, mayAnh] = await Promise.all([
      deviceModelRepository.layDanhSachNhuCauBoLoc(),
      deviceModelRepository.layDanhSachMayAnhBoLoc(),
    ]);

    return {
      nhu_cau: nhuCau,
      may_anh: mayAnh,
    };
  }

  // Lấy danh sách mẫu thiết bị.
  static async layDanhSachMauThietBiService(query = {}) {
    const ngayNhan = query.ngay_nhan;
    const ngayTra = query.ngay_tra;
    const soLuongMuonThue = docSoLuong(query.so_luong || 1);

    const hangId = query.hang_id || "";
    const danhMucId = query.danh_muc_id || "";
    const nhuCauId = query.nhu_cau_id || "";
    const mayAnhId = query.may_anh_id || "";

    if (hangId && !kiemTraUuid(hangId)) {
      throw new Error("Hãng không hợp lệ");
    }

    if (danhMucId && !kiemTraUuid(danhMucId)) {
      throw new Error("Danh mục không hợp lệ");
    }

    if (nhuCauId && !kiemTraUuid(nhuCauId)) {
      throw new Error("Nhu cầu sử dụng không hợp lệ");
    }

    if (mayAnhId && !kiemTraUuid(mayAnhId)) {
      throw new Error("Mẫu máy ảnh không hợp lệ");
    }

    const giaTu = docSoTienLoc(query.gia_tu, "Giá từ");
    const giaDen = docSoTienLoc(query.gia_den, "Giá đến");

    if (giaTu !== null && giaDen !== null && giaTu > giaDen) {
      throw new Error("Giá từ không được lớn hơn giá đến");
    }

    if (nhuCauId) {
      const nhuCau =
        await deviceModelRepository.layNhuCauHienThiTheoId(
          nhuCauId
        );

      if (!nhuCau) {
        throw new Error("Nhu cầu sử dụng không tồn tại hoặc đã bị ẩn");
      }
    }

    let ngamIdBatBuoc = "";

    if (mayAnhId) {
      const mayAnh =
        await deviceModelRepository.layMayAnhTheoIdChoTuongThich(
          mayAnhId
        );

      if (!mayAnh) {
        throw new Error(
          "Mẫu máy ảnh không tồn tại, đã bị ẩn hoặc ngàm đã bị ẩn"
        );
      }

      ngamIdBatBuoc = mayAnh.ngam_id;
    }

    const danhSach =
      await deviceModelRepository.layDanhSachMauThietBi({
        hangId,
        danhMucId,
        nhuCauId,
        giaTu,
        giaDen,
        ngamIdBatBuoc,
      });

    const danhSachMauId = danhSach.map((mau) => mau.id);

    // Chưa chọn ngày: chỉ dùng thêm một query lấy toàn bộ bộ đi kèm.
    if (!ngayNhan && !ngayTra) {
      const danhSachBoDiKem =
        await deviceModelRepository.layBoDiKemCuaNhieuMau(
          danhSachMauId
        );

      const mapBoDiKem = taoMapBoDiKem(danhSachBoDiKem);

      return ganBoDiKemChoDanhSachMau(
        danhSach,
        mapBoDiKem
      );
    }

    if (
      (ngayNhan && !ngayTra) ||
      (!ngayNhan && ngayTra)
    ) {
      throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
    }

    kiemTraNgayThue(ngayNhan, ngayTra);

    // Chỉ chạy ba query song song cho toàn bộ danh sách.
    const {
      mapBoDiKem,
      mapKhaDungMau,
      mapKhaDungPhuKien,
    } = await taiDuLieuKhaDungTheoLo(
      danhSachMauId,
      ngayNhan,
      ngayTra
    );

    const ketQua = [];

    for (const mau of danhSach) {
      const kiemTra = kiemTraMauBangDuLieuDaTai({
        mauThietBiId: mau.id,
        soLuongMuonThue,
        mapBoDiKem,
        mapKhaDungMau,
        mapKhaDungPhuKien,
      });

      if (kiemTra.co_the_thue) {
        ketQua.push(
          new DeviceModelModel({
            ...mau,
            bo_di_kem:
              mapBoDiKem.get(String(mau.id)) || [],
            ...kiemTra,
          })
        );
      }
    }

    return ketQua;
  }

  // Lấy chi tiết mẫu thiết bị.
  static async layChiTietMauThietBiService(id, query = {}) {
    const mauThietBi =
      await deviceModelRepository.layMauThietBiTheoId(id);

    if (!mauThietBi) {
      throw new Error("Không tìm thấy mẫu thiết bị");
    }

    const [danhSachBoDiKem, sanPhamTuongTu] =
      await Promise.all([
        deviceModelRepository.layBoDiKemCuaMau(id),
        deviceModelRepository.laySanPhamTuongTu(
          id,
          mauThietBi.danh_muc_id,
          laDanhMucOngKinh(mauThietBi.ten_danh_muc)
            ? mauThietBi.ngam_id_noi_bo || ""
            : ""
        ),
      ]);

    const boDiKem = danhSachBoDiKem.map((item) => ({
      ...item,
      ten_hien_thi: taoTenHienThiBoDiKem(item),
    }));

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

    if (
      (query.ngay_nhan && !query.ngay_tra) ||
      (!query.ngay_nhan && query.ngay_tra)
    ) {
      throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
    }

    const kiemTra =
      await DeviceModelModel.kiemTraMauCoTheThue(
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
}

module.exports = DeviceModelModel;
