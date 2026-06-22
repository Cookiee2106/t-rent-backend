const router = require("express").Router();
const deviceModelController = require("./deviceModelController");

router.get("/", deviceModelController.getProductModels);
router.get("/:id", deviceModelController.getProductModelDetail);

module.exports = router;
