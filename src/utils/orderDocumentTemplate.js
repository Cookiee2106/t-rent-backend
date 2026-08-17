function escapeHtml(giaTri) {
  return String(giaTri ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function dinhDangTien(giaTri) {
  return Number(giaTri || 0).toLocaleString("vi-VN");
}

function dinhDangNgay(giaTri) {
  if (!giaTri) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(giaTri));
}

function layNgayHienTaiVietNam() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());

  const lay = (type) => parts.find((item) => item.type === type)?.value || "";

  return {
    ngay: lay("day"),
    thang: lay("month"),
    nam: lay("year"),
  };
}

function layChucVuTuVaiTro(vaiTro) {
  const ma = String(vaiTro || "").trim().toUpperCase();

  if (ma === "NHAN_VIEN") return "Nhân viên";
  if (ma === "QUAN_TRI" || ma === "QUAN_TRI_VIEN") return "Quản trị viên";

  return "";
}

function cssTaiLieu() {
  return `
    @page {
      size: A4;
      margin: 9mm 12mm 11mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
    }

    body {
      font-family: "DejaVu Serif", "Times New Roman", serif;
      font-size: 10.5pt;
      line-height: 1.28;
      color: #000;
      background: #fff;
    }

    p {
      margin: 0 0 3px;
      text-align: justify;
      orphans: 2;
      widows: 2;
    }

    .can-giua {
      text-align: center;
    }

    .dam {
      font-weight: 700;
    }

    .tieu-de-chinh {
      margin: 2px 0 0;
      font-size: 15pt;
      font-weight: 700;
      text-align: center;
      line-height: 1.2;
    }

    .tieu-de-phu {
      margin: 0 0 8px;
      font-size: 14pt;
      font-weight: 700;
      text-align: center;
      line-height: 1.2;
    }

    .quoc-hieu {
      text-align: center;
      font-weight: 700;
      line-height: 1.22;
    }

    .doc-lap {
      text-align: center;
      font-weight: 700;
      margin-top: 1px;
    }

    .phan-cach {
      text-align: center;
      margin: 1px 0 7px;
    }

    .muc {
      margin-top: 5px;
      font-weight: 700;
    }

    .tieu-muc {
      margin-left: 18px;
    }

    .gach-dau-dong {
      margin-left: 18px;
      text-indent: -12px;
    }

    .thut-dau-dong {
      text-indent: 18px;
    }

    .khoang-trong-nho {
      height: 3px;
    }

    .khoang-trong-vua {
      height: 7px;
    }

    .ngat-trang {
      break-before: page;
      page-break-before: always;
    }

    .khong-tach {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      border: 1px solid #000;
      padding: 3px 3px;
      vertical-align: middle;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    th {
      font-weight: 700;
      text-align: center;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .bang-hop-dong {
      margin: 5px 0 7px;
      font-size: 8.4pt;
    }

    .bang-ban-giao {
      margin: 5px 0 7px;
      font-size: 8.7pt;
    }

    .can-trai {
      text-align: left;
    }

    .can-giua-o {
      text-align: center;
    }

    .chu-ky {
      width: 100%;
      margin-top: 10px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .chu-ky td {
      border: none;
      text-align: center;
      vertical-align: top;
      padding: 0 10px;
    }

    .chu-ky .ten-ben {
      font-weight: 700;
      margin-bottom: 2px;
    }

    .chu-ky .goi-y {
      font-style: italic;
    }

    .o-ghi-chu-chung {
      vertical-align: middle;
      text-align: left;
      white-space: pre-wrap;
    }

    /* Hợp đồng nhiều điều khoản: nén vừa đủ để tránh tạo một trang cuối gần trống. */
    body.tai-lieu-hop-dong {
      font-size: 9.8pt;
      line-height: 1.16;
    }

    body.tai-lieu-hop-dong p {
      margin-bottom: 1px;
    }

    body.tai-lieu-hop-dong .muc {
      margin-top: 3px;
    }

    body.tai-lieu-hop-dong .bang-hop-dong {
      margin: 3px 0 4px;
      font-size: 8.1pt;
    }

    body.tai-lieu-hop-dong th,
    body.tai-lieu-hop-dong td {
      padding: 2px 3px;
    }

    body.tai-lieu-hop-dong .chu-ky {
      margin-top: 7px;
    }

    /* Biên bản ngắn hơn: giữ chữ thoáng hơn để sử dụng trang A4 cân đối. */
    body.tai-lieu-ban-giao {
      font-size: 10.9pt;
      line-height: 1.32;
    }

    body.tai-lieu-ban-giao p {
      margin-bottom: 4px;
    }

    body.tai-lieu-ban-giao .muc {
      margin-top: 6px;
    }

    body.tai-lieu-ban-giao .bang-ban-giao {
      margin: 6px 0 8px;
      font-size: 9pt;
    }

    body.tai-lieu-ban-giao th,
    body.tai-lieu-ban-giao td {
      padding: 4px 3px;
    }

    body.tai-lieu-ban-giao .chu-ky {
      margin-top: 14px;
    }
  `;
}

