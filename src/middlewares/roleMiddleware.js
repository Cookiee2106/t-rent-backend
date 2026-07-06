function kiemTraVaiTro(danhSachVaiTro) {
  return function (req, res, next) {
    if (!danhSachVaiTro.includes(req.nguoiDung.vai_tro)) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập",
      });
    }

    next();
  };
}

module.exports = kiemTraVaiTro;