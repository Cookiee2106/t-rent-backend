const prisma = require("../../config/prisma");
const cloudinaryConfig = require("../../config/cloudinary");

const cloudinary = cloudinaryConfig.uploader
  ? cloudinaryConfig
  : cloudinaryConfig.cloudinary;

const TRANG_THAI_DANG_THUE = 1103;
const TRANG_THAI_HOAN_THANH = 1104;
const TRANG_THAI_QUA_HAN = 1105;

const THIET_BI_SAN_SANG = 501;
const THIET_BI_DANG_THUE = 502;

const LOAI_TIEN_COC = 2301;
const LOAI_HOAN_COC = 2303;
const LOAI_KHAU_TRU_COC = 2304;
const LOAI_PHU_THU = 2305;

const MUC_DICH_HOP_DONG_GIAY = 2601;
const MUC_DICH_ANH_BAN_GIAO = 2602;
const MUC_DICH_ANH_KHI_TRA = 2603;

async function capNhatDonQuaHanNoiBo() {
  await prisma.$executeRaw`
    UPDATE don_thue
    SET
      trang_thai = ${TRANG_THAI_QUA_HAN},
      updated_at = NOW()
    WHERE trang_thai = ${TRANG_THAI_DANG_THUE}
      AND ngay_tra < NOW()
      AND tra_luc IS NULL
  `;
}

async function uploadAnhKhiTra(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "t-rent/orders/returns",
        resource_type: "image",
      },
      (loi, ketQua) => {
        if (loi) {
          reject(loi);
          return;
        }

        resolve(ketQua);
      }
    );

    stream.end(file.buffer);
  });
}

async function layTienCocDaThanhToan(tx, donThueId) {
  const ketQua = await tx.$queryRaw`
    SELECT COALESCE(SUM(so_tien), 0)::text AS tong_tien_coc
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id = ${LOAI_TIEN_COC}
  `;

  return Number(ketQua[0].tong_tien_coc || 0);
}

async function kiemTraDaCoThanhLy(tx, donThueId) {
  const ketQua = await tx.$queryRaw`
    SELECT COUNT(*)::int AS so_dong
    FROM thanh_toan
    WHERE don_thue_id = ${donThueId}::uuid
      AND loai_dong_tien_id IN (
        ${LOAI_HOAN_COC},
        ${LOAI_KHAU_TRU_COC},
        ${LOAI_PHU_THU}
      )
  `;

  return Number(ketQua[0].so_dong || 0) > 0;
}

async function taoDongTien(
  tx,
  donThue,
  nguoiDungId,
  soTien,
  loaiDongTienId,
  ghiChu
) {
  if (soTien <= 0) return;

  const phienThanhToanId = donThue.phien_thanh_toan_id || null;

  await tx.$executeRaw`
    INSERT INTO thanh_toan (
      don_thue_id,
      phien_thanh_toan_id,
      so_tien,
      loai_dong_tien_id,
      nguoi_thuc_hien_id,
      ghi_chu
    )
    VALUES (
      ${donThue.id}::uuid,
      ${phienThanhToanId}::uuid,
      ${soTien},
      ${loaiDongTienId},
      ${nguoiDungId}::uuid,
      ${ghiChu}
    )
  `;
}

function taoVatPhamBanGiao(dong) {
  return {
    ten_vat_pham_snapshot: dong.ten_vat_pham_snapshot,
    ma_tai_san_snapshot: dong.ma_tai_san_snapshot,
    so_serial_snapshot: dong.so_serial_snapshot,
    so_luong_giao: Number(dong.so_luong_giao || 1),
    vi_tri_luu_tru: dong.vi_tri_luu_tru || null,
    //tinh_trang_truoc: dong.tinh_trang_truoc,
  };
}

function gomSanPhamKemSerial(danhSachBanGiao) {
  const mapMau = new Map();

  for (const dong of danhSachBanGiao) {
    const key = dong.chi_tiet_don_thue_id;

    if (!mapMau.has(key)) {
      mapMau.set(key, {
        chi_tiet_don_thue_id: dong.chi_tiet_don_thue_id,
        ten_hang: dong.ten_hang,
        ten_mau: dong.ten_mau,
        ten_danh_muc: dong.ten_danh_muc,
        so_luong_dat: Number(dong.so_luong_dat || 1),
        thiet_bi_chinh: [],
        bo_di_kem: [],
      });
    }

    const mau = mapMau.get(key);
    const laThietBiChinh = dong.thiet_bi_id && !dong.bo_di_kem_id;

    if (laThietBiChinh) {
      mau.thiet_bi_chinh.push(taoVatPhamBanGiao(dong));
    } else {
      mau.bo_di_kem.push(taoVatPhamBanGiao(dong));
    }
  }

  return Array.from(mapMau.values());
}

