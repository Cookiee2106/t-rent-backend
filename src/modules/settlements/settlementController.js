// Import các service xử lý nghiệp vụ thanh lý.
const {
  layDanhSachThanhLyService,
  layChiTietThanhLyService,
  lapPhieuTraService,
} = require("./settlementService");

// Controller lấy danh sách đơn thanh lý.
// API: GET /api/admin/settlements
async function layDanhSachThanhLy(req, res) {
  try {
    // Gọi service lấy danh sách đơn.
    const danhSach = await layDanhSachThanhLyService();

    // Trả kết quả thành công cho FE/Postman.
    res.json({
      success: true,
      message: "Lấy danh sách thanh lý thành công",
      data: danhSach,
    });
  } catch (loi) {
    // Nếu lỗi thì trả message lỗi.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Controller lấy chi tiết đơn thanh lý.
// API: GET /api/admin/settlements/:orderId
async function layChiTietThanhLy(req, res) {
  try {
    // Lấy id đơn thuê từ params trên URL.
    const donThueId = req.params.orderId;

    // Gọi service lấy chi tiết đơn thanh lý.
    const chiTiet = await layChiTietThanhLyService(donThueId);

    // Trả kết quả thành công.
    res.json({
      success: true,
      message: "Lấy chi tiết thanh lý thành công",
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

    // Các lỗi nghiệp vụ khác trả 400.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Controller lập phiếu trả / thanh lý.
// API: POST /api/admin/settlements/:orderId/return
async function lapPhieuTra(req, res) {
  try {
    // Lấy id nhân viên/quản trị từ token.
    const nguoiDungId = req.nguoiDung.id;

    // Lấy id đơn thuê từ params.
    const donThueId = req.params.orderId;

    // Gọi service lập phiếu trả.
    const ketQua = await lapPhieuTraService(
      nguoiDungId,
      donThueId,
      req.body || {},
      req.files || []
    );

    // Trả kết quả thành công.
    res.json({
      success: true,
      message: "Lập phiếu trả/thanh lý thành công",
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

    // Các lỗi nghiệp vụ khác trả 400.
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Export controller cho route dùng.
module.exports = {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,
};