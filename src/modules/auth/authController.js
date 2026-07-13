const {
  dangKyService,
  dangNhapService,
  layThongTinCuaToiService,
} = require("./authService");

async function dangKy(req, res) {
  try {
    const {
      ho_ten,
      email,
      so_dien_thoai,
      mat_khau,
      xac_nhan_mat_khau,
    } = req.body;

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

    if (!/^0[0-9]{9}$/.test(so_dien_thoai)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ",
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

async function dangNhap(req, res) {
  try {
    const { email, mat_khau } = req.body;
    if (!email || !mat_khau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu",
      });
    }

    const ketQua = await dangNhapService(email, mat_khau);
    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: ketQua,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function layThongTinCuaToi(req, res) {
  try {
    const nguoiDung = await layThongTinCuaToiService(req.nguoiDung.id);
    res.json({
      success: true,
      message: "Lấy thông tin tài khoản thành công",
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
  layThongTinCuaToi,
};