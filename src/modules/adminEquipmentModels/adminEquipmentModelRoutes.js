const express = require("express");
const multer = require("multer");

const {
  layLuaChonCauHinhMauAdmin,

  layDanhSachMauThietBiAdmin,
  layChiTietMauThietBiAdmin,
  taoMauThietBiAdmin,
  capNhatMauThietBiAdmin,
  capNhatTrangThaiMauThietBiAdmin,
  layDanhSachBoDiKemAdmin,
  layGoiYBoDiKemAdmin,
  taoBoDiKemAdmin,
  xoaBoDiKemAdmin,
} = require("./adminEquipmentModelController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const vaiTroNoiBo = [
  "NHAN_VIEN",
  "QUAN_TRI",
  "QUAN_TRI_VIEN",
];

router.use(xacThucDangNhap);
router.use(kiemTraVaiTro(vaiTroNoiBo));

// Các route tĩnh phải đặt trước /:id.
router.get(
  "/configuration-options",
  layLuaChonCauHinhMauAdmin
);

// Quản lý mẫu thiết bị.
router.get("/", layDanhSachMauThietBiAdmin);
router.post(
  "/",
  upload.single("anh_mau"),
  taoMauThietBiAdmin
);

router.get("/:id/bundles", layDanhSachBoDiKemAdmin);
router.get(
  "/:id/bundle-options",
  layGoiYBoDiKemAdmin
);
router.post("/:id/bundles", taoBoDiKemAdmin);
router.delete(
  "/:id/bundles/:bundleId",
  xoaBoDiKemAdmin
);

router.get("/:id", layChiTietMauThietBiAdmin);

router.put(
  "/:id/status",
  capNhatTrangThaiMauThietBiAdmin
);
router.patch(
  "/:id/status",
  capNhatTrangThaiMauThietBiAdmin
);

router.put(
  "/:id",
  upload.single("anh_mau"),
  capNhatMauThietBiAdmin
);
router.patch(
  "/:id",
  upload.single("anh_mau"),
  capNhatMauThietBiAdmin
);

module.exports = router;
