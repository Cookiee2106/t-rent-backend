const {
  layDanhSachNgamService,
  taoNgamService,
  capNhatNgamService,
  capNhatTrangThaiNgamService,
} = require("../../models/EquipmentMountModel");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy ngàm") {
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

async function layDanhSachNgam(req, res) {
  try {
    const data = await layDanhSachNgamService();

    res.json({
      success: true,
      message: "Lấy danh sách ngàm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoNgam(req, res) {
  try {
    const data = await taoNgamService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm ngàm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatNgam(req, res) {
  try {
    const data = await capNhatNgamService(
      req.params.mountId,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật ngàm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiNgam(req, res) {
  try {
    const data = await capNhatTrangThaiNgamService(
      req.params.mountId,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện ngàm thành công"
          : "Ẩn ngàm thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachNgam,
  taoNgam,
  capNhatNgam,
  capNhatTrangThaiNgam,
};
