const prisma = require("../../config/prisma");

function kiemTraNgayHopLe(ngay) {
  return ngay && !Number.isNaN(new Date(ngay).getTime());
}

// Hàm kiểm tra ngày nhận và ngày trả.
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

async function tinhSoLuongDaDatCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const ketQua = await prisma.$queryRaw`
    SELECT
      (
        SELECT COALESCE(SUM(ctdt.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        WHERE ctdt.mau_thiet_bi_id = ${mauThietBiId}::uuid
          AND dt.trang_thai = 1102
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      )
      +
      (
        SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int
        FROM chi_tiet_don_thue ctdt

        JOIN don_thue dt
          ON dt.id = ctdt.don_thue_id

        JOIN bo_di_kem bdk
          ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

        WHERE bdk.mau_thiet_bi_phu_id = ${mauThietBiId}::uuid
          AND dt.trang_thai = 1102
          AND dt.ngay_nhan < ${ngayTra}::timestamptz
          AND dt.ngay_tra > ${ngayNhan}::timestamptz
      ) AS da_dat
  `;

  return Number(ketQua[0].da_dat || 0);
}

async function tinhSoLuongKhaDungCuaMau(mauThietBiId, ngayNhan, ngayTra) {
  const tongThietBi = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS tong
    FROM thiet_bi_vat_ly
    WHERE mau_thiet_bi_id = ${mauThietBiId}::uuid
      AND trang_thai = 501
      AND da_xoa_luc IS NULL
  `;

  const soLuongDaGiuCho = await tinhSoLuongDaDatCuaMau(
    mauThietBiId,
    ngayNhan,
    ngayTra
  );

  const soLuongConLai = Number(tongThietBi[0].tong) - soLuongDaGiuCho;

  return soLuongConLai > 0 ? soLuongConLai : 0;
}

async function tinhSoLuongDaDatCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const ketQua = await prisma.$queryRaw`
    SELECT COALESCE(SUM(ctdt.so_luong * bdk.so_luong), 0)::int AS da_dat
    FROM chi_tiet_don_thue ctdt

    JOIN don_thue dt
      ON dt.id = ctdt.don_thue_id

    JOIN bo_di_kem bdk
      ON bdk.mau_thiet_bi_chinh_id = ctdt.mau_thiet_bi_id

    WHERE bdk.phu_kien_id = ${phuKienId}::uuid
      AND dt.trang_thai IN (1102, 1103, 1105)
      AND dt.ngay_nhan < ${ngayTra}::timestamptz
      AND dt.ngay_tra > ${ngayNhan}::timestamptz
  `;

  return Number(ketQua[0].da_dat || 0);
}

async function tinhSoLuongKhaDungCuaPhuKien(phuKienId, ngayNhan, ngayTra) {
  const tongPhuKien = await prisma.$queryRaw`
    SELECT COALESCE(tong_so_luong, 0)::int AS tong
    FROM phu_kien
    WHERE id = ${phuKienId}::uuid
      AND da_xoa_luc IS NULL
    LIMIT 1
  `;

  if (tongPhuKien.length === 0) {
    return 0;
  }

  const soLuongDaDat = await tinhSoLuongDaDatCuaPhuKien(
    phuKienId,
    ngayNhan,
    ngayTra
  );

  const soLuongConLai = Number(tongPhuKien[0].tong) - soLuongDaDat;

  return soLuongConLai > 0 ? soLuongConLai : 0;
}

async function layBoDiKemCuaMau(mauThietBiId) {
  const boDiKem = await prisma.$queryRaw`
    SELECT
      bdk.id,
      bdk.so_luong,

      mtb_phu.id AS mau_thiet_bi_phu_id,
      mtb_phu.ten_hang AS ten_hang_phu,
      mtb_phu.ten_mau AS ten_mau_phu,

      pk.id AS phu_kien_id,
      pk.ten_phu_kien

    FROM bo_di_kem bdk

    LEFT JOIN mau_thiet_bi mtb_phu
      ON mtb_phu.id = bdk.mau_thiet_bi_phu_id

    LEFT JOIN phu_kien pk
      ON pk.id = bdk.phu_kien_id

    WHERE bdk.mau_thiet_bi_chinh_id = ${mauThietBiId}::uuid

    ORDER BY bdk.created_at ASC
  `;

  return boDiKem;
}

// Gắn bộ đi kèm vào từng mẫu để Home và EquipmentList có dữ liệu hiển thị trên card.
// Nếu mẫu nào lỗi bộ đi kèm thì vẫn cho mẫu đó hiển thị, chỉ để bo_di_kem = [].
async function ganBoDiKemChoDanhSachMau(danhSachMau) {
  const ketQua = [];

  for (const mau of danhSachMau) {
    let boDiKem = [];

    try {
      boDiKem = await layBoDiKemCuaMau(mau.id);
    } catch {
      boDiKem = [];
    }

    ketQua.push({
      ...mau,
      bo_di_kem: boDiKem,
    });
  }

  return ketQua;
}

async function kiemTraMauCoTheThue(mauThietBiId, ngayNhan, ngayTra, soLuong) {
  kiemTraNgayThue(ngayNhan, ngayTra);

  const soLuongMuonThue = Number(soLuong || 1);

  if (!Number.isInteger(soLuongMuonThue) || soLuongMuonThue < 1) {
    throw new Error("Số lượng thuê phải là số nguyên lớn hơn 0");
  }

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
        ten_vat_pham: `${item.ten_hang_phu || ""} ${
          item.ten_mau_phu || ""
        }`.trim(),
        loai: "THIET_BI_PHU",
        so_luong_can: soLuongCan,
        so_luong_san_sang: soLuongPhuSanSang,
      });

      if (soLuongPhuSanSang < soLuongCan) {
        return {
          co_the_thue: false,
          so_luong_san_sang: soLuongSanSangTheoBo,
          ly_do_khong_the_thue: `Thiết bị đi kèm ${
            item.ten_mau_phu || ""
          } không đủ số lượng`,
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
          ly_do_khong_the_thue: `Phụ kiện ${item.ten_phu_kien} không đủ số lượng`,
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
  const { ngay_nhan, ngay_tra, so_luong } = query;

  const danhSach = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      dmtb.ten_danh_muc,

      (
        SELECT COUNT(*)::int
        FROM thiet_bi_vat_ly tbvl
        WHERE tbvl.mau_thiet_bi_id = mtb.id
          AND tbvl.trang_thai = 501
          AND tbvl.da_xoa_luc IS NULL
      ) AS so_luong_san_sang

    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE mtb.da_xoa_luc IS NULL

    ORDER BY mtb.created_at DESC
  `;

  if (!ngay_nhan && !ngay_tra) {
    return await ganBoDiKemChoDanhSachMau(danhSach);
  }

  if ((ngay_nhan && !ngay_tra) || (!ngay_nhan && ngay_tra)) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  const ketQua = [];

  for (const mau of danhSach) {
    const kiemTra = await kiemTraMauCoTheThue(
      mau.id,
      ngay_nhan,
      ngay_tra,
      so_luong || 1
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
  const { ngay_nhan, ngay_tra, so_luong } = query;

  const danhSachMau = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.danh_muc_id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.mo_ta,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE mtb.id = ${id}::uuid
      AND mtb.da_xoa_luc IS NULL

    LIMIT 1
  `;

  if (danhSachMau.length === 0) {
    throw new Error("Không tìm thấy mẫu thiết bị");
  }

  const mauThietBi = danhSachMau[0];
  const boDiKem = await layBoDiKemCuaMau(id);

  const sanPhamTuongTu = await prisma.$queryRaw`
    SELECT
      mtb.id,
      mtb.ten_hang,
      mtb.ten_mau,
      mtb.anh_url,
      mtb.gia_thue_ngay::text AS gia_thue_ngay,
      mtb.tien_coc::text AS tien_coc,
      dmtb.ten_danh_muc
    FROM mau_thiet_bi mtb

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE mtb.da_xoa_luc IS NULL
      AND mtb.id <> ${id}::uuid
      AND mtb.danh_muc_id = ${mauThietBi.danh_muc_id}::uuid

    ORDER BY mtb.created_at DESC
  `;

  if (!ngay_nhan && !ngay_tra) {
    return {
      ...mauThietBi,
      bo_di_kem: boDiKem,
      co_the_thue: null,
      so_luong_san_sang: null,
      ly_do_khong_the_thue: "",
      chi_tiet_kha_dung: [],
      san_pham_tuong_tu: sanPhamTuongTu,
    };
  }

  if ((ngay_nhan && !ngay_tra) || (!ngay_nhan && ngay_tra)) {
    throw new Error("Vui lòng chọn đủ ngày nhận và ngày trả");
  }

  const kiemTra = await kiemTraMauCoTheThue(
    id,
    ngay_nhan,
    ngay_tra,
    so_luong || 1
  );

  return {
    ...mauThietBi,
    bo_di_kem: boDiKem,
    ...kiemTra,
    san_pham_tuong_tu: sanPhamTuongTu,
  };
}

module.exports = {
  layDanhSachMauThietBiService,
  layChiTietMauThietBiService,
  kiemTraMauCoTheThue,
};