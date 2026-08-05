const {
  layDanhSachNhuCauService,
  taoNhuCauService,
  capNhatNhuCauService,
  capNhatTrangThaiNhuCauService,
} = require("../../models/EquipmentNeedModel");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy nhu cầu") {
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

async function layDanhSachNhuCau(req, res) {
  try {
    const data = await layDanhSachNhuCauService();

    res.json({
      success: true,
      message: "Lấy danh sách nhu cầu thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoNhuCau(req, res) {
  try {
    const data = await taoNhuCauService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm nhu cầu thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatNhuCau(req, res) {
  try {
    const data = await capNhatNhuCauService(
      req.params.needId,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật nhu cầu thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiNhuCau(req, res) {
  try {
    const data = await capNhatTrangThaiNhuCauService(
      req.params.needId,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện nhu cầu thành công"
          : "Ẩn nhu cầu thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachNhuCau,
  taoNhuCau,
  capNhatNhuCau,
  capNhatTrangThaiNhuCau,
};
