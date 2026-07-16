const express = require("express");
const {
  layDanhSachDanhMucThietBi,
} = require("./equipmentCategoryController");

const router = express.Router();

router.get("/", layDanhSachDanhMucThietBi);

module.exports = router;
