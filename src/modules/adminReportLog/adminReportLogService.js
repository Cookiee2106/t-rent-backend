const {
  layBaoCaoDoanhThuRepository,
  layBaoCaoTonKhoRepository,
  layDanhSachNhatKyThaoTacRepository,
  layChiTietNhatKyThaoTacRepository,
} = require("../../repositories/adminReportLogRepository");

const CAC_LOAI_THAO_TAC = ["THANH_TOAN_COC", "NHAN_TIEN_THUE", "THANH_LY"];

function chuanHoaIdLoc(giaTri) {
  if (!giaTri || giaTri === "0") return null;
  return giaTri;
}

function kiemTraKhoangNgay(tuNgay, denNgay) {
  if ((tuNgay && !denNgay) || (!tuNgay && denNgay)) {
    throw new Error("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc");
  }

  if (!tuNgay && !denNgay) {
    return;
  }

  const ngayBatDau = new Date(tuNgay);
  const ngayKetThuc = new Date(denNgay);

  if (Number.isNaN(ngayBatDau.getTime()) || Number.isNaN(ngayKetThuc.getTime())) {
    throw new Error("Ngày bắt đầu hoặc ngày kết thúc không hợp lệ");
  }

  if (ngayBatDau > ngayKetThuc) {
    throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc");
  }
}

async function layBaoCaoDoanhThuService(query = {}) {
  const tuNgay = query.from || null;
  const denNgay = query.to || null;

  kiemTraKhoangNgay(tuNgay, denNgay);

  return layBaoCaoDoanhThuRepository({ tuNgay, denNgay });
}

async function layBaoCaoTonKhoService(query = {}) {
  return layBaoCaoTonKhoRepository({
    hangId: chuanHoaIdLoc(query.hang_id),
    danhMucId: chuanHoaIdLoc(query.danh_muc_id),
  });
}

async function layDanhSachNhatKyThaoTacService(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const loaiThaoTac = query.loai_thao_tac || null;
  const from = query.from || null;
  const to = query.to || null;

  if (loaiThaoTac && !CAC_LOAI_THAO_TAC.includes(loaiThaoTac)) {
    throw new Error("Loại thao tác không hợp lệ");
  }

  kiemTraKhoangNgay(from, to);

  return layDanhSachNhatKyThaoTacRepository({
    page,
    limit,
    loaiThaoTac,
    from,
    to,
  });
}

async function layChiTietNhatKyThaoTacService(id) {
  if (!id) {
    throw new Error("Thiếu id thao tác");
  }

  return layChiTietNhatKyThaoTacRepository(id);
}

module.exports = {
  layBaoCaoDoanhThuService,
  layBaoCaoTonKhoService,
  layDanhSachNhatKyThaoTacService,
  layChiTietNhatKyThaoTacService,
};
