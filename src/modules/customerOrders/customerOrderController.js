const {
  layDanhSachDonCuaToiService,
  layChiTietDonCuaToiService,
  huyDonCuaToiService,
} = require("./customerOrderService");

function guiLoi(res, loi) {
  const statusCode = loi.message === "Không tìm thấy đơn thuê" ? 404 : 400;

  return res.status(statusCode).json({
    success: false,
    message: loi.message,
  });
}

async function layDanhSachDonCuaToi(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const danhSach = await layDanhSachDonCuaToiService(nguoiDungId);

    res.json({
      success: true,
      message: "Lấy danh sách đơn thuê thành công",
      data: danhSach,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layChiTietDonCuaToi(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const donThueId = req.params.id;

    const chiTiet = await layChiTietDonCuaToiService(nguoiDungId, donThueId);

    res.json({
      success: true,
      message: "Lấy chi tiết đơn thuê thành công",
      data: chiTiet,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function huyDonCuaToi(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const donThueId = req.params.id;

    const ketQua = await huyDonCuaToiService(
      nguoiDungId,
      donThueId,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Hủy đơn thuê thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  huyDonCuaToi,
};
