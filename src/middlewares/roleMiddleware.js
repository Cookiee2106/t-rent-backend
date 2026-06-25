const { errorResponse } = require("../utils/response");

function roleMiddleware(...cac_vai_tro_duoc_phep) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, "Vui lòng đăng nhập để tiếp tục");
    }

    const vai_tro = req.user.vai_tro;
    if (!cac_vai_tro_duoc_phep.includes(vai_tro)) {
      return errorResponse(res, 403, "Bạn không có quyền truy cập chức năng này");
    }

    next();
  };
}

module.exports = roleMiddleware;