function khungHtml(noiDung, tieuDe, lopBody = "") {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(tieuDe)}</title>
  <style>${cssTaiLieu()}</style>
</head>
<body class="${escapeHtml(lopBody)}">
${noiDung}
</body>
</html>`;
}

function taoDongChiTietHopDong(chiTietDon, soNgayThue) {
  const danhSachDong = [];
  let stt = 1;

  for (const item of chiTietDon || []) {
    const tenThietBi = [item.ten_hang, item.ten_mau]
      .filter(Boolean)
      .join(" ")
      .trim();

    danhSachDong.push(`
      <tr>
        <td class="can-giua-o">${stt++}</td>
        <td class="can-trai">${escapeHtml(tenThietBi)}</td>
        <td class="can-giua-o">${escapeHtml(dinhDangTien(item.tien_coc_snapshot))}</td>
        <td class="can-giua-o">${escapeHtml(dinhDangTien(item.gia_tri_thiet_bi_snapshot))}</td>
        <td class="can-giua-o">${Number(item.so_luong || 0)}</td>
        <td class="can-giua-o">${Number(soNgayThue || 0)} ngày</td>
        <td class="can-giua-o">${escapeHtml(dinhDangTien(item.tien_thue))}</td>
      </tr>
    `);

    const boDiKemSnapshot = Array.isArray(item.bo_di_kem_snapshot)
      ? item.bo_di_kem_snapshot
      : [];

    for (const phuKien of boDiKemSnapshot) {
      const soLuongPhuKien =
        Number(item.so_luong || 0) * Number(phuKien.so_luong || 0);

      danhSachDong.push(`
        <tr>
          <td class="can-giua-o">${stt++}</td>
          <td class="can-trai">${escapeHtml(phuKien.ten_phu_kien || "")}</td>
          <td class="can-giua-o">-</td>
          <td class="can-giua-o">${escapeHtml(
            dinhDangTien(phuKien.gia_tri_phu_kien_snapshot)
          )}</td>
          <td class="can-giua-o">${soLuongPhuKien}</td>
          <td class="can-giua-o">-</td>
          <td class="can-giua-o">-</td>
        </tr>
      `);
    }
  }

  return danhSachDong.join("");
}

function taoHtmlHopDong(donThue, chiTietDon, nhanVien = {}) {
  const ngayHienTai = layNgayHienTaiVietNam();
  const dongChiTiet = taoDongChiTietHopDong(
    chiTietDon,
    donThue.so_ngay_thue
  );

  const noiDung = `
    <div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="doc-lap">Độc lập – Tự do – Hạnh phúc</div>
    <div class="phan-cach">------ooOoo------</div>

    <div class="tieu-de-chinh">HỢP ĐỒNG</div>
    <div class="tieu-de-phu">CHO THUÊ MÁY ẢNH</div>
    <p class="can-giua dam" style="margin-top:2px; margin-bottom:10px;">Hợp đồng này được lập cho đơn thuê mã: ${escapeHtml(donThue.ma_don || "")}</p>

    <p class="gach-dau-dong">- Căn cứ Bộ luật Dân sự số 91/2015/QH13, ngày 24/11/2015;</p>
    <p class="gach-dau-dong">- Căn cứ chức năng, nhiệm vụ, nhu cầu và khả năng thực hiện của hai bên.</p>
    <p class="gach-dau-dong">- Hai bên thống nhất ký kết Hợp đồng cho thuê máy ảnh với các điều khoản sau đây:</p>

    <p>Hôm nay, ngày ${escapeHtml(ngayHienTai.ngay)} tháng ${escapeHtml(ngayHienTai.thang)} năm ${escapeHtml(ngayHienTai.nam)}, tại TP. Hồ Chí Minh chúng tôi gồm có:</p>

    <p class="dam">Bên A - BÊN THUÊ:</p>
    <p>Tên đại diện/Cá nhân: ${escapeHtml(donThue.ten_khach_hang || "")}</p>
    <p>Địa chỉ: ${escapeHtml(donThue.dia_chi_khach_hang || "")}</p>
    <p>Số CCCD: ${escapeHtml(donThue.so_cccd_khach_hang || "")}</p>
    <p>Điện thoại: ${escapeHtml(donThue.sdt_khach_hang || "")} &nbsp;&nbsp; Email: ${escapeHtml(donThue.email_khach_hang || "")}</p>
    <p>(Sau đây gọi tắt là bên A)</p>

    <div class="khoang-trong-nho"></div>

    <p class="dam">Bên B - BÊN CHO THUÊ:</p>
    <p>Tên Cửa hàng/Hộ kinh doanh: Cửa hàng cho thuê máy ảnh T-Rent</p>
    <p>Địa chỉ: Số 18, Đường 3/2, Quận 10, TP. Hồ Chí Minh</p>
    <p>Mã số thuế: 090987678765</p>
    <p>Đại diện bởi Nhân viên ủy quyền: Ông/Bà ${escapeHtml(nhanVien.ho_ten || "")}</p>
    <p>Chức vụ: ${escapeHtml(layChucVuTuVaiTro(nhanVien.vai_tro))}</p>
    <p>Số CCCD của nhân viên: ${escapeHtml(nhanVien.so_cccd || "")}</p>
    <p>Điện thoại: ${escapeHtml(nhanVien.so_dien_thoai || "")} &nbsp;&nbsp; Email: ${escapeHtml(nhanVien.email || "")}</p>
    <p>(Sau đây gọi tắt là Bên B)</p>

    <div class="khoang-trong-vua"></div>
    <p>Sau khi trao đổi, hai bên thống nhất ký hợp đồng cho thuê máy với các điều khoản như sau:</p>

    <p class="muc">Điều 1. NỘI DUNG, ĐỐI TƯỢNG VÀ GIÁ CẢ CỦA HỢP ĐỒNG:</p>
    <p class="tieu-muc">1. Bên B cho Bên A thuê máy ảnh, thiết bị và phụ kiện như sau:</p>

    <table class="bang-hop-dong">
      <colgroup>
        <col style="width:6%" />
        <col style="width:25%" />
        <col style="width:12%" />
        <col style="width:14%" />
        <col style="width:9%" />
        <col style="width:15%" />
        <col style="width:19%" />
      </colgroup>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên thiết bị, phụ kiện</th>
          <th>Giá cọc</th>
          <th>Giá trị thiết bị/phụ kiện</th>
          <th>Số lượng</th>
          <th>Thời gian thuê</th>
          <th>Giá thuê (VNĐ)</th>
        </tr>
      </thead>
      <tbody>${dongChiTiet}</tbody>
    </table>

    <p class="tieu-muc">Giá trị thiết bị/phụ kiện trong bảng là giá trị của 01 đơn vị, dùng làm căn cứ xác định nghĩa vụ bồi thường tương ứng với số lượng mất hoặc hư hỏng hoàn toàn.</p>
    <p class="tieu-muc">2. Tiêu chuẩn chất lượng của máy, thiết bị: Tất cả máy phải đang hoạt động tốt, đạt công suất quy định của máy.</p>

    <p class="muc">Điều 2. MỤC ĐÍCH, THỜI HẠN THUÊ:</p>
    <p class="tieu-muc">1. Mục đích thuê: Bên A thuê máy ảnh, thiết bị nêu tại Điều 1 để phục vụ làm việc, chụp ảnh cá nhân hoặc các mục đích hợp pháp khác, không trái quy định pháp luật.</p>
    <p class="tieu-muc">2. Thời hạn thuê: Từ ngày ${escapeHtml(dinhDangNgay(donThue.ngay_nhan))} đến hết ngày ${escapeHtml(dinhDangNgay(donThue.ngay_tra))}</p>

    <p class="muc">Điều 3. TIỀN ĐẶT CỌC:</p>
    <p>Bên A đặt cọc:</p>
    <p class="gach-dau-dong">- Số tiền: ${escapeHtml(dinhDangTien(donThue.tong_tien_coc))} đồng</p>
    <p>Tiền đặt cọc nhằm bảo đảm việc trả máy và bồi thường thiệt hại (nếu có).</p>
    <p>Sau khi kết thúc hợp đồng:</p>
    <p>- Nếu không phát sinh hư hỏng, mất mát: hoàn trả đầy đủ.</p>
    <p>- Nếu phát sinh thiệt hại: Bên B được quyền khấu trừ tiền cọc.</p>
    <p>Trường hợp tiền đặt cọc không đủ để bù đắp thiệt hại, Bên A có trách nhiệm thanh toán phần chênh lệch còn thiếu cho Bên B.</p>

    <p class="muc">Điều 4. THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN tiền thuê:</p>
    <p class="tieu-muc">1. Thời hạn thanh toán: Bên A có trách nhiệm thanh toán đầy đủ 100% tiền thuê cho Bên B ngay tại thời điểm ký kết hợp đồng và trước khi nhận bàn giao thiết bị.</p>
    <p class="tieu-muc">2. Phương thức thanh toán: Chuyển khoản Ngân hàng hoặc tiền mặt.</p>

    <p class="muc">Điều 5. QUYỀN VÀ NGHĨA VỤ BÊN A:</p>
    <p class="tieu-muc">1. Bên A có các nghĩa vụ sau đây:</p>
    <p class="gach-dau-dong">- Người đặt thuê trên hệ thống đồng thời là người trực tiếp nhận bàn giao và hoàn trả thiết bị.</p>
    <p class="gach-dau-dong">- Trả tiền thuê đúng và đủ theo quy định của Điều 1 và Điều 4 của hợp đồng này.</p>
    <p class="gach-dau-dong">- Bàn giao lại máy móc, thiết bị cho thuê đúng thời gian, số lượng như đã thoả thuận và đúng tình trạng chất lượng như khi nhận máy móc, thiết bị trừ hao mòn tự nhiên.</p>
    <p class="gach-dau-dong">- Trường hợp Thiết bị phát sinh hư hỏng, mất mát do lỗi của Bên A (bao gồm cả lỗi cố ý hoặc vô ý, bất cẩn trong quá trình sử dụng và bảo quản), Bên A có nghĩa vụ bồi thường cho Bên B trên cơ sở chi phí sửa chữa thực tế theo thỏa thuận hoặc báo giá của đơn vị sửa chữa, được hai bên xác nhận</p>
    <p class="gach-dau-dong">- Trường hợp làm hư hỏng hoặc mất máy, Bên A phải bồi thường theo giá thị trường của tài sản tại thời điểm xảy ra thiệt hại.</p>
    <p class="gach-dau-dong">- Không cho bên thứ ba thuê, mượn lại máy móc, thiết bị mà Bên B cho Bên A thuê trong thời hạn cho thuê, trừ khi có sự đồng ý bằng văn bản của Bên B.</p>

    <p class="tieu-muc">2. Bên A có các quyền sau đây:</p>
    <p class="gach-dau-dong">- Yêu cầu Bên B sửa chữa và bảo dưỡng định kì máy ảnh, thiết bị cho thuê trừ hư hỏng nhỏ, yêu cầu Bên B sửa chữa máy ảnh, thiết bị bị hư hỏng không do lỗi của Bên A.</p>
    <p class="gach-dau-dong">- Yêu cầu Bên B sửa chữa, thay thế thiết bị tương đương hoặc có biện pháp xử lý phù hợp khi thiết bị gặp hư hỏng, giảm chất lượng sử dụng mà không do lỗi của Bên A.</p>
    <p class="gach-dau-dong">- Yêu cầu Bên B cung cấp máy ảnh, thiết bị đúng chủng loại, số lượng, tình trạng và phụ kiện kèm theo như đã thỏa thuận trong hợp đồng và biên bản bàn giao.</p>

    <p class="muc">Điều 6. QUYỀN VÀ NGHĨA VỤ BÊN B:</p>
    <p class="tieu-muc">1. Bên B có các nghĩa vụ sau đây:</p>
    <p class="gach-dau-dong">- Giao máy ảnh, thiết bị cho thuê đúng loại và số lượng, đúng thời gian và địa điểm đã thoả thuận, đảm bảo máy ảnh, thiết bị còn nguyên vẹn, đạt tiêu chuẩn chất lượng như đã quy định tại hợp đồng này.</p>
    <p class="gach-dau-dong">- Xuất biên bản bàn giao cho Bên A mỗi khi giao máy móc, thiết bị cho thuê cho Bên A theo thoả thuận.</p>

    <p class="gach-dau-dong">- Chịu mọi trách nhiệm về tính sở hữu của máy ảnh, thiết bị cho thuê.</p>
    <p class="gach-dau-dong">- Bảo đảm quyền sử dụng máy ảnh, thiết bị ổn định, lâu dài cho Bên A theo đúng thời hạn đã thoả thuận.</p>
    <p class="gach-dau-dong">- Sửa chữa những hư hỏng, khuyết tật của máy móc, thiết bị cho thuê và bảo dưỡng định kỳ máy móc, thiết bị trừ những hư hỏng nhỏ.</p>

    <p class="tieu-muc">2. Bên B có các quyền sau đây:</p>
    <p class="gach-dau-dong">- Nhận tiền thuê đúng và đủ theo quy định của Điều 1 và Điều 4 của hợp đồng này.</p>
    <p class="gach-dau-dong">- Nhận lại máy ảnh, thiết bị cho thuê đúng thời gian, số lượng như đã thoả thuận và đúng tình trạng chất lượng như lúc ban đầu trừ hao mòn tự nhiên.</p>
    <p class="gach-dau-dong">- Yêu cầu Bên A sử dụng máy ảnh, thiết bị cho thuê đúng mục đích và công dụng.</p>
    <p class="gach-dau-dong">- Yêu cầu Bên A bồi thường thiệt hại theo thoả thuận nếu máy ảnh, thiết bị thuê bị hư hại do lỗi của Bên A, sau khi hai bên đã cùng nhau tìm cách khắc phục mà vẫn không thể khắc phục được thiệt hại.</p>
    <p class="gach-dau-dong">- Trường hợp Bên B phát hiện ra Bên A sử dụng máy móc, thiết bị thuê không đúng mục đích đã thoả thuận và công dụng của từng loại máy móc, thiết bị thì Bên B có quyền yêu cầu Bên A chấm dứt ngay hành vi vi phạm hoặc lập tức đơn phương chấm dứt hợp đồng, thu hồi thiết bị thuê và yêu cầu bồi thường thiệt hại.</p>

    <p class="muc">Điều 7. HIỆU LỰC CỦA HỢP ĐỒNG:</p>
    <p class="tieu-muc">1. Hợp đồng này có hiệu lực kể từ ngày hai bên ký tên.</p>
    <p class="tieu-muc">2. Hợp đồng này hết hiệu lực trong các trường hợp sau:</p>
    <p class="gach-dau-dong">- Hai bên đã hoàn tất mọi nghĩa vụ với nhau như thoả thuận.</p>
    <p class="gach-dau-dong">- Hai bên thỏa thuận chấm dứt hợp đồng trước thời hạn.</p>

    <p class="muc">Điều 8. TRÁCH NHIỆM TÀI SẢN:</p>
    <p class="gach-dau-dong">- Hao mòn tự nhiên, trầy xước nhẹ phát sinh trong quá trình sử dụng thông thường không bị coi là vi phạm hợp đồng.</p>
    <p class="gach-dau-dong">- Trường hợp mất phụ kiện: Bên A có nghĩa vụ bồi thường theo đúng &quot;Giá trị thiết bị/phụ kiện&quot; tương ứng đã được hai bên thống nhất và ghi tại Điều 1 của Hợp đồng.</p>

    <p class="gach-dau-dong">- Trường hợp Thiết bị phát sinh hư hỏng sửa chữa được: Bên A chịu toàn bộ chi phí sửa chữa thực tế dựa trên báo giá của hãng hoặc đơn vị sửa chữa do Bên B chỉ định. Đối với các hư hỏng vật lý bên ngoài phát hiện ngay khi bàn giao (như nứt vỡ, trầy xước thấu kính, móp vỏ...), Bên A có trách nhiệm thanh toán chi phí này ngay tại chỗ cho Bên B.</p>
    <p class="gach-dau-dong">- Trường hợp mất máy ảnh hoặc hư hỏng hoàn toàn: Bên A phải bồi thường theo đúng &quot;Giá trị thiết bị&quot; đã thống nhất tại Điều 1 (hoặc giá thị trường tương đương tại thời điểm xảy ra thiệt hại), nghĩa vụ này độc lập và không bị giới hạn bởi số tiền đặt cọc.</p>
    <p class="gach-dau-dong">- Trường hợp chậm trả máy: Bên B có quyền tính tiền thuê theo ngày tương ứng với thời gian chậm trả. Bên A phải tự chịu mọi rủi ro, hư hỏng xảy ra đối với Thiết bị trong suốt thời gian chậm trả này.</p>

    <p class="muc">Điều 9. ĐIỀU KHOẢN CHUNG:</p>
    <p class="tieu-muc">1. Hai bên cam kết thực hiện đúng các điều khoản của hợp đồng, trong quá trình thực hiện nếu có gì trở ngại, khó khăn, hai bên giải quyết, thương lượng trên tinh thần hợp tác cùng có lợi.</p>
    <p class="tieu-muc">2. Trường hợp có vấn đề tranh chấp mà các bên không tự thương lượng, giải quyết được thì một trong các bên được quyền yêu cầu Tòa án nhân dân có thẩm quyền giải quyết. Quyết định hay bản án của Tòa án là phán quyền cuối cùng, các bên có nghĩa vụ chấp hành.</p>
    <p class="tieu-muc">3. Hợp đồng được lập thành 02 (hai) bản tiếng Việt, mỗi bên giữ 01 (một) bản có giá trị pháp lý như nhau.</p>

    <table class="chu-ky khong-tach">
      <tr>
        <td>
          <div class="ten-ben">ĐẠI DIỆN BÊN A</div>
          <div class="goi-y">(ký, ghi rõ họ tên)</div>
        </td>
        <td>
          <div class="ten-ben">ĐẠI DIỆN BÊN B</div>
          <div class="goi-y">(ký, ghi rõ họ tên)</div>
        </td>
      </tr>
    </table>
  `;

  return khungHtml(
    noiDung,
    `Hợp đồng ${donThue.ma_don || ""}`,
    "tai-lieu-hop-dong"
  );
}

function taoDongVatPhamBanGiao(vatPhamBanGiao, ghiChuBanGiao) {
  const danhSach = Array.isArray(vatPhamBanGiao) ? vatPhamBanGiao : [];

  return danhSach
    .map((item, index) => {
      const oGhiChu =
        index === 0
          ? `<td class="o-ghi-chu-chung" rowspan="${Math.max(
              danhSach.length,
              1
            )}">${escapeHtml(ghiChuBanGiao)}</td>`
          : "";

      return `
        <tr>
          <td class="can-giua-o">${index + 1}</td>
          <td class="can-trai">${escapeHtml(item.ten_vat_pham_snapshot || "")}</td>
          <td class="can-giua-o">${escapeHtml(item.so_serial_snapshot || "")}</td>
          <td class="can-giua-o">${Number(item.so_luong_giao || 0)}</td>
          <td class="can-giua-o">Tốt</td>
          ${oGhiChu}
        </tr>
      `;
    })
    .join("");
}

