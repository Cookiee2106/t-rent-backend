const {
  layDanhSachThanhLyService,
  layChiTietThanhLyService,
  lapPhieuTraService,

  // capNhatThanhLyService,
  // huyThanhLyService,
} = require("./settlementService");

async function layDanhSachThanhLy(req, res) {
  try {
    const danhSach = await layDanhSachThanhLyService();

    res.json({
      success: true,
      message: "Lấy danh sách thanh lý thành công",
      data: danhSach,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layChiTietThanhLy(req, res) {
  try {
    const donThueId = req.params.orderId;

    const chiTiet = await layChiTietThanhLyService(donThueId);

    res.json({
      success: true,
      message: "Lấy chi tiết thanh lý thành công",
      data: chiTiet,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function lapPhieuTra(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const donThueId = req.params.orderId;

    const ketQua = await lapPhieuTraService(
      nguoiDungId,
      donThueId,
      req.body || {},
      req.files || []
    );

    res.json({
      success: true,
      message: "Lập phiếu trả/thanh lý thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

/*
  CẬP NHẬT THANH LÝ - ĐANG COMMENT
*/
/*
async function capNhatThanhLy(req, res) {
  try {
    const nguoiDungId = req.nguoiDung.id;
    const donThueId = req.params.orderId;

    const ketQua = await capNhatThanhLyService(
      nguoiDungId,
      donThueId,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật thanh lý thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}
*/

/*
  HỦY THANH LÝ - ĐANG COMMENT
*/
/*
async function huyThanhLy(req, res) {
  try {
    const donThueId = req.params.orderId;

    const ketQua = await huyThanhLyService(donThueId);

    res.json({
      success: true,
      message: "Hủy thanh lý thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}
*/

module.exports = {
  layDanhSachThanhLy,
  layChiTietThanhLy,
  lapPhieuTra,

  // capNhatThanhLy,
  // huyThanhLy,
};