const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const maintenanceController = require("./maintenanceController");

router.use(authMiddleware);
router.use(roleMiddleware("NHAN_VIEN", "QUAN_TRI"));

router.get("/", maintenanceController.list);
router.post("/", maintenanceController.create);

module.exports = router;
