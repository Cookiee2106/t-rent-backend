const {
  layDanhSachDanhMucThietBiService,
} = require("./equipmentCategoryService");

async function layDanhSachDanhMucThietBi(req, res) {
  try {
    const danhSach = await layDanhSachDanhMucThietBiService();

    res.json({
      success: true,
      message: "Lấy danh sách danh mục thiết bị thành công",
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
  layDanhSachDanhMucThietBi,
};
