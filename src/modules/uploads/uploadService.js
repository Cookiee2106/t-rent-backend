const cloudinary = require("../../config/cloudinary");

function chuanHoaThuMuc(thuMuc) {
  const giaTri = String(thuMuc || "t-rent").trim().replace(/^\/+|\/+$/g, "");

  if (!giaTri) {
    return "t-rent";
  }

  return giaTri.startsWith("t-rent/") || giaTri === "t-rent"
    ? giaTri
    : `t-rent/${giaTri}`;
}

function uploadAnhCloudinary(file, thuMuc, deliveryType) {
  return new Promise((resolve, reject) => {
    if (!file?.buffer) {
      return reject(new Error("Không tìm thấy dữ liệu ảnh để upload"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: chuanHoaThuMuc(thuMuc),
        resource_type: "image",
        type: deliveryType,
      },
      (loi, ketQua) => {
        if (loi) {
          return reject(new Error("Lỗi upload ảnh lên Cloudinary"));
        }

        resolve({
          secure_url: ketQua.secure_url,
          public_id: ketQua.public_id,
          resource_type: ketQua.resource_type || "image",
          type: ketQua.type || deliveryType,
        });
      }
    );

    stream.end(file.buffer);
  });
}

// Ảnh public: dùng cho ảnh mẫu thiết bị hiển thị ngoài website.
async function taiAnhCongKhaiLenCloudinaryService(file, thuMuc) {
  return uploadAnhCloudinary(file, thuMuc, "upload");
}

// Ảnh protected: CCCD, hợp đồng đã ký, bàn giao, biên bản, ảnh khi trả.
async function taiAnhBaoVeLenCloudinaryService(file, thuMuc) {
  return uploadAnhCloudinary(file, thuMuc, "authenticated");
}

async function taiNhieuAnhBaoVeLenCloudinaryService(danhSachFile = [], thuMuc) {
  const ketQuaUpload = await Promise.all(
    danhSachFile.map((file) => taiAnhBaoVeLenCloudinaryService(file, thuMuc))
  );

  return ketQuaUpload.map((item, index) => ({
    ten_file_goc: danhSachFile[index].originalname,
    file_url: item.secure_url,
    loai_file: danhSachFile[index].mimetype,
    kich_thuoc_file: danhSachFile[index].size || null,
    cloudinary_public_id: item.public_id,
    cloudinary_resource_type: item.resource_type,
    cloudinary_delivery_type: item.type,
  }));
}

// Giữ alias cũ để những module chưa chuyển đổi không bị vỡ.
// Alias cũ vẫn là public; các dữ liệu nhạy cảm phải gọi hàm BaoVe phía trên.
async function taiAnhLenCloudinaryService(file, thuMuc) {
  return taiAnhCongKhaiLenCloudinaryService(file, thuMuc);
}

module.exports = {
  taiAnhLenCloudinaryService,
  taiAnhCongKhaiLenCloudinaryService,
  taiAnhBaoVeLenCloudinaryService,
  taiNhieuAnhBaoVeLenCloudinaryService,
};
