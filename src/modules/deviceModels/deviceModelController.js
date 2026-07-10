const {
  layDanhSachMauThietBiService,
  layChiTietMauThietBiService,
} = require("./deviceModelService");

async function layDanhSachMauThietBi(req, res) {
  try {
    const danhSach = await layDanhSachMauThietBiService(req.query);
    res.json({
      success: true,
      message: "Lấy danh sách mẫu thiết bị thành công",
      data: danhSach,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietMauThietBi(req, res) {
  try {
    const id = req.params.id;
    const chiTiet = await layChiTietMauThietBiService(id, req.query);
    res.json({
      success: true,
      message: "Lấy chi tiết mẫu thiết bị thành công",
      data: chiTiet,
    });
  } catch (loi) {
    if (loi.message === "Không tìm thấy mẫu thiết bị") {
      return res.status(404).json({
        success: false,
        message: loi.message,
      });
    }
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  layDanhSachMauThietBi,
  layChiTietMauThietBi,
};