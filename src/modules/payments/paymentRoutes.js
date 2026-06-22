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

// TEST ENDPOINT - Chỉ hoạt động khi NODE_ENV != production
router.get(
  "/vnpay/test-simulate-ipn",
  authMiddleware,
  paymentController.testSimulateIpnSuccess
);

module.exports = router;
