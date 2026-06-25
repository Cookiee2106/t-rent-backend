const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const authService = require("./authService");

const register = asyncHandler(async (req, res) => {
  const { ho_ten, email, so_dien_thoai, mat_khau } = req.body;

  if (!ho_ten || !email || !mat_khau) {
    return errorResponse(res, 400, "Vui lòng điền đầy đủ họ tên, email và mật khẩu");
  }

  if (mat_khau.length < 6) {
    return errorResponse(res, 400, "Mật khẩu phải có ít nhất 6 ký tự");
  }

  const nguoi_dung = await authService.register({ ho_ten, email, so_dien_thoai, mat_khau });

  return successResponse(res, 201, "Đăng ký tài khoản thành công", nguoi_dung);
});

const login = asyncHandler(async (req, res) => {
  const { email, mat_khau } = req.body;

  if (!email || !mat_khau) {
    return errorResponse(res, 400, "Vui lòng điền email và mật khẩu");
  }

  const ket_qua = await authService.login({ email, mat_khau });

  return successResponse(res, 200, "Đăng nhập thành công", ket_qua);
});

module.exports = {
  register,
  login,
};
