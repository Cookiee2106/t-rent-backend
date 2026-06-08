const router = require("express").Router();

const upload = require("../../middlewares/upload.middleware");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

router.post("/single", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file cần upload",
      });
    }

    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      "t-rent/test",
      "auto"
    );

    return res.json({
      success: true,
      message: "Upload file thành công",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;