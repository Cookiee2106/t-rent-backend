const {
  layDanhSachMauThietBiService,
  layChiTietMauThietBiService,
  layLuaChonBoLocService,
} = require("../../models/DeviceModelModel");

// Lấy nhu cầu và danh sách máy ảnh dùng cho bộ lọc.
async function layLuaChonBoLoc(req, res) {
  try {
    const data = await layLuaChonBoLocService();

    res.json({
      success: true,
      message: "Lấy dữ liệu bộ lọc thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layDanhSachMauThietBi(req, res) {
  try {
    const data = await layDanhSachMauThietBiService(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách mẫu thiết bị thành công",
      data,
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
    const data = await layChiTietMauThietBiService(req.params.id, req.query);

    res.json({
      success: true,
      message: "Lấy chi tiết mẫu thiết bị thành công",
      data,
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
  layLuaChonBoLoc,
  layDanhSachMauThietBi,
  layChiTietMauThietBi,
};
