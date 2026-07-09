const {
  layDanhSachDonThueService,
  layChiTietDonThueService,
  layThietBiSanSangService,
  lapPhieuBanGiaoService,
  layFileDonThueService,
} = require("./orderService");

// GET /api/admin/orders
async function layDanhSachDonThue(req, res) {
  try {
    const { trang_thai, page = 1, limit = 20 } = req.query;
    const ketQua = await layDanhSachDonThueService({
      trang_thai: trang_thai ? Number(trang_thai) : null,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({ success: true, message: "Lấy danh sách đơn thuê thành công", ...ketQua });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// GET /api/admin/orders/:id
async function layChiTietDonThue(req, res) {
  try {
    const ketQua = await layChiTietDonThueService(req.params.id);

    res.json({ success: true, message: "Lấy chi tiết đơn thuê thành công", data: ketQua });
  } catch (loi) {
    res.status(404).json({ success: false, message: loi.message });
  }
}

// GET /api/admin/assets/available
async function layThietBiSanSang(req, res) {
  try {
    const { mau_thiet_bi_id, ngay_nhan, ngay_tra } = req.query;
    const ketQua = await layThietBiSanSangService({ mau_thiet_bi_id, ngay_nhan, ngay_tra });

    res.json({ success: true, message: "Lấy danh sách thiết bị khả dụng thành công", data: ketQua });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// POST /api/admin/orders/:id/handover
async function lapPhieuBanGiao(req, res) {
  try {
    const nhanVienId = req.nguoiDung.id;
    const { ghi_chu_ban_giao, vat_pham } = req.body;
    const ketQua = await lapPhieuBanGiaoService(nhanVienId, req.params.id, { ghi_chu_ban_giao, vat_pham }, req.files);

    res.json({ success: true, message: ketQua.message });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

// GET /api/admin/orders/:id/files
async function layFileDonThue(req, res) {
  try {
    const { muc_dich } = req.query;
    const ketQua = await layFileDonThueService(req.params.id, muc_dich || null);

    res.json({ success: true, message: "Lấy file đơn thuê thành công", data: ketQua });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

module.exports = {
  layDanhSachDonThue,
  layChiTietDonThue,
  layThietBiSanSang,
  lapPhieuBanGiao,
  layFileDonThue,
};
