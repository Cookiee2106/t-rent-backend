const {
  layDanhSachThietBiVatLyService,
  layChiTietThietBiVatLyService,
  themThietBiVatLyService,
  capNhatThietBiVatLyService,
  capNhatTrangThaiThietBiVatLyService,
  xoaMemThietBiVatLyService,
} = require("../../models/AssetModel");

async function layDanhSachThietBiVatLy(req, res) {
  try {
    const data = await layDanhSachThietBiVatLyService();

    res.json({
      success: true,
      message: "Lấy danh sách thiết bị vật lý thành công",
      data,
    });
  } catch (loi) {
    res.status(500).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietThietBiVatLy(req, res) {
  try {
    const data = await layChiTietThietBiVatLyService(req.params.id);

    res.json({
      success: true,
      message: "Lấy chi tiết thiết bị vật lý thành công",
      data,
    });
  } catch (loi) {
    res.status(404).json({
      success: false,
      message: loi.message,
    });
  }
}

async function themThietBiVatLy(req, res) {
  try {
    const data = await themThietBiVatLyService(req.body || {});

    res.status(201).json({
      success: true,
      message: "Thêm thiết bị vật lý thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function capNhatThietBiVatLy(req, res) {
  try {
    const data = await capNhatThietBiVatLyService(req.params.id, req.body || {});

    res.json({
      success: true,
      message: "Cập nhật thiết bị vật lý thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function capNhatTrangThaiThietBiVatLy(req, res) {
  try {
    const data = await capNhatTrangThaiThietBiVatLyService(
      req.params.id,
      req.body.trang_thai
    );

    res.json({
      success: true,
      message: "Cập nhật trạng thái thiết bị thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function xoaMemThietBiVatLy(req, res) {
  try {
    const data = await xoaMemThietBiVatLyService(req.params.id);

    res.json({
      success: true,
      message: "Xóa thiết bị vật lý thành công",
      data,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  layDanhSachThietBiVatLy,
  layChiTietThietBiVatLy,
  themThietBiVatLy,
  capNhatThietBiVatLy,
  capNhatTrangThaiThietBiVatLy,
  xoaMemThietBiVatLy,
};
