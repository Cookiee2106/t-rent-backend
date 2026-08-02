const {
  layDanhSachPhuKienAdminService,
  layChiTietPhuKienAdminService,
  taoPhuKienAdminService,
  capNhatPhuKienAdminService,
  doiTrangThaiPhuKienAdminService,
  xoaMemPhuKienAdminService,
} = require("../../models/AccessoryModel");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy phụ kiện") {
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

async function layDanhSachPhuKienAdmin(req, res) {
  try {
    const data = await layDanhSachPhuKienAdminService();

    res.json({
      success: true,
      message: "Lấy danh sách phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layChiTietPhuKienAdmin(req, res) {
  try {
    const data = await layChiTietPhuKienAdminService(req.params.id);

    res.json({
      success: true,
      message: "Lấy chi tiết phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoPhuKienAdmin(req, res) {
  try {
    const data = await taoPhuKienAdminService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatPhuKienAdmin(req, res) {
  try {
    const data = await capNhatPhuKienAdminService(req.params.id, req.body || {});

    res.json({
      success: true,
      message: "Cập nhật phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function doiTrangThaiPhuKienAdmin(req, res) {
  try {
    const data = await doiTrangThaiPhuKienAdminService(
      req.params.id,
      req.body || {}
    );

    const hanhDong = String(req.body?.hanh_dong || "")
      .trim()
      .toUpperCase();

    res.json({
      success: true,
      message:
        hanhDong === "AN"
          ? "Ẩn phụ kiện thành công"
          : "Hiện phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaMemPhuKienAdmin(req, res) {
  try {
    const data = await xoaMemPhuKienAdminService(req.params.id);

    res.json({
      success: true,
      message: "Xóa phụ kiện thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachPhuKienAdmin,
  layChiTietPhuKienAdmin,
  taoPhuKienAdmin,
  capNhatPhuKienAdmin,
  doiTrangThaiPhuKienAdmin,
  xoaMemPhuKienAdmin,
};
