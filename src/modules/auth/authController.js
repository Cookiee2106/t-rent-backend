const {
  dangKyService,
  dangNhapService,
  layNguoiDungHienTaiService,
} = require("./authService");

// Đăng ký khách hàng
async function dangKy(req, res) {
  try {
    const { ho_ten, email, so_dien_thoai, mat_khau, xac_nhan_mat_khau } =
      req.body;

    if (!ho_ten || !email || !so_dien_thoai || !mat_khau || !xac_nhan_mat_khau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    if (mat_khau !== xac_nhan_mat_khau) {
      return res.status(400).json({
        success: false,
        message: "Xác nhận mật khẩu không khớp",
      });
    }

    const nguoiDung = await dangKyService(req.body);

    res.json({
      success: true,
      message: "Đăng ký thành công",
      data: nguoiDung,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Đăng nhập
async function dangNhap(req, res) {
  try {
    const { email, mat_khau } = req.body;

    if (!email || !mat_khau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const ketQua = await dangNhapService(req.body);

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token: ketQua.token,
      data: ketQua.nguoiDung,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

// Lấy thông tin người dùng hiện tại
async function layNguoiDungHienTai(req, res) {
  try {
    const nguoiDung = await layNguoiDungHienTaiService(req.nguoiDung.id);

    res.json({
      success: true,
      message: "Lấy thông tin thành công",
      data: nguoiDung,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  dangKy,
  dangNhap,
  layNguoiDungHienTai,
};