const { errorResponse } = require("../utils/response");

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, "Vui lòng đăng nhập để tiếp tục");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, 403, "Bạn không có quyền truy cập chức năng này");
    }

    next();
  };
}

module.exports = roleMiddleware;
