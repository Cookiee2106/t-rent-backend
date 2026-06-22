const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(res, 401, "Vui lòng đăng nhập để tiếp tục");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    }
    return errorResponse(res, 401, "Token không hợp lệ");
  }
}

module.exports = authMiddleware;
