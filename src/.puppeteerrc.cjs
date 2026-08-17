const { join } = require("path");

module.exports = {
  // Đặt Chrome vào trong thư mục project để Render giữ được binary
  // từ giai đoạn build sang lúc chạy web service.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
