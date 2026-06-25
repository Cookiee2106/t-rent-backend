const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const cartService = require("./cartService");

// ============================================================
// HELPER: Kiểm tra field không hợp lệ trong body
// ============================================================
function co_field_khong_hop_le(body, cac_field_cho_phep) {
  const cac_field_trong_body = Object.keys(body || {});
  return cac_field_trong_body.some((field) => !cac_field_cho_phep.includes(field));
}

// ============================================================
// Thêm sản phẩm vào giỏ hàng
// ============================================================
const addCartItem = asyncHandler(async (req, res) => {
  const { mau_thiet_bi_id, so_luong, ngay_nhan, ngay_tra } = req.body;

  // Chỉ cho phép field tiếng Việt
  if (co_field_khong_hop_le(req.body, ["mau_thiet_bi_id", "so_luong", "ngay_nhan", "ngay_tra"])) {
    return errorResponse(res, 400, "Field không hợp lệ, vui lòng dùng đúng field tiếng Việt");
  }

  if (!mau_thiet_bi_id || !so_luong || !ngay_nhan || !ngay_tra) {
    return errorResponse(res, 400, "Vui lòng điền đầy đủ thông tin");
  }

  const so_luong_su_dung = Number(so_luong);

  if (!Number.isInteger(so_luong_su_dung) || so_luong_su_dung < 1) {
    return errorResponse(res, 400, "Số lượng phải là số nguyên lớn hơn 0");
  }

  const chi_tiet_gio_hang = await cartService.addCartItem(req.user.id, {
    mau_thiet_bi_id,
    so_luong: so_luong_su_dung,
    ngay_nhan,
    ngay_tra,
  });

  return successResponse(res, 201, "Thêm sản phẩm vào giỏ hàng thành công", chi_tiet_gio_hang);
});

// ============================================================
// Lấy giỏ hàng
// ============================================================
const getCart = asyncHandler(async (req, res) => {
  const gio_hang = await cartService.getCart(req.user.id);

  return successResponse(res, 200, "Lấy giỏ hàng thành công", gio_hang);
});

// ============================================================
// Xóa sản phẩm khỏi giỏ hàng
// ============================================================
const removeCartItem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ket_qua = await cartService.removeCartItem(req.user.id, id);

  return successResponse(res, 200, ket_qua.message);
});

module.exports = {
  addCartItem,
  getCart,
  removeCartItem,
};
