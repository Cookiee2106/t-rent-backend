const {
  layDanhSachMauThietBiService,
} = require("./deviceModelService");

async function layDanhSachMauThietBi(req, res) {
  try {
    const danhSach = await layDanhSachMauThietBiService();
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

module.exports = {
  layDanhSachMauThietBi,
};