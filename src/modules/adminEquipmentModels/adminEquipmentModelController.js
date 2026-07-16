const {
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
  layDanhSachBoDiKemAdminService,
  layGoiYBoDiKemAdminService,
  taoBoDiKemAdminService,
  xoaBoDiKemAdminService,
} = require("./adminEquipmentModelService");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy mẫu thiết bị") {
    return res.status(404).json({
      success: false,
      message: loi.message,
    });
  }

  if (loi.message === "KhÃ´ng tÃ¬m tháº¥y mÃ³n trong bá»™ Ä‘i kÃ¨m") {
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

async function taoMauThietBiAdmin(req, res) {
  try {
    const ketQua = await taoMauThietBiAdminService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm mẫu thiết bị thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatMauThietBiAdmin(req, res) {
  try {
    const ketQua = await capNhatMauThietBiAdminService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật mẫu thiết bị thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiMauThietBiAdmin(req, res) {
  try {
    const ketQua = await capNhatTrangThaiMauThietBiAdminService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật trạng thái mẫu thiết bị thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachBoDiKemAdmin(req, res) {
  try {
    const ketQua = await layDanhSachBoDiKemAdminService(req.params.id);

    res.json({
      success: true,
      message: "Lấy bộ đi kèm thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layGoiYBoDiKemAdmin(req, res) {
  try {
    const ketQua = await layGoiYBoDiKemAdminService(req.params.id, req.query || {});

    res.json({
      success: true,
      message: "Lấy gợi ý bộ đi kèm thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoBoDiKemAdmin(req, res) {
  try {
    const ketQua = await taoBoDiKemAdminService(req.params.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm món vào bộ đi kèm thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaBoDiKemAdmin(req, res) {
  try {
    const ketQua = await xoaBoDiKemAdminService(
      req.params.id,
      req.params.bundleId
    );

    res.json({
      success: true,
      message: ketQua.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
  layDanhSachBoDiKemAdmin,
  layGoiYBoDiKemAdmin,
  taoBoDiKemAdmin,
  xoaBoDiKemAdmin,
};
