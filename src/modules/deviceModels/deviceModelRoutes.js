const express = require("express");
const {
  layDanhSachMauThietBi,
  layChiTietMauThietBi,
} = require("./deviceModelController");
const router = express.Router();

router.get("/", layDanhSachMauThietBi);
router.get("/:id", layChiTietMauThietBi);

module.exports = router;