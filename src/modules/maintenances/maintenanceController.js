const {
  layDanhSachHoSoBaoTriService,
  layChiTietHoSoBaoTriService,
  taoHoSoBaoTriTuThietBiService,
  capNhatKetQuaBaoTriService,
} = require("../../models/MaintenanceModel");

function layNguoiDungId(req) {
  return req.nguoiDung?.id || req.user?.id || req.user?.userId || null;
}

async function layDanhSachHoSoBaoTri(req, res) {
  try {
    const ketQua = await layDanhSachHoSoBaoTriService(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách bảo trì thành công",
      ...ketQua,
    });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

async function layChiTietHoSoBaoTri(req, res) {
  try {
    const data = await layChiTietHoSoBaoTriService(req.params.id);

    res.json({
      success: true,
      message: "Lấy chi tiết bảo trì thành công",
      data,
    });
  } catch (loi) {
    res.status(404).json({ success: false, message: loi.message });
  }
}

async function taoHoSoBaoTriTuThietBi(req, res) {
  try {
    const data = await taoHoSoBaoTriTuThietBiService(
      req.params.id,
      req.body,
      layNguoiDungId(req)
    );

    res.status(201).json({
      success: true,
      message: "Tạo phiếu bảo trì thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

async function capNhatKetQuaBaoTri(req, res) {
  try {
    const data = await capNhatKetQuaBaoTriService(req.params.id, req.body);

    res.json({
      success: true,
      message: "Cập nhật kết quả bảo trì thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({ success: false, message: loi.message });
  }
}

module.exports = {
  layDanhSachHoSoBaoTri,
  layChiTietHoSoBaoTri,
  taoHoSoBaoTriTuThietBi,
  capNhatKetQuaBaoTri,
};
