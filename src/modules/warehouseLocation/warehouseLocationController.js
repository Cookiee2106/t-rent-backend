const {
  layDanhSachViTriKhoService,
  layDanhSachViTriKhoDangHienThiService,
  layDanhSachViTriPhuKienKhaDungService,
  taoViTriKhoService,
  capNhatViTriKhoService,
  capNhatTrangThaiViTriKhoService,
  xoaMemViTriKhoService,
} = require("../../models/WarehouseLocationModel");

function guiLoi(res, loi) {
  if (loi.message === "Không tìm thấy vị trí kho") {
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

async function layDanhSachViTriKho(req, res) {
  try {
    const data = await layDanhSachViTriKhoService();

    res.json({
      success: true,
      message: "Lấy danh sách vị trí kho thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layDanhSachViTriKhoDangHienThi(req, res) {
  try {
    const phuKienId = String(req.query.phu_kien_id || "").trim();

    const data = phuKienId
      ? await layDanhSachViTriPhuKienKhaDungService(phuKienId)
      : await layDanhSachViTriKhoDangHienThiService();

    res.json({
      success: true,
      message: phuKienId
        ? "Lấy danh sách vị trí còn phụ kiện thành công"
        : "Lấy danh sách vị trí kho thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function taoViTriKho(req, res) {
  try {
    const data = await taoViTriKhoService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm vị trí kho thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatViTriKho(req, res) {
  try {
    const data = await capNhatViTriKhoService(req.params.id, req.body || {});

    res.json({
      success: true,
      message: "Cập nhật vị trí kho thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function capNhatTrangThaiViTriKho(req, res) {
  try {
    const data = await capNhatTrangThaiViTriKhoService(
      req.params.id,
      req.body || {}
    );

    res.json({
      success: true,
      message:
        Number(data.trang_thai) === 601
          ? "Hiện vị trí kho thành công"
          : "Ẩn vị trí kho thành công",
      data,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function xoaMemViTriKho(req, res) {
  try {
    const data = await xoaMemViTriKhoService(req.params.id);

    res.json({
      success: true,
      message: data.message,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachViTriKho,
  layDanhSachViTriKhoDangHienThi,
  taoViTriKho,
  capNhatViTriKho,
  capNhatTrangThaiViTriKho,
  xoaMemViTriKho,
};