//GOM THEO TỪNG THIẾT BỊ 
function gomTheoTungThietBi(danhSachBanGiao) {
  const mapChiTiet = new Map();

  for (const dong of danhSachBanGiao) {
    const key = dong.chi_tiet_don_thue_id;

    if (!mapChiTiet.has(key)) {
      mapChiTiet.set(key, {
        chi_tiet_don_thue_id: dong.chi_tiet_don_thue_id,
        ten_hang: dong.ten_hang,
        ten_mau: dong.ten_mau,
        ten_danh_muc: dong.ten_danh_muc,
        so_luong_dat: Number(dong.so_luong_dat || 1),
        thiet_bi_chinh: [],
        bo_di_kem: [],
      });
    }

    const nhom = mapChiTiet.get(key);
    const laThietBiChinh = dong.thiet_bi_id && !dong.bo_di_kem_id;

    if (laThietBiChinh) {
      nhom.thiet_bi_chinh.push(taoVatPhamBanGiao(dong));
    } else {
      nhom.bo_di_kem.push(taoVatPhamBanGiao(dong));
    }
  }

  const ketQua = [];

  for (const nhom of mapChiTiet.values()) {
    const danhSachThietBiChinh = nhom.thiet_bi_chinh;
    const danhSachBoDiKem = nhom.bo_di_kem;

    if (danhSachThietBiChinh.length === 0) {
      ketQua.push({
        chi_tiet_don_thue_id: nhom.chi_tiet_don_thue_id,
        ten_hang: nhom.ten_hang,
        ten_mau: nhom.ten_mau,
        ten_danh_muc: nhom.ten_danh_muc,
        so_luong_dat: nhom.so_luong_dat,
        so_thu_tu_thiet_bi: null,
        ten_hien_thi: `${nhom.ten_hang || ""} ${nhom.ten_mau || ""}`.trim(),
        thiet_bi_chinh: [],
        bo_di_kem: danhSachBoDiKem,
      });

      continue;
    }

    for (let i = 0; i < danhSachThietBiChinh.length; i++) {
      const thietBiChinh = danhSachThietBiChinh[i];

      const boDiKemCuaThietBi = danhSachBoDiKem.filter((_, index) => {
        return index % danhSachThietBiChinh.length === i;
      });

      ketQua.push({
        chi_tiet_don_thue_id: nhom.chi_tiet_don_thue_id,
        ten_hang: nhom.ten_hang,
        ten_mau: nhom.ten_mau,
        ten_danh_muc: nhom.ten_danh_muc,
        so_luong_dat: nhom.so_luong_dat,
        so_thu_tu_thiet_bi: i + 1,
        ten_hien_thi: `${nhom.ten_hang || ""} ${nhom.ten_mau || ""} #${
          i + 1
        }`.trim(),
        thiet_bi_chinh: [thietBiChinh],
        bo_di_kem: boDiKemCuaThietBi,
      });
    }
  }

  return ketQua;
}

