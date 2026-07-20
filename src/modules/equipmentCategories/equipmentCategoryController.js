const {
  layDanhSachDanhMucThietBiService,
  layDanhSachDanhMucHienThiService,
  layDanhSachTinhChatDanhMucThietBiService,
  taoDanhMucThietBiService,
  capNhatDanhMucThietBiService,
  capNhatTrangThaiDanhMucThietBiService,
  xoaMemDanhMucThietBiService,
} = require("./equipmentCategoryService");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy danh mục thiết bị") {
    return res.status(404).json({
      success: false,
      message: loi.message,
    });
  }

  return res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function layDanhSachDanhMucThietBi(req, res) {
  try {
    const data = await layDanhSachDanhMucThietBiService();

    res.json({
      success: true,
      message: "Lấy danh sách danh mục thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachDanhMucHienThi(req, res) {
  try {
    const data = await layDanhSachDanhMucHienThiService(
      req.query.tinh_chat_id
    );

    res.json({
      success: true,
      message: "Lấy danh sách danh mục hiển thị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachTinhChatDanhMucThietBi(req, res) {
  try {
    const data = await layDanhSachTinhChatDanhMucThietBiService();

    res.json({
      success: true,
      message: "Lấy danh sách tính chất danh mục thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoDanhMucThietBi(req, res) {
  try {
    const data = await taoDanhMucThietBiService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm danh mục thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatDanhMucThietBi(req, res) {
  try {
    const data = await capNhatDanhMucThietBiService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật danh mục thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiDanhMucThietBi(req, res) {
  try {
    const data = await capNhatTrangThaiDanhMucThietBiService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện danh mục thiết bị thành công"
          : "Ẩn danh mục thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaMemDanhMucThietBi(req, res) {
  try {
    const data = await xoaMemDanhMucThietBiService(req.params.id);

    res.json({
      success: true,
      message: data.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachDanhMucThietBi,
  layDanhSachDanhMucHienThi,
  layDanhSachTinhChatDanhMucThietBi,
  taoDanhMucThietBi,
  capNhatDanhMucThietBi,
  capNhatTrangThaiDanhMucThietBi,
  xoaMemDanhMucThietBi,
};