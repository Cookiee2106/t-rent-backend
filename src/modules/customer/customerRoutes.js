const router = require("express").Router();
const upload = require("../../middlewares/uploadMiddleware");
const authMiddleware = require("../../middlewares/authMiddleware");
const customerController = require("./customerController");

router.use(authMiddleware);

router.get("/account", customerController.getAccount);
router.put("/account/profile", customerController.updateProfile);
router.post(
  "/verifications",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
  ]),
  customerController.submitVerification
);

module.exports = router;
