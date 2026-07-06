const express = require("express");
const {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  checkout
} = require("./cart.Controller");
const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

// All cart routes require authentication
router.use(xacThucDangNhap);

router.get("/", getCart);
router.post("/items", addToCart);
router.patch("/items/:id", updateCartItem);
router.delete("/items/:id", deleteCartItem);
router.post("/checkout", checkout);

module.exports = router;