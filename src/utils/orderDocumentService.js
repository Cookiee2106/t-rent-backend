const puppeteer = require("puppeteer");
const {
  taoHtmlHopDong,
  taoHtmlBienBanBanGiao,
} = require("./orderDocumentTemplate");

// Render gói RAM thấp dễ bị tăng RAM nếu mở nhiều Chromium cùng lúc.
// Vì vậy PDF được xếp hàng và dùng lại 1 browser trong một khoảng ngắn.
let browserPromise = null;
let henDongBrowser = null;
let hangDoiPdf = Promise.resolve();

const THOI_GIAN_GIU_BROWSER_MS = Number(
  process.env.PDF_BROWSER_IDLE_MS || 60000
);

function taoCauHinhKhoiDong() {
  const cauHinh = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };

  // Nếu sau này dùng Docker/system Chromium trên Render thì chỉ cần
  // khai báo PUPPETEER_EXECUTABLE_PATH, không phải sửa code.
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    cauHinh.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  return cauHinh;
}

function huyHenDongBrowser() {
  if (henDongBrowser) {
    clearTimeout(henDongBrowser);
    henDongBrowser = null;
  }
}

async function dongBrowserNeuDangMo() {
  huyHenDongBrowser();

  if (!browserPromise) return;

  const promiseHienTai = browserPromise;
  browserPromise = null;

  try {
    const browser = await promiseHienTai;

    if (browser?.connected) {
      await browser.close();
    }
  } catch {
    // Browser chưa mở thành công thì không cần xử lý thêm.
  }
}

function henDongBrowserKhiRanh() {
  huyHenDongBrowser();

  if (!Number.isFinite(THOI_GIAN_GIU_BROWSER_MS) || THOI_GIAN_GIU_BROWSER_MS <= 0) {
    return;
  }

  henDongBrowser = setTimeout(() => {
    dongBrowserNeuDangMo().catch(() => {});
  }, THOI_GIAN_GIU_BROWSER_MS);

  if (typeof henDongBrowser.unref === "function") {
    henDongBrowser.unref();
  }
}

async function layBrowser() {
  huyHenDongBrowser();

  if (!browserPromise) {
    browserPromise = puppeteer
      .launch(taoCauHinhKhoiDong())
      .then((browser) => {
        browser.once("disconnected", () => {
          browserPromise = null;
        });

        return browser;
      })
      .catch((loi) => {
        browserPromise = null;
        throw new Error(
          `Không thể khởi động Chrome để tạo PDF: ${loi.message}. ` +
            "Hãy chạy npx puppeteer browsers install chrome và kiểm tra cấu hình Render."
        );
      });
  }

  return await browserPromise;
}

function xepHangTaoPdf(congViec) {
  const tacVu = hangDoiPdf.then(congViec, congViec);

  // Không để một lỗi PDF làm hỏng cả hàng đợi phía sau.
  hangDoiPdf = tacVu.catch(() => {});

  return tacVu;
}

async function taoPdfTuHtml(html) {
  return await xepHangTaoPdf(async () => {
    const browser = await layBrowser();
    const page = await browser.newPage();

    try {
      // HTML hợp đồng/biên bản là nội bộ, không cần chạy JS phía trang.
      await page.setJavaScriptEnabled(false);

      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.emulateMediaType("print");

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        // Margin nằm trong @page của template để Chromium local/Render cho kết quả đồng nhất.
        displayHeaderFooter: false,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
        preferCSSPageSize: true,
      });

      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
      henDongBrowserKhiRanh();
    }
  });
}

async function taoHopDongPdf(donThue, chiTietDon, nhanVien) {
  const html = taoHtmlHopDong(donThue, chiTietDon, nhanVien);
  return await taoPdfTuHtml(html);
}

async function taoBienBanBanGiaoPdf(donThue, vatPhamBanGiao) {
  const html = taoHtmlBienBanBanGiao(donThue, vatPhamBanGiao);
  return await taoPdfTuHtml(html);
}

// Render gửi SIGTERM khi deploy/restart nên đóng Chromium gọn gàng.
process.once("SIGTERM", () => {
  dongBrowserNeuDangMo().finally(() => process.exit(0));
});

process.once("SIGINT", () => {
  dongBrowserNeuDangMo().finally(() => process.exit(0));
});

module.exports = {
  taoHopDongPdf,
  taoBienBanBanGiaoPdf,
};