function taoHtmlBienBanBanGiao(donThue, vatPhamBanGiao) {
  const ngayHienTai = layNgayHienTaiVietNam();
  const ghiChuBanGiao = String(donThue.ghi_chu_ban_giao || "").trim();
  const dongVatPham = taoDongVatPhamBanGiao(
    vatPhamBanGiao,
    ghiChuBanGiao
  );

  const noiDung = `
    <div class="quoc-hieu">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="doc-lap">Độc lập – Tự do – Hạnh phúc</div>
    <div class="phan-cach">--------------</div>

    <div class="tieu-de-chinh" style="font-size:14pt; margin-bottom:4px;">BIÊN BẢN BÀN GIAO THIẾT BỊ VÀ PHỤ KIỆN</div>
    <p class="can-giua">(Liên kết Đơn thuê số: ${escapeHtml(donThue.ma_don || "")})</p>

    <p class="gach-dau-dong">• Căn cứ vào Hợp đồng cho thuê máy ảnh được lập cho đơn thuê mã: ${escapeHtml(donThue.ma_don || "")};</p>
    <p class="gach-dau-dong">• Căn cứ vào tình trạng thiết bị thực tế và sự đồng thuận của hai bên.</p>

    <p>Hôm nay, ngày ${escapeHtml(ngayHienTai.ngay)} tháng ${escapeHtml(ngayHienTai.thang)} năm ${escapeHtml(ngayHienTai.nam)} tại TP. Hồ Chí Minh, chúng tôi gồm có:</p>

    <p class="dam">Bên bàn giao: Bên B (BÊN CHO THUÊ)</p>
    <p>Đại diện bên giao Ông/Bà: ${escapeHtml(donThue.ten_nguoi_ban_giao || "")} &nbsp;&nbsp;&nbsp; Chức vụ: ${escapeHtml(layChucVuTuVaiTro(donThue.vai_tro_nguoi_ban_giao))}</p>
    <p>Địa chỉ cửa hàng: Số 18, Đường 3/2, Quận 10, TP. Hồ Chí Minh</p>
    <p>Số CCCD: ${escapeHtml(donThue.so_cccd_nguoi_ban_giao || "")}</p>
    <p>Số điện thoại liên hệ: ${escapeHtml(donThue.sdt_nguoi_ban_giao || "")} &nbsp;&nbsp; Email: ${escapeHtml(donThue.email_nguoi_ban_giao || "")}</p>

    <p class="dam">Bên nhận bàn giao: Bên A (BÊN THUÊ)</p>
    <p>Họ và tên cá nhân: ${escapeHtml(donThue.ten_khach_hang || "")}</p>
    <p>Số CCCD: ${escapeHtml(donThue.so_cccd_khach_hang || "")}</p>
    <p>Địa chỉ: ${escapeHtml(donThue.dia_chi_khach_hang || "")}</p>
    <p>Số điện thoại liên hệ: ${escapeHtml(donThue.sdt_khach_hang || "")}</p>

    <p>Hai bên tiến hành thực hiện thủ tục đồng kiểm tra và bàn giao thiết bị máy ảnh cùng các phụ kiện đi kèm theo thỏa thuận hợp đồng với nội dung chi tiết như sau:</p>

    <p class="muc">1.Thông tin các loại thiết bị bàn giao:</p>

    <table class="bang-ban-giao">
      <colgroup>
        <col style="width:7%" />
        <col style="width:30%" />
        <col style="width:18%" />
        <col style="width:10%" />
        <col style="width:15%" />
        <col style="width:20%" />
      </colgroup>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên thiết bị, phụ kiện</th>
          <th>Số Serial</th>
          <th>Số lượng</th>
          <th>Tình trạng</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>${dongVatPham}</tbody>
    </table>

    <p class="muc">2. Xác nhận tình trạng đồng kiểm và bàn giao tại chỗ</p>
    <p class="gach-dau-dong">- Bên B (Bên cho thuê) đã giao đầy đủ thiết bị, phụ kiện kèm thông tin hướng dẫn sử dụng cần thiết cho Bên A (Bên thuê).</p>
    <p class="gach-dau-dong">- Bên A (Bên thuê) đã trực tiếp kiểm tra ngoại quan, test thử các tính năng kỹ thuật của thiết bị (khả năng lấy nét, cảm biến, nút bấm).</p>
    <p class="gach-dau-dong">- Bên A xác nhận toàn bộ thiết bị hoạt động bình thường, đạt tiêu chuẩn chất lượng sử dụng và đúng số lượng nêu trên.</p>

    <p class="gach-dau-dong">- Nhân viên đã tiến hành chụp ảnh lưu trữ tình trạng ngoại quan thực tế của thiết bị tại thời điểm bàn giao làm bằng chứng đối chiếu khi hoàn trả</p>

    <p class="muc">3. Xác nhận thanh toán và đặt cọc</p>
    <p>Tại thời điểm bàn giao thiết bị này, Bên B xác nhận đã nhận từ Bên A các khoản tiền sau:</p>
    <p class="gach-dau-dong">- Tiền đặt cọc bảo đảm: ${escapeHtml(dinhDangTien(donThue.tong_tien_coc))} VNĐ</p>
    <p class="gach-dau-dong">- Hình thức nhận cọc: [ ] Tiền mặt &nbsp; [ ] Chuyển khoản</p>
    <p class="gach-dau-dong">- Tiền thuê thiết bị: ${escapeHtml(dinhDangTien(donThue.tong_tien_thue))} VNĐ</p>
    <p class="gach-dau-dong">- Hình thức thanh toán: [ ] Tiền mặt &nbsp; [ ] Chuyển khoản</p>

    <p>Biên bản bàn giao này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ thực hiện và đối chiếu khi làm thủ tục hoàn trả thanh lý hợp đồng.</p>

    <table class="chu-ky khong-tach">
      <tr>
        <td>
          <div class="ten-ben">Bên bàn giao</div>
          <div class="goi-y">(Ký, ghi rõ họ tên)</div>
        </td>
        <td>
          <div class="ten-ben">Bên nhận bàn giao</div>
          <div class="goi-y">(Ký, ghi rõ họ tên)</div>
        </td>
      </tr>
    </table>
  `;

  return khungHtml(
    noiDung,
    `Biên bản bàn giao ${donThue.ma_don || ""}`,
    "tai-lieu-ban-giao"
  );
}

module.exports = {
  taoHtmlHopDong,
  taoHtmlBienBanBanGiao,
};
