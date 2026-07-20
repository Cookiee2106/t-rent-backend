const {
  dangKyService,
  dangNhapService,
  layThongTinCuaToiService,
} = require("./authService");

function guiLoi(res, loi) {
  return res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function dangKy(req, res) {
  try {
    const nguoiDung = await dangKyService(req.body || {});

    res.json({
      success: true,
      message: "Đăng ký thành công",
      data: nguoiDung,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function dangNhap(req, res) {
  try {
    const ketQua = await dangNhapService(req.body || {});

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: ketQua,
    });
  } catch (loi) {
    guiLoi(res, loi);
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
    guiLoi(res, loi);
  }
}

module.exports = {
  dangKy,
  dangNhap,
  layThongTinCuaToi,
};