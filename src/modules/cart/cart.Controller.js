const {
  getCartService,
  addToCartService,
  updateCartItemService,
  deleteCartItemService,
  checkoutService
} = require("./cart.Service");

// 1. View Cart
async function getCart(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const cart = await getCartService(khachHangId);

    res.json({
      success: true,
      message: "Lấy giỏ hàng thành công",
      data: cart
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// 2. Add Item to Cart
async function addToCart(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const result = await addToCartService(khachHangId, req.body);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// 3. Update Cart Item
async function updateCartItem(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;
    const result = await updateCartItemService(khachHangId, itemId, req.body);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// 4. Delete Cart Item
async function deleteCartItem(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const itemId = req.params.id;
    const result = await deleteCartItemService(khachHangId, itemId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// 5. Checkout Cart Items
async function checkout(req, res) {
  try {
    const khachHangId = req.nguoiDung.id;
    const result = await checkoutService(khachHangId, req.body);

    res.json({
      success: true,
      message: "Đặt hàng và tạo phiên thanh toán thành công",
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  checkout
};
