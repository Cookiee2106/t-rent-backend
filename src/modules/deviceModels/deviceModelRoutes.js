const express = require("express");

const {
  layDanhSachMauThietBi,
} = require("./deviceModelController");

const router = express.Router();

router.get("/", layDanhSachMauThietBi);

module.exports = router;