const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const paymentController = require("./paymentController");

router.post(
  "/vnpay/create-payment-url",
  authMiddleware,
  paymentController.createPaymentUrl
);
router.get("/vnpay/return", paymentController.handleReturn);
router.get("/vnpay/ipn", paymentController.handleIpn);

module.exports = router;
