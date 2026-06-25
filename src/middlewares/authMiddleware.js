const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/response");

function authMiddleware(req, res, next) {
  const tieu_de_xac_thuc = req.headers.authorization;

  if (!tieu_de_xac_thuc || !tieu_de_xac_thuc.startsWith("Bearer ")) {
    return errorResponse(res, 401, "Vui lòng đăng nhập để tiếp tục");
  }

  const token = tieu_de_xac_thuc.split(" ")[1];

  try {
    const du_lieu_token = jwt.verify(token, process.env.JWT_SECRET);

    if (!du_lieu_token.vai_tro) {
      return errorResponse(res, 401, "Token không hợp lệ");
    }

    req.user = {
      id: du_lieu_token.id,
      email: du_lieu_token.email,
      vai_tro: du_lieu_token.vai_tro,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    }
    return errorResponse(res, 401, "Token không hợp lệ");
  }
}

module.exports = authMiddleware;
