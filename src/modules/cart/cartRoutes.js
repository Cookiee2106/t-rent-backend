const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const cartController = require("./cartController");

router.use(authMiddleware);

router.post("/items", cartController.addCartItem);
router.get("/", cartController.getCart);
router.delete("/items/:id", cartController.removeCartItem);

module.exports = router;
