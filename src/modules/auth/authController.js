const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const authService = require("./authService");

const register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return errorResponse(res, 400, "Vui lòng điền đầy đủ họ tên, email và mật khẩu");
  }

  if (password.length < 6) {
    return errorResponse(res, 400, "Mật khẩu phải có ít nhất 6 ký tự");
  }

  const user = await authService.register({ fullName, email, phone, password });

  return successResponse(res, 201, "Đăng ký tài khoản thành công", {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 400, "Vui lòng điền email và mật khẩu");
  }

  const result = await authService.login({ email, password });

  return successResponse(res, 200, "Đăng nhập thành công", result);
});

module.exports = {
  register,
  login,
};
