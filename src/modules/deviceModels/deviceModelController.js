const {
  layDanhSachMauThietBiService,
} = require("./deviceModelService");

async function layDanhSachMauThietBi(req, res) {
  try {
    const gioiHan = req.query.limit || 4;

    const danhSachMauThietBi = await layDanhSachMauThietBiService(gioiHan);

    res.json({
      success: true,
      message: "Lấy danh sách mẫu thiết bị thành công",
      data: danhSachMauThietBi,
    });
  } catch (loi) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách mẫu thiết bị",
    });
  }
}

module.exports = {
  layDanhSachMauThietBi,
};