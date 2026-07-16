const {
  taoMauThietBiAdminService,
  capNhatMauThietBiAdminService,
  capNhatTrangThaiMauThietBiAdminService,
} = require("./adminEquipmentModelService");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy mẫu thiết bị") {
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

module.exports = {
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
};
