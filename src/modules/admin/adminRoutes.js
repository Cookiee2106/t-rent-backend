const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const adminController = require("./adminController");

router.use(authMiddleware);
router.use(roleMiddleware("STAFF", "ADMIN"));

router.get("/customer-accounts", adminController.getCustomerAccounts);
router.get("/customer-accounts/:id", adminController.getCustomerAccountDetail);
router.patch(
  "/customer-accounts/:id/approve-verification",
  adminController.approveVerification
);
router.patch(
  "/customer-accounts/:id/reject-verification",
  adminController.rejectVerification
);

module.exports = router;
