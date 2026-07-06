const jwt = require("jsonwebtoken");

function xacThucDangNhap(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    const token = header.split(" ")[1];

    const nguoiDung = jwt.verify(token, process.env.JWT_SECRET || "123456");

    req.nguoiDung = nguoiDung;

    next();
  } catch (loi) {
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
}

module.exports = xacThucDangNhap;