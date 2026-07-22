const {
  layDanhSachMauThietBiAdminService,
  layChiTietMauThietBiAdminService,
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
  layDanhSachBoDiKemAdminService,
  layGoiYBoDiKemAdminService,
  taoBoDiKemAdminService,
  xoaBoDiKemAdminService,
} = require("../../models/EquipmentModelModel");

function guiLoi(res, loi) {
  if (
    loi.message === "Không tìm thấy mẫu thiết bị" ||
    loi.message === "Không tìm thấy món trong bộ đi kèm"
  ) {
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

async function layDanhSachMauThietBiAdmin(req, res) {
  try {
    const data = await layDanhSachMauThietBiAdminService();

    res.json({
      success: true,
      message: "Lấy danh sách mẫu thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layChiTietMauThietBiAdmin(req, res) {
  try {
    const data = await layChiTietMauThietBiAdminService(req.params.id);

    res.json({
      success: true,
      message: "Lấy chi tiết mẫu thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoMauThietBiAdmin(req, res) {
  try {
    const data = await taoMauThietBiAdminService(req.body || {}, req.file);

    res.status(201).json({
      success: true,
      message: "Thêm mẫu thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatMauThietBiAdmin(req, res) {
  try {
    const data = await capNhatMauThietBiAdminService(
      req.params.id,
      req.body || {},
      req.file
    );

    res.json({
      success: true,
      message: "Cập nhật mẫu thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiMauThietBiAdmin(req, res) {
  try {
    const data = await capNhatTrangThaiMauThietBiAdminService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện mẫu thiết bị thành công"
          : "Ẩn mẫu thiết bị thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachBoDiKemAdmin(req, res) {
  try {
    const data = await layDanhSachBoDiKemAdminService(req.params.id);

    res.json({
      success: true,
      message: "Lấy bộ đi kèm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layGoiYBoDiKemAdmin(req, res) {
  try {
    const data = await layGoiYBoDiKemAdminService(
      req.params.id,
      req.query || {}
    );

    res.json({
      success: true,
      message: "Lấy gợi ý bộ đi kèm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoBoDiKemAdmin(req, res) {
  try {
    const data = await taoBoDiKemAdminService(req.params.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm món vào bộ đi kèm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaBoDiKemAdmin(req, res) {
  try {
    const data = await xoaBoDiKemAdminService(
      req.params.id,
      req.params.bundleId
    );

    res.json({
      success: true,
      message: data.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachMauThietBiAdmin,
  layChiTietMauThietBiAdmin,
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
  layDanhSachBoDiKemAdmin,
  layGoiYBoDiKemAdmin,
  taoBoDiKemAdmin,
  xoaBoDiKemAdmin,
};
