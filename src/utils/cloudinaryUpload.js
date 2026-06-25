const cloudinary = require("../config/cloudinary");

function uploadBufferToCloudinary(fileBuffer, folder, resourceType = "auto") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  uploadBufferToCloudinary,
};