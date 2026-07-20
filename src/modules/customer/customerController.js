const {
  capNhatThongTinCaNhanService,
  layHoSoXacMinhCuaToiService,
  guiHoSoXacMinhService,
} = require("./customerService");

function guiLoi(res, loi) {
  return res.status(400).json({
    success: false,
    message: loi.message,
  });
}

async function capNhatThongTinCaNhan(req, res) {
  try {
    const nguoiDung = await capNhatThongTinCaNhanService(
      req.nguoiDung.id,
      req.body || {}
    );

    res.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: nguoiDung,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function layHoSoXacMinhCuaToi(req, res) {
  try {
    const hoSo = await layHoSoXacMinhCuaToiService(req.nguoiDung.id);

    res.json({
      success: true,
      message: "Lấy hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

async function guiHoSoXacMinh(req, res) {
  try {
    const hoSo = await guiHoSoXacMinhService(req.nguoiDung.id, {
      so_cccd: req.body.so_cccd,
      anh_mat_truoc: req.files?.anh_mat_truoc?.[0],
      anh_mat_sau: req.files?.anh_mat_sau?.[0],
      anh_cam_cccd: req.files?.anh_cam_cccd?.[0],
    });

    res.json({
      success: true,
      message: "Gửi hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    guiLoi(res, loi);
  }
}

module.exports = {
  capNhatThongTinCaNhan,
  layHoSoXacMinhCuaToi,
  guiHoSoXacMinh,
};