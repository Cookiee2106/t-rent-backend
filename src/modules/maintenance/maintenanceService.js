const prisma = require("../../utils/prisma");

async function getMaintenanceRecords(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  // Xây dựng điều kiện WHERE động
  const whereClauses = [];
  const params = [];
  
  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`pbt.trang_thai = $${params.length}`);
  }
  
  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    const kwIndex = params.length;
    whereClauses.push(`(tb.ma_tai_san ILIKE $${kwIndex} OR pbt.ly_do ILIKE $${kwIndex})`);
  }
  
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  
  // Tính tổng số lượng
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM phieu_bao_tri pbt
    LEFT JOIN thiet_bi_vat_ly tb ON pbt.thiet_bi_id = tb.id
    ${whereSql}
  `;
  
  // Lấy danh sách
  const selectQuery = `
    SELECT 
      pbt.id,
      pbt.thiet_bi_id,
      pbt.don_thue_id,
      pbt.ly_do,
      pbt.trang_thai,
      pbt.ket_qua,
      pbt.nguoi_tao_id,
      pbt.bat_dau_luc,
      pbt.hoan_thanh_luc,
      pbt.ghi_chu,
      tb.ma_tai_san,
      tb.ten_tai_san,
      tb.so_serial,
      dt.ma_don,
      nd.ho_ten as nguoi_tao_ho_ten
    FROM phieu_bao_tri pbt
    LEFT JOIN thiet_bi_vat_ly tb ON pbt.thiet_bi_id = tb.id
    LEFT JOIN don_thue dt ON pbt.don_thue_id = dt.id
    LEFT JOIN nguoi_dung nd ON pbt.nguoi_tao_id = nd.id
    ${whereSql}
    ORDER BY pbt.bat_dau_luc DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  
  const queryParams = [...params, limit, skip];
  
  const [countResult, records] = await Promise.all([
    prisma.$queryRawUnsafe(countQuery, ...params),
    prisma.$queryRawUnsafe(selectQuery, ...queryParams)
  ]);
  
  const total = countResult[0]?.total || 0;
  
  // Map kết quả về đúng định dạng cũ để không làm lỗi Controller hoặc FE mong đợi
  const formattedRecords = records.map(r => ({
    id: r.id,
    ly_do: r.ly_do,
    trang_thai: r.trang_thai,
    ket_qua: r.ket_qua,
    bat_dau_luc: r.bat_dau_luc,
    hoan_thanh_luc: r.hoan_thanh_luc,
    ghi_chu: r.ghi_chu,
    identified_assets: {
      id: r.thiet_bi_id,
      asset_code: r.ma_tai_san,
      asset_name: r.ten_tai_san,
      serial_number: r.so_serial
    },
    rental_orders: r.don_thue_id ? {
      id: r.don_thue_id,
      order_code: r.ma_don
    } : null,
    users_maintenance_records_started_byTousers: r.nguoi_tao_id ? {
      full_name: r.nguoi_tao_ho_ten
    } : null
  }));

  return {
    records: formattedRecords,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function createMaintenanceRecord(staffId, data) {
  const { assetId, reason, note } = data;

  if (!assetId || !reason) {
    const error = new Error("assetId và reason là bắt buộc");
    error.statusCode = 400;
    throw error;
  }

  // Tìm thiết bị vật lý
  const assets = await prisma.$queryRaw`
    SELECT id, trang_thai, vi_tri_hien_tai_id FROM thiet_bi_vat_ly WHERE id = ${assetId}::uuid
  `;

  if (!assets || assets.length === 0) {
    const error = new Error("Không tìm thấy tài sản");
    error.statusCode = 404;
    throw error;
  }

  const asset = assets[0];

  const record = await prisma.$transaction(async (tx) => {
    // 1. Tạo phiếu bảo trì (trang_thai = 'DANG_XU_LY')
    const newRecord = await tx.$queryRaw`
      INSERT INTO phieu_bao_tri (id, thiet_bi_id, ly_do, trang_thai, nguoi_tao_id, bat_dau_luc, ghi_chu)
      VALUES (gen_random_uuid(), ${assetId}::uuid, ${reason}, 'DANG_XU_LY', ${staffId}::uuid, NOW(), ${note || ""})
      RETURNING id, thiet_bi_id, ly_do, trang_thai, nguoi_tao_id, bat_dau_luc, ghi_chu
    `;

    // 2. Cập nhật trạng thái thiết bị vật lý -> BAO_TRI
    await tx.$executeRaw`
      UPDATE thiet_bi_vat_ly
      SET trang_thai = 'BAO_TRI', updated_at = NOW()
      WHERE id = ${assetId}::uuid
    `;

    // 3. Thêm lịch sử di chuyển thiết bị
    await tx.$executeRaw`
      INSERT INTO lich_su_di_chuyen_thiet_bi (
        id, thiet_bi_id, vi_tri_truoc_id, vi_tri_sau_id, 
        trang_thai_truoc, trang_thai_sau, loai_di_chuyen, 
        ghi_chu, nguoi_thuc_hien_id, created_at
      )
      VALUES (
        gen_random_uuid(), ${assetId}::uuid, ${asset.vi_tri_hien_tai_id}::uuid, ${asset.vi_tri_hien_tai_id}::uuid,
        ${asset.trang_thai}, 'BAO_TRI', 'BAO_TRI',
        ${reason}, ${staffId}::uuid, NOW()
      )
    `;

    return newRecord[0];
  });

  // Map ngược lại định dạng cũ cho controller/FE
  return {
    id: record.id,
    asset_id: record.thiet_bi_id,
    reason: record.ly_do,
    status: record.trang_thai,
    started_by: record.nguoi_tao_id,
    started_at: record.bat_dau_luc,
    note: record.ghi_chu
  };
}

module.exports = { getMaintenanceRecords, createMaintenanceRecord };