async function layDanhSachThanhLyService() {
  await capNhatDonQuaHanNoiBo();

  const danhSach = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      ttht.ten_trang_thai,
      dt.ban_giao_luc,
      dt.tra_luc,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
      dt.created_at,

      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan

    FROM don_thue dt

    JOIN nguoi_dung kh
      ON kh.id = dt.khach_hang_id

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    WHERE dt.trang_thai IN (
      ${TRANG_THAI_DANG_THUE},
      ${TRANG_THAI_QUA_HAN},
      ${TRANG_THAI_HOAN_THANH}
    )

    ORDER BY dt.created_at DESC
  `;

  return danhSach;
}

async function layChiTietThanhLyService(donThueId) {
  await capNhatDonQuaHanNoiBo();

  const danhSachDon = await prisma.$queryRaw`
    SELECT
      dt.id,
      dt.ma_don,
      dt.khach_hang_id,
      dt.phien_thanh_toan_id,
      dt.ngay_nhan,
      dt.ngay_tra,
      dt.so_ngay_thue,
      dt.tong_tien_thue::text AS tong_tien_thue,
      dt.tong_tien_coc::text AS tong_tien_coc,
      dt.trang_thai,
      ttht.ten_trang_thai,

      dt.ban_giao_luc,
      nv_bg.ho_ten AS ten_nguoi_ban_giao,
      dt.ghi_chu_ban_giao,

      dt.tra_luc,
      nv_tra.ho_ten AS ten_nguoi_nhan_tra,
      dt.ghi_chu_thanh_ly,

      dt.phi_phat_sinh_ly_do,
      dt.phi_phat_sinh_tien::text AS phi_phat_sinh_tien,

      kh.ho_ten AS ten_khach_hang,
      kh.email AS email_khach_hang,
      kh.so_dien_thoai AS sdt_khach_hang,
      kh.dia_chi AS dia_chi_khach_hang,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_TIEN_COC}
      ) AS tien_coc_da_thanh_toan,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_HOAN_COC}
      ) AS tien_da_hoan_coc,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_KHAU_TRU_COC}
      ) AS tien_da_khau_tru,

      (
        SELECT COALESCE(SUM(tt.so_tien), 0)::text
        FROM thanh_toan tt
        WHERE tt.don_thue_id = dt.id
          AND tt.loai_dong_tien_id = ${LOAI_PHU_THU}
      ) AS tien_da_phu_thu

    FROM don_thue dt

    JOIN nguoi_dung kh
      ON kh.id = dt.khach_hang_id

    LEFT JOIN trang_thai_he_thong ttht
      ON ttht.id = dt.trang_thai

    LEFT JOIN nguoi_dung nv_bg
      ON nv_bg.id = dt.nguoi_ban_giao_id

    LEFT JOIN nguoi_dung nv_tra
      ON nv_tra.id = dt.nguoi_nhan_tra_id

    WHERE dt.id = ${donThueId}::uuid

    LIMIT 1
  `;

  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  const donThue = danhSachDon[0];

  if (
    donThue.trang_thai !== TRANG_THAI_DANG_THUE &&
    donThue.trang_thai !== TRANG_THAI_QUA_HAN &&
    donThue.trang_thai !== TRANG_THAI_HOAN_THANH
  ) {
    throw new Error("Đơn này chưa bàn giao nên chưa thể thanh lý");
  }

  const chiTietDon = await prisma.$queryRaw`
    SELECT
      ctdt.id,
      mtb.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,
      ctdt.so_luong,
      ctdt.gia_thue_ngay_snapshot::text AS gia_thue_ngay_snapshot,
      ctdt.tien_coc_snapshot::text AS tien_coc_snapshot,
      ctdt.tien_thue::text AS tien_thue,
      ctdt.tien_coc::text AS tien_coc
    FROM chi_tiet_don_thue ctdt

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    WHERE ctdt.don_thue_id = ${donThueId}::uuid

    ORDER BY ctdt.created_at ASC
  `;

  const danhSachBanGiao = await prisma.$queryRaw`
    SELECT
      ctdt.id AS chi_tiet_don_thue_id,
      ctdt.so_luong AS so_luong_dat,

      mtb.ten_hang,
      mtb.ten_mau,
      dmtb.ten_danh_muc,

      bgvp.bo_di_kem_id,
      bgvp.thiet_bi_id,
      bgvp.phu_kien_id,
      bgvp.ten_vat_pham_snapshot,
      bgvp.ma_tai_san_snapshot,
      bgvp.so_serial_snapshot,
      bgvp.so_luong_giao,

      -- CODE CŨ - ĐÃ BỎ TÌNH TRẠNG
      -- Trước đây thanh lý lấy tình trạng bàn giao từ dòng này.
      -- Hiện tại không dùng nữa, chỉ dùng ghi chú bàn giao chung.
      -- bgvp.tinh_trang_truoc,

      tbvl.vi_tri_luu_tru,

      bgvp.created_at
    FROM ban_giao_vat_pham bgvp

    JOIN chi_tiet_don_thue ctdt
      ON ctdt.id = bgvp.chi_tiet_don_thue_id

    JOIN mau_thiet_bi mtb
      ON mtb.id = ctdt.mau_thiet_bi_id

    LEFT JOIN danh_muc_thiet_bi dmtb
      ON dmtb.id = mtb.danh_muc_id

    LEFT JOIN thiet_bi_vat_ly tbvl
      ON tbvl.id = bgvp.thiet_bi_id

    WHERE ctdt.don_thue_id = ${donThueId}::uuid

    ORDER BY
      mtb.ten_mau ASC,
      bgvp.created_at ASC
  `;

  // Gom theo mẫu thiết bị.
  const sanPhamKemSerial = gomSanPhamKemSerial(danhSachBanGiao);

  // Gom theo từng thiết bị.
  //const sanPhamKemSerial = gomTheoTungThietBi(danhSachBanGiao);

  const tepDonThue = await prisma.$queryRaw`
    SELECT
      tdt.id,
      tdt.muc_dich_id,
      dmht.ma_danh_muc AS ma_muc_dich,
      dmht.ten_danh_muc AS ten_muc_dich,
      tdt.ten_file_goc,
      tdt.file_url,
      tdt.loai_file,
      tdt.kich_thuoc_file::text AS kich_thuoc_file,
      tdt.uploaded_at,
      nd.ho_ten AS nguoi_upload
    FROM tep_don_thue tdt

    LEFT JOIN danh_muc_he_thong dmht
      ON dmht.id = tdt.muc_dich_id

    LEFT JOIN nguoi_dung nd
      ON nd.id = tdt.uploaded_by

    WHERE tdt.don_thue_id = ${donThueId}::uuid
      AND tdt.muc_dich_id IN (
        ${MUC_DICH_HOP_DONG_GIAY},
        ${MUC_DICH_ANH_BAN_GIAO},
        ${MUC_DICH_ANH_KHI_TRA}
      )

    ORDER BY tdt.muc_dich_id ASC, tdt.uploaded_at ASC
  `;

  const thanhToan = await prisma.$queryRaw`
    SELECT
      tt.id,
      tt.so_tien::text AS so_tien,
      tt.loai_dong_tien_id,
      dmht.ma_danh_muc AS ma_loai_dong_tien,
      dmht.ten_danh_muc AS ten_loai_dong_tien,
      tt.ma_giao_dich,
      tt.ghi_chu,
      tt.created_at,
      nd.ho_ten AS nguoi_thuc_hien
    FROM thanh_toan tt

    LEFT JOIN danh_muc_he_thong dmht
      ON dmht.id = tt.loai_dong_tien_id

    LEFT JOIN nguoi_dung nd
      ON nd.id = tt.nguoi_thuc_hien_id

    WHERE tt.don_thue_id = ${donThueId}::uuid

    ORDER BY tt.created_at ASC
  `;

  return {
    don_thue: donThue,
    chi_tiet_don: chiTietDon,
    san_pham_kem_serial: sanPhamKemSerial,
    tep_don_thue: tepDonThue,
    thanh_toan: thanhToan,
  };
}

async function lapPhieuTraService(nguoiDungId, donThueId, body, files) {
  await capNhatDonQuaHanNoiBo();

  const danhSachDon = await prisma.$queryRaw`
    SELECT
      id,
      ma_don,
      phien_thanh_toan_id,
      trang_thai
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  const donThue = danhSachDon[0];

  if (donThue.trang_thai === TRANG_THAI_HOAN_THANH) {
    throw new Error("Đơn thuê đã thanh lý trước đó");
  }

  if (
    donThue.trang_thai !== TRANG_THAI_DANG_THUE &&
    donThue.trang_thai !== TRANG_THAI_QUA_HAN
  ) {
    throw new Error("Chỉ được thanh lý đơn đang thuê hoặc quá hạn");
  }

  if (!files || files.length === 0) {
    throw new Error("Vui lòng upload ít nhất 1 ảnh khi trả");
  }

  const hinhThuc = body.hinh_thuc_xu_ly_coc;
  const soTienNhap = Number(body.so_tien || 0);

  const lyDoPhatSinh = body.phi_phat_sinh_ly_do
    ? body.phi_phat_sinh_ly_do.trim()
    : null;

  const ghiChuThanhLy = body.ghi_chu_thanh_ly
    ? body.ghi_chu_thanh_ly.trim()
    : "";

  if (!ghiChuThanhLy) {
    throw new Error("Vui lòng nhập ghi chú thanh lý");
  }

  if (
    hinhThuc !== "HOAN_COC" &&
    hinhThuc !== "KHAU_TRU_COC" &&
    hinhThuc !== "PHU_THU"
  ) {
    throw new Error("Vui lòng chọn hình thức xử lý cọc");
  }

  if (hinhThuc !== "HOAN_COC") {
    if (soTienNhap <= 0) {
      throw new Error("Vui lòng nhập số tiền khấu trừ/phụ thu");
    }

    if (!lyDoPhatSinh) {
      throw new Error("Vui lòng nhập lý do phát sinh");
    }
  }

  const danhSachAnh = [];

  for (const file of files) {
    const upload = await uploadAnhKhiTra(file);

    danhSachAnh.push({
      ten_file_goc: file.originalname,
      file_url: upload.secure_url,
      loai_file: file.mimetype,
      kich_thuoc_file: file.size || null,
    });
  }

  const ketQua = await prisma.$transaction(async (tx) => {
    const tienCocDaThanhToan = await layTienCocDaThanhToan(tx, donThueId);

    if (tienCocDaThanhToan <= 0) {
      throw new Error("Đơn này chưa có tiền cọc đã thanh toán");
    }

    const daThanhLy = await kiemTraDaCoThanhLy(tx, donThueId);

    if (daThanhLy) {
      throw new Error("Đơn này đã có dòng tiền thanh lý");
    }

    let tienHoanCoc = 0;
    let tienKhauTru = 0;
    let tienPhuThu = 0;
    let tongPhiPhatSinh = 0;

    if (hinhThuc === "HOAN_COC") {
      tienHoanCoc = tienCocDaThanhToan;
    }

    if (hinhThuc === "KHAU_TRU_COC") {
      if (soTienNhap > tienCocDaThanhToan) {
        throw new Error(
          "Số tiền khấu trừ không được lớn hơn tiền cọc. Nếu vượt cọc thì chọn phụ thu"
        );
      }

      tienKhauTru = soTienNhap;
      tienHoanCoc = tienCocDaThanhToan - soTienNhap;
      tongPhiPhatSinh = tienKhauTru;
    }

    if (hinhThuc === "PHU_THU") {
      tienKhauTru = tienCocDaThanhToan;
      tienPhuThu = soTienNhap;
      tongPhiPhatSinh = tienCocDaThanhToan + soTienNhap;
    }

    const donCapNhat = await tx.$queryRaw`
      UPDATE don_thue
      SET
        tra_luc = NOW(),
        nguoi_nhan_tra_id = ${nguoiDungId}::uuid,
        ghi_chu_thanh_ly = ${ghiChuThanhLy},
        phi_phat_sinh_tien = ${tongPhiPhatSinh},
        phi_phat_sinh_ly_do = ${lyDoPhatSinh},
        trang_thai = ${TRANG_THAI_HOAN_THANH},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
      RETURNING
        id,
        ma_don,
        trang_thai,
        tra_luc,
        ghi_chu_thanh_ly,
        phi_phat_sinh_tien::text AS phi_phat_sinh_tien,
        phi_phat_sinh_ly_do
    `;

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienKhauTru,
      LOAI_KHAU_TRU_COC,
      lyDoPhatSinh || "Khấu trừ tiền cọc"
    );

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienHoanCoc,
      LOAI_HOAN_COC,
      ghiChuThanhLy
    );

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienPhuThu,
      LOAI_PHU_THU,
      lyDoPhatSinh || "Phụ thu khi thanh lý"
    );

    for (const anh of danhSachAnh) {
      await tx.$executeRaw`
        INSERT INTO tep_don_thue (
          don_thue_id,
          muc_dich_id,
          ten_file_goc,
          file_url,
          loai_file,
          kich_thuoc_file,
          uploaded_by,
          uploaded_at
        )
        VALUES (
          ${donThueId}::uuid,
          ${MUC_DICH_ANH_KHI_TRA},
          ${anh.ten_file_goc},
          ${anh.file_url},
          ${anh.loai_file},
          ${anh.kich_thuoc_file},
          ${nguoiDungId}::uuid,
          NOW()
        )
      `;
    }

    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET
        trang_thai = ${THIET_BI_SAN_SANG},
        updated_at = NOW()
      WHERE id IN (
        SELECT bgvp.thiet_bi_id
        FROM ban_giao_vat_pham bgvp

        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id

        WHERE ctdt.don_thue_id = ${donThueId}::uuid
          AND bgvp.thiet_bi_id IS NOT NULL
      )
    `;

    return {
      don_thue: donCapNhat[0],
      tien_coc_da_thanh_toan: tienCocDaThanhToan,
      tien_hoan_coc: tienHoanCoc,
      tien_khau_tru: tienKhauTru,
      tien_phu_thu: tienPhuThu,
      tong_phi_phat_sinh: tongPhiPhatSinh,
      so_anh_khi_tra: danhSachAnh.length,
    };
  });

  return ketQua;
}

/*
  CẬP NHẬT THANH LÝ

  Có 2 kiểu dùng:
  1. Chỉ sửa ghi chú / lý do:
     body = {
       ghi_chu_thanh_ly,
       phi_phat_sinh_ly_do
     }

  2. Sửa lại tiền xử lý cọc:
     body = {
       hinh_thuc_xu_ly_coc,
       so_tien,
       phi_phat_sinh_ly_do
     }
*/

/*
async function capNhatThanhLyService(nguoiDungId, donThueId, body) {
  const danhSachDon = await prisma.$queryRaw`
    SELECT
      id,
      ma_don,
      phien_thanh_toan_id,
      trang_thai
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  const donThue = danhSachDon[0];

  if (Number(donThue.trang_thai) !== TRANG_THAI_HOAN_THANH) {
    throw new Error("Chỉ được cập nhật đơn đã thanh lý");
  }

  const coSuaTien = !!body.hinh_thuc_xu_ly_coc;

  if (!coSuaTien) {
    const ghiChuThanhLy = body.ghi_chu_thanh_ly
      ? body.ghi_chu_thanh_ly.trim()
      : "";

    const lyDoPhatSinh = body.phi_phat_sinh_ly_do
      ? body.phi_phat_sinh_ly_do.trim()
      : null;

    await prisma.$executeRaw`
      UPDATE don_thue
      SET
        ghi_chu_thanh_ly = ${ghiChuThanhLy},
        phi_phat_sinh_ly_do = ${lyDoPhatSinh},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    return {
      message: "Cập nhật ghi chú thanh lý thành công",
    };
  }

  const hinhThuc = body.hinh_thuc_xu_ly_coc;
  const soTienNhap = Number(body.so_tien || 0);

  const lyDoPhatSinh = body.phi_phat_sinh_ly_do
    ? body.phi_phat_sinh_ly_do.trim()
    : null;

  if (
    hinhThuc !== "HOAN_COC" &&
    hinhThuc !== "KHAU_TRU_COC" &&
    hinhThuc !== "PHU_THU"
  ) {
    throw new Error("Vui lòng chọn hình thức xử lý cọc");
  }

  if (hinhThuc !== "HOAN_COC") {
    if (soTienNhap <= 0) {
      throw new Error("Vui lòng nhập số tiền khấu trừ/phụ thu");
    }

    if (!lyDoPhatSinh) {
      throw new Error("Vui lòng nhập lý do phát sinh");
    }
  }

  const ketQua = await prisma.$transaction(async (tx) => {
    const tienCocDaThanhToan = await layTienCocDaThanhToan(tx, donThueId);

    if (tienCocDaThanhToan <= 0) {
      throw new Error("Đơn này chưa có tiền cọc đã thanh toán");
    }

    let tienHoanCoc = 0;
    let tienKhauTru = 0;
    let tienPhuThu = 0;
    let tongPhiPhatSinh = 0;

    if (hinhThuc === "HOAN_COC") {
      tienHoanCoc = tienCocDaThanhToan;
    }

    if (hinhThuc === "KHAU_TRU_COC") {
      if (soTienNhap > tienCocDaThanhToan) {
        throw new Error(
          "Số tiền khấu trừ không được lớn hơn tiền cọc. Nếu vượt cọc thì chọn phụ thu"
        );
      }

      tienKhauTru = soTienNhap;
      tienHoanCoc = tienCocDaThanhToan - soTienNhap;
      tongPhiPhatSinh = tienKhauTru;
    }

    if (hinhThuc === "PHU_THU") {
      tienKhauTru = tienCocDaThanhToan;
      tienPhuThu = soTienNhap;
      tongPhiPhatSinh = tienCocDaThanhToan + soTienNhap;
    }

    await tx.$executeRaw`
      DELETE FROM thanh_toan
      WHERE don_thue_id = ${donThueId}::uuid
        AND loai_dong_tien_id IN (
          ${LOAI_HOAN_COC},
          ${LOAI_KHAU_TRU_COC},
          ${LOAI_PHU_THU}
        )
    `;

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienKhauTru,
      LOAI_KHAU_TRU_COC,
      lyDoPhatSinh || "Khấu trừ tiền cọc"
    );

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienHoanCoc,
      LOAI_HOAN_COC,
      "Cập nhật hoàn cọc"
    );

    await taoDongTien(
      tx,
      donThue,
      nguoiDungId,
      tienPhuThu,
      LOAI_PHU_THU,
      lyDoPhatSinh || "Phụ thu khi thanh lý"
    );

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        phi_phat_sinh_tien = ${tongPhiPhatSinh},
        phi_phat_sinh_ly_do = ${lyDoPhatSinh},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    return {
      tien_coc_da_thanh_toan: tienCocDaThanhToan,
      tien_hoan_coc: tienHoanCoc,
      tien_khau_tru: tienKhauTru,
      tien_phu_thu: tienPhuThu,
      tong_phi_phat_sinh: tongPhiPhatSinh,
    };
  });

  return {
    message: "Cập nhật thanh lý thành công",
    data: ketQua,
  };
}
*/

/*
  HỦY THANH LÝ

  Khi hủy:
  - Xóa dòng tiền hoàn cọc / khấu trừ / phụ thu.
  - Xóa ảnh khi trả.
  - Đưa đơn từ Hoàn thành về Đang thuê.
  - Đưa thiết bị vật lý từ Sẵn sàng về Đang thuê.
*/

/*
async function huyThanhLyService(donThueId) {
  const danhSachDon = await prisma.$queryRaw`
    SELECT
      id,
      ma_don,
      trang_thai
    FROM don_thue
    WHERE id = ${donThueId}::uuid
    LIMIT 1
  `;

  if (danhSachDon.length === 0) {
    throw new Error("Không tìm thấy đơn thuê");
  }

  const donThue = danhSachDon[0];

  if (Number(donThue.trang_thai) !== TRANG_THAI_HOAN_THANH) {
    throw new Error("Chỉ được hủy thanh lý với đơn đã hoàn thành");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM thanh_toan
      WHERE don_thue_id = ${donThueId}::uuid
        AND loai_dong_tien_id IN (
          ${LOAI_HOAN_COC},
          ${LOAI_KHAU_TRU_COC},
          ${LOAI_PHU_THU}
        )
    `;

    await tx.$executeRaw`
      DELETE FROM tep_don_thue
      WHERE don_thue_id = ${donThueId}::uuid
        AND muc_dich_id = ${MUC_DICH_ANH_KHI_TRA}
    `;

    await tx.$executeRaw`
      UPDATE don_thue
      SET
        tra_luc = NULL,
        nguoi_nhan_tra_id = NULL,
        ghi_chu_thanh_ly = NULL,
        phi_phat_sinh_tien = 0,
        phi_phat_sinh_ly_do = NULL,
        trang_thai = ${TRANG_THAI_DANG_THUE},
        updated_at = NOW()
      WHERE id = ${donThueId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET
        trang_thai = ${THIET_BI_DANG_THUE},
        updated_at = NOW()
      WHERE id IN (
        SELECT bgvp.thiet_bi_id
        FROM ban_giao_vat_pham bgvp

        JOIN chi_tiet_don_thue ctdt
          ON ctdt.id = bgvp.chi_tiet_don_thue_id

        WHERE ctdt.don_thue_id = ${donThueId}::uuid
          AND bgvp.thiet_bi_id IS NOT NULL
      )
    `;
  });

  return {
    message: "Hủy thanh lý thành công",
  };
}
*/

module.exports = {
  layDanhSachThanhLyService,
  layChiTietThanhLyService,
  lapPhieuTraService,

  // capNhatThanhLyService,
  // huyThanhLyService,
};