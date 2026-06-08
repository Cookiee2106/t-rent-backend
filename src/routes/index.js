const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({
    message: "T-Rent API routes",
  });
});

router.use("/uploads", require("../modules/uploads/upload"));

module.exports = router;