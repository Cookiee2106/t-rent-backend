const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({
    message: "T-Rent API routes",
  });
});

router.use("/auth", require("../modules/auth/authRoutes"));
router.use("/customer", require("../modules/customer/customerRoutes"));
router.use("/admin", require("../modules/admin/adminRoutes"));
router.use("/device-models", require("../modules/deviceModels/deviceModelRoutes"));
router.use("/cart", require("../modules/cart/cartRoutes"));
router.use("/rental-terms", require("../modules/rentalTerms/rentalTermRoutes"));
router.use("/checkout-sessions", require("../modules/checkout/checkoutRoutes"));
router.use("/payments", require("../modules/payments/paymentRoutes"));
router.use("/uploads", require("../modules/uploads/upload"));
router.use("/rental-otp", require("../modules/rentalOtp/rentalOtp.routes"));

module.exports = router;
