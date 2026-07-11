// Import service xử lý đơn cá nhân.
const {
  layDanhSachDonCuaToiService,
  layChiTietDonCuaToiService,
  huyDonCuaToiService,
} = require("./customerOrderService");

// Controller lấy danh sách đơn cá nhân.
// URL: GET /api/me/orders
async function layDanhSachDonCuaToi(req, res) {
  try {
    // Lấy id người dùng từ middleware auth.
    const nguoiDungId = req.nguoiDung.id;

    // Gọi service lấy danh sách đơn.
    const danhSach = await layDanhSachDonCuaToiService(nguoiDungId);

    // Trả kết quả thành công.
    res.json({
      success: true,
      message: "Lấy danh sách đơn thuê thành công",
      data: danhSach,
    });
  } catch (loi) {
    // Trả lỗi cho Postman/Frontend.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Controller lấy chi tiết đơn cá nhân.
// URL: GET /api/me/orders/:id
async function layChiTietDonCuaToi(req, res) {
  try {
    // Lấy id người dùng từ token.
    const nguoiDungId = req.nguoiDung.id;

    // Lấy id đơn thuê từ URL params.
    const donThueId = req.params.id;

    // Gọi service lấy chi tiết.
    const chiTiet = await layChiTietDonCuaToiService(nguoiDungId, donThueId);

    // Trả kết quả thành công.
    res.json({
      success: true,
      message: "Lấy chi tiết đơn thuê thành công",
      data: chiTiet,
    });
  } catch (loi) {
    // Nếu không tìm thấy đơn thì trả 404.
    if (loi.message === "Không tìm thấy đơn thuê") {
      return res.status(404).json({
        success: false,
        message: loi.message,
      });
    }

    // Lỗi nghiệp vụ khác trả 400.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Controller hủy đơn cá nhân.
// URL: PATCH hoặc POST /api/me/orders/:id/cancel
async function huyDonCuaToi(req, res) {
  try {
    // Lấy id người dùng từ token.
    const nguoiDungId = req.nguoiDung.id;

    // Lấy id đơn thuê từ URL params.
    const donThueId = req.params.id;

    // Gọi service hủy đơn.
    const ketQua = await huyDonCuaToiService(
      nguoiDungId,
      donThueId,
      req.body || {}
    );

    // Trả kết quả thành công.
    res.json({
      success: true,
      message: "Hủy đơn thuê thành công",
      data: ketQua,
    });
  } catch (loi) {
    // Nếu không tìm thấy đơn thì trả 404.
    if (loi.message === "Không tìm thấy đơn thuê") {
      return res.status(404).json({
        success: false,
        message: loi.message,
      });
    }

    // Lỗi nghiệp vụ khác trả 400.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Export controller để routes dùng.
module.exports = {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  huyDonCuaToi,
};