const { Readable } = require("stream");
const {
  layNguonAnhXacMinhBaoVe,
  layNguonTepDonThueBaoVe,
} = require("./protectedFileService");

function guiLoi(res, loi) {
  return res.status(loi.statusCode || 400).json({
    success: false,
    message: loi.message || "Có lỗi xảy ra",
  });
}

async function streamNguonAnh(res, nguon) {
  const phanHoi = await fetch(nguon.source_url);

  if (!phanHoi.ok || !phanHoi.body) {
    const loi = new Error("Không thể tải ảnh từ nơi lưu trữ");
    loi.statusCode = 502;
    throw loi;
  }

  const contentType =
    phanHoi.headers.get("content-type") ||
    nguon.content_type ||
    "application/octet-stream";

  const contentLength = phanHoi.headers.get("content-length");

  res.status(200);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }

  const stream = Readable.fromWeb(phanHoi.body);

  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(502).end();
      return;
    }

    res.destroy();
  });

  stream.pipe(res);
}

async function xemNoiDungAnhXacMinh(req, res) {
  try {
    const nguon = await layNguonAnhXacMinhBaoVe(
      req.nguoiDung,
      req.params.hoSoId,
      req.params.loaiAnh
    );

    return await streamNguonAnh(res, nguon);
  } catch (loi) {
    if (res.headersSent) {
      return res.destroy();
    }

    return guiLoi(res, loi);
  }
}

async function xemNoiDungTepDonThue(req, res) {
  try {
    const nguon = await layNguonTepDonThueBaoVe(
      req.nguoiDung,
      req.params.fileId
    );

    return await streamNguonAnh(res, nguon);
  } catch (loi) {
    if (res.headersSent) {
      return res.destroy();
    }

    return guiLoi(res, loi);
  }
}

module.exports = {
  xemNoiDungAnhXacMinh,
  xemNoiDungTepDonThue,
};
