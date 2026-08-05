const express = require("express");

const {
  layLuaChonBoLoc,
  layDanhSachMauThietBi,
  layChiTietMauThietBi,
} = require("./deviceModelController");

const router = express.Router();

// Route tĩnh phải đặt trước /:id.
router.get("/filter-options", layLuaChonBoLoc);
router.get("/", layDanhSachMauThietBi);
router.get("/:id", layChiTietMauThietBi);

module.exports = router;
