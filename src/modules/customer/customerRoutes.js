const express = require("express");
const multer = require("multer");
const {
  capNhatThongTinCaNhan,
  layHoSoXacMinhCuaToi,
  guiHoSoXacMinh,
} = require("./customerController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.put("/profile", xacThucDangNhap, capNhatThongTinCaNhan);
router.get("/verification", xacThucDangNhap, layHoSoXacMinhCuaToi);
router.post(
  "/verification",
  xacThucDangNhap,
  upload.fields([
    { name: "anh_mat_truoc", maxCount: 1 },
    { name: "anh_mat_sau", maxCount: 1 },
    { name: "anh_cam_cccd", maxCount: 1 },
  ]),
  guiHoSoXacMinh
);

module.exports = router;