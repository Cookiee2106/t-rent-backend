/**
 * Test cho orderCode.js
 * Chạy: npx jest tests/orderCode.test.js
 */

const {
  normalizeDeviceCode,
  getDeviceCodeFromProductModel,
} = require("../src/utils/orderCode");

describe("normalizeDeviceCode", () => {
  test("nên trả về null khi input null/undefined", () => {
    expect(normalizeDeviceCode(null)).toBeNull();
    expect(normalizeDeviceCode(undefined)).toBeNull();
    expect(normalizeDeviceCode("")).toBeNull();
  });

  test("nên chuẩn hóa tên tiếng Việt thành không dấu, giữ nguyên số La Mã", () => {
    expect(normalizeDeviceCode("Canon R5")).toBe("CANONR5");
    expect(normalizeDeviceCode("Sony A7 III")).toBe("SONYA7III");
    expect(normalizeDeviceCode("Máy Ảnh Canon")).toBe("MAYANHCANON");
    expect(normalizeDeviceCode("Nikon Z6 II")).toBe("NIKONZ6II");
  });

  test("nên bỏ khoảng trắng và ký tự đặc biệt, giữ nguyên toàn bộ chữ và số", () => {
    expect(normalizeDeviceCode("Canon R5 Mark II")).toBe("CANONR5MARKII");
    expect(normalizeDeviceCode("Sony A7R-IV")).toBe("SONYA7RIV");
    expect(normalizeDeviceCode("DJI Mavic 3")).toBe("DJIMAVIC3");
  });

  test("nên viết hoa", () => {
    expect(normalizeDeviceCode("canon r5")).toBe("CANONR5");
    expect(normalizeDeviceCode("CANON R5")).toBe("CANONR5");
  });
});

describe("getDeviceCodeFromProductModel", () => {
  test("nên trả về null khi productModel null", () => {
    expect(getDeviceCodeFromProductModel(null)).toBeNull();
  });

  test("nên ưu tiên code > model_code > slug > name", () => {
    // Test với code
    const pm1 = { code: "R5", name: "Canon R5" };
    expect(getDeviceCodeFromProductModel(pm1)).toBe("R5");

    // Test với model_code
    const pm2 = { model_code: "EOSR5", name: "Canon R5" };
    expect(getDeviceCodeFromProductModel(pm2)).toBe("EOSR5");

    // Test với slug
    const pm3 = { slug: "canon-r5", name: "Canon R5" };
    expect(getDeviceCodeFromProductModel(pm3)).toBe("CANONR5");

    // Test với name (chỉ có name)
    const pm4 = { name: "Canon R5" };
    expect(getDeviceCodeFromProductModel(pm4)).toBe("CANONR5");
  });

  test("nên xử lý đúng Sony A7 III", () => {
    const pm = { name: "Sony A7 III" };
    expect(getDeviceCodeFromProductModel(pm)).toBe("SONYA7III");
  });

  test("nên xử lý đúng Nikon Z6 II", () => {
    const pm = { name: "Nikon Z6 II" };
    expect(getDeviceCodeFromProductModel(pm)).toBe("NIKONZ6II");
  });
});
