const {
  capNhatThongTinCaNhanService,
  layHoSoXacMinhCuaToiService,
  guiHoSoXacMinhService,
} = require("./customerService");

async function capNhatThongTinCaNhan(req, res) {
  try {
    const { ho_ten, so_dien_thoai, dia_chi } = req.body;

    if (!ho_ten || !so_dien_thoai || !dia_chi) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    if (!/^0[0-9]{9}$/.test(so_dien_thoai)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ",
      });
    }

    const nguoiDung = await capNhatThongTinCaNhanService(
      req.nguoiDung.id,
      req.body
    );

    res.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
      data: nguoiDung,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
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
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

async function guiHoSoXacMinh(req, res) {
  try {
    const { so_cccd } = req.body;

    const anhMatTruoc = req.files?.anh_mat_truoc?.[0];

    const anhMatSau = req.files?.anh_mat_sau?.[0];

    const anhCamCccd = req.files?.anh_cam_cccd?.[0];

    if (!so_cccd || !anhMatTruoc || !anhMatSau || !anhCamCccd) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ hồ sơ xác minh",
      });
    }

    if (!/^[0-9]{12}$/.test(so_cccd)) {
      return res.status(400).json({
        success: false,
        message: "Số CCCD phải gồm 12 chữ số",
      });
    }

    if (
      !anhMatTruoc.mimetype.startsWith("image/") ||
      !anhMatSau.mimetype.startsWith("image/") ||
      !anhCamCccd.mimetype.startsWith("image/")
    ) {
      return res.status(400).json({
        success: false,
        message: "File tải lên phải là ảnh",
      });
    }

    const hoSo = await guiHoSoXacMinhService(req.nguoiDung.id, {
      so_cccd,
      anh_mat_truoc: anhMatTruoc,
      anh_mat_sau: anhMatSau,
      anh_cam_cccd: anhCamCccd,
    });

    res.json({
      success: true,
      message: "Gửi hồ sơ xác minh thành công",
      data: hoSo,
    });
  } catch (loi) {
    res.status(400).json({
      success: false,
      message: loi.message,
    });
  }
}

module.exports = {
  capNhatThongTinCaNhan,
  layHoSoXacMinhCuaToi,
  guiHoSoXacMinh,
};