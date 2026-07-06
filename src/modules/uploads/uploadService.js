const cloudinary = require("../../config/cloudinary");

// Upload ảnh lên Cloudinary
async function taiAnhLenCloudinaryService(file, thuMuc) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: thuMuc || "t-rent",
        resource_type: "image",
      },
      (loi, ketQua) => {
        if (loi) {
          return reject(new Error("Lỗi upload ảnh lên Cloudinary"));
        }

        resolve({
          url: ketQua.secure_url,
          public_id: ketQua.public_id,
        });
      }
    );

    stream.end(file.buffer);
  });
}

module.exports = {
  taiAnhLenCloudinaryService,
};