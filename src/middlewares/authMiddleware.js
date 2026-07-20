const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "123456";

function xacThucDangNhap(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Chưa đăng nhập",
      });
    }

    const token = header.split(" ")[1];

    const nguoiDung = jwt.verify(token, JWT_SECRET);

    req.nguoiDung = nguoiDung;

    next();
  } catch (loi) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
}

module.exports = xacThucDangNhap;