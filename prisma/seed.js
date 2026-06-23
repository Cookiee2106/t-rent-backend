require("dotenv").config({ path: ".env" });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const IMG = (name) =>
  `https://placehold.co/600x400?text=${encodeURIComponent(name)}`;

// Helper: chỉ INSERT nếu chưa tồn tại (dùng cho bảng không có UNIQUE)
async function insertIfNotExists(table, setClause, values, conditionCol, conditionVal) {
  const check = await pool.query(
    `SELECT id FROM ${table} WHERE ${conditionCol} = $1`,
    [conditionVal]
  );
  if (check.rows.length > 0) {
    console.log(`  ⏭️  ${table}: đã tồn tại (id=${check.rows[0].id})`);
    return check.rows[0].id;
  }
  const r = await pool.query(
    `INSERT INTO ${table} ${setClause} RETURNING id`,
    values
  );
  return r.rows[0]?.id;
}

async function run(label, query, params) {
  const r = await pool.query(query, params);
  console.log(`  ✅ ${label}`);
  return r;
}

async function main() {
  console.log("\n🚀 BẮT ĐẦU SEED...\n");

  // ============================================================
  // ① users
  // ============================================================
  console.log("① USERS");
  const PASS = await bcrypt.hash("123456", 10);

  const customer = await run(
    "Tạo khách hàng Nguyễn Văn A",
    `INSERT INTO users (full_name, email, phone, password_hash, role, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    ["Nguyễn Văn A", "customer@test.com", "0901234567", PASS, "CUSTOMER", "ACTIVE"]
  );
  const customerId = customer.rows[0].id;

  await run(
    "Tạo nhân viên Nguyễn Văn B",
    `INSERT INTO users (full_name, email, phone, password_hash, role, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id`,
    ["Nguyễn Văn B", "staff@test.com", "0901234568", PASS, "STAFF", "ACTIVE"]
  );

  // ============================================================
  // ② customer_profiles
  // ============================================================
  console.log("\n② CUSTOMER PROFILES");
  const profile = await run(
    "Tạo hồ sơ khách hàng (APPROVED)",
    `INSERT INTO customer_profiles (user_id, address, identity_number, verification_status)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id) DO UPDATE SET verification_status = EXCLUDED.verification_status
     RETURNING id`,
    [customerId, "123 Nguyễn Huệ, Q1, TP.HCM", "079201001234", "APPROVED"]
  );
  const profileId = profile.rows[0].id;

  // ============================================================
  // ③ customer_verifications (không có UNIQUE constraint)
  // ============================================================
  console.log("\n③ CUSTOMER VERIFICATIONS");
  await insertIfNotExists(
    "customer_verifications",
    "(customer_id, identity_number, front_image_url, back_image_url, status) VALUES ($1,$2,$3,$4,$5)",
    [profileId, "079201001234", IMG("CCCD Mat Truoc"), IMG("CCCD Mat Sau"), "APPROVED"],
    "customer_id", profileId
  );

  // ============================================================
  // ④ categories
  // ============================================================
  console.log("\n④ CATEGORIES");
  const catCamera = await run(
    "Danh mục Máy ảnh",
    `INSERT INTO categories (name, status) VALUES ($1,$2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    ["Máy ảnh", "ACTIVE"]
  );
  const catFlycam = await run(
    "Danh mục Flycam",
    `INSERT INTO categories (name, status) VALUES ($1,$2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    ["Flycam", "ACTIVE"]
  );

  const catCamId = catCamera.rows[0]?.id;
  const catFlyId = catFlycam.rows[0]?.id;

  // ============================================================
  // ⑤ brands
  // ============================================================
  console.log("\n⑤ BRANDS");
  const brandCanon = await run(
    "Thương hiệu Canon",
    `INSERT INTO brands (name, status) VALUES ($1,$2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    ["Canon", "ACTIVE"]
  );
  const brandSony = await run(
    "Thương hiệu Sony",
    `INSERT INTO brands (name, status) VALUES ($1,$2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    ["Sony", "ACTIVE"]
  );
  const brandDJI = await run(
    "Thương hiệu DJI",
    `INSERT INTO brands (name, status) VALUES ($1,$2)
     ON CONFLICT (name) DO NOTHING RETURNING id`,
    ["DJI", "ACTIVE"]
  );

  const canId = brandCanon.rows[0]?.id;
  const sonId = brandSony.rows[0]?.id;
  const djiId = brandDJI.rows[0]?.id;

  // ============================================================
  // ⑥ storage_locations (không có UNIQUE)
  // ============================================================
  console.log("\n⑥ STORAGE LOCATIONS");
  const finalLocId = await insertIfNotExists(
    "storage_locations",
    "(area, shelf, level, location_type, status) VALUES ($1,$2,$3,$4,$5)",
    ["Kho A", "Kệ 1", "Tầng 1", "STORAGE", "ACTIVE"],
    "area", "Kho A"
  );

  // ============================================================
  // ⑦ product_models (không có UNIQUE, dùng insertIfNotExists)
  // ============================================================
  console.log("\n⑦ PRODUCT MODELS");
  const pm1Id = await insertIfNotExists(
    "product_models",
    `(category_id, brand_id, name, description, image_url,
      daily_price, deposit_amount, buffer_hours, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [catCamId, canId, "Canon EOS R5", "Máy ảnh mirrorless full-frame 45MP",
     IMG("Canon EOS R5"), 500000, 5000000, 2, "ACTIVE"],
    "name", "Canon EOS R5"
  );
  const pm2Id = await insertIfNotExists(
    "product_models",
    `(category_id, brand_id, name, description, image_url,
      daily_price, deposit_amount, buffer_hours, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [catCamId, sonId, "Sony A7 IV", "Máy ảnh mirrorless full-frame 33MP",
     IMG("Sony A7 IV"), 400000, 4000000, 2, "ACTIVE"],
    "name", "Sony A7 IV"
  );
  const pm3Id = await insertIfNotExists(
    "product_models",
    `(category_id, brand_id, name, description, image_url,
      daily_price, deposit_amount, buffer_hours, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [catFlyId, djiId, "DJI Mavic 3", "Flycam chuyên nghiệp 4/3 CMOS 20MP",
     IMG("DJI Mavic 3"), 600000, 6000000, 2, "ACTIVE"],
    "name", "DJI Mavic 3"
  );

  // ============================================================
  // ⑧ identified_assets (asset_code UNIQUE — on conflict hợp lệ)
  // ============================================================
  console.log("\n⑧ IDENTIFIED ASSETS");

  async function seedAssets(pmId, brandId, brandCode, baseSerial, count) {
    for (let i = 1; i <= count; i++) {
      const code = `${brandCode}-${String(i).padStart(3, "0")}`;
      await run(
        `  Tài sản ${code}`,
        `INSERT INTO identified_assets
           (asset_code, asset_name, asset_type, brand_id, product_model_id,
            serial_number, default_location_id, current_location_id, status,
            rental_count, maintenance_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (asset_code) DO NOTHING`,
        [
          code, `${brandCode} #${i}`, "IDENTIFIED",
          brandId, pmId,
          `${baseSerial}-${i}`,
          finalLocId, finalLocId,
          "AVAILABLE", 0, 10,
        ]
      );
    }
  }

  if (pm1Id) await seedAssets(pm1Id, canId, "CAM-R5", "CR5-2024", 2);
  if (pm2Id) await seedAssets(pm2Id, sonId, "CAM-A74", "A74-2024", 2);
  if (pm3Id) await seedAssets(pm3Id, djiId, "FLY-MAV3", "MAV3-2024", 2);

  // ============================================================
  // ⑨ rental_terms (không có UNIQUE)
  // ============================================================
  console.log("\n⑨ RENTAL TERMS");
  const termId = await insertIfNotExists(
    "rental_terms",
    "(version, content, content_hash, status) VALUES ($1,$2,$3,$4)",
    ["v1.0",
     "Điều khoản thuê thiết bị T-Rent. Khách hàng có trách nhiệm bảo quản thiết bị trong thời gian thuê. Mọi hư hỏng, mất mát do khách hàng gây ra sẽ được bồi thường theo giá trị thiết bị.",
     "hash_v1_placeholder", "ACTIVE"],
    "version", "v1.0"
  );

  // ============================================================
  // ⑩ carts (không có UNIQUE)
  // ============================================================
  console.log("\n⑩ CARTS");
  const cartId = await insertIfNotExists(
    "carts",
    "(customer_id, status) VALUES ($1,$2)",
    [profileId, "ACTIVE"],
    "customer_id", profileId
  );

  // ============================================================
  // ⑪ cart_items (không có UNIQUE)
  // ============================================================
  console.log("\n⑪ CART ITEMS");
  async function seedCartItem(pmId, name, price) {
    if (!cartId || !pmId) return;
    const exists = await pool.query(
      `SELECT 1 FROM cart_items WHERE cart_id = $1 AND product_model_id = $2`,
      [cartId, pmId]
    );
    if (exists.rows.length > 0) {
      console.log(`  ⏭️  Cart item ${name}: đã tồn tại`);
      return;
    }
    await run(
      `Cart item: ${name}`,
      `INSERT INTO cart_items
         (cart_id, product_model_id, quantity,
          start_date, end_date,
          daily_price_snapshot, deposit_amount_snapshot, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [cartId, pmId, 1, "2026-07-01", "2026-07-05", price, price * 10, "ACTIVE"]
    );
  }

  await seedCartItem(pm1Id, "Canon EOS R5", 500000);
  await seedCartItem(pm3Id, "DJI Mavic 3", 600000);

  // ============================================================
  // Helper: thêm item vào đơn (kiểm tra trùng lặp)
  // ============================================================
  async function seedOrderItem(orderId, pmId, label, price, deposit, qty = 1) {
    const exists = await pool.query(
      `SELECT 1 FROM rental_order_items WHERE rental_order_id = $1 AND product_model_id = $2`,
      [orderId, pmId]
    );
    if (exists.rows.length > 0) { console.log(`  ⏭️  Item ${label}: đã tồn tại`); return; }
    await run(
      `Item: ${label}`,
      `INSERT INTO rental_order_items
         (rental_order_id, product_model_id, quantity,
          daily_price_snapshot, deposit_amount_snapshot,
          rental_amount, deposit_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [orderId, pmId, qty, price, deposit, price * qty, deposit * qty, "PENDING"]
    );
  }

  // Helper: thêm đơn + items + payment
  const orderSeeds = [
    {
      code: "2206CANONR5-001", status: "RESERVED",
      start: "2026-07-01", end: "2026-07-05", days: 4,
      rent: 1100000, deposit: 11000000,
      items: [ [pm1Id, "Canon EOS R5", 500000, 5000000, 1], [pm3Id, "DJI Mavic 3", 600000, 6000000, 1] ],
      payStatus: "PAID",
      cancelReason: null,
      extra: "Có thể hủy",
    },
    {
      code: "2206CANA74-002", status: "RENTING",
      start: "2026-07-10", end: "2026-07-15", days: 5,
      rent: 2000000, deposit: 4000000,
      items: [ [pm2Id, "Sony A7 IV", 400000, 4000000, 1] ],
      payStatus: "PAID",
      cancelReason: null,
      extra: "Đã bàn giao, không thể hủy",
    },
    {
      code: "2206DJIMAV3-003", status: "CANCELLED",
      start: "2026-06-15", end: "2026-06-20", days: 5,
      rent: 3000000, deposit: 6000000,
      items: [ [pm3Id, "DJI Mavic 3", 600000, 6000000, 1] ],
      payStatus: "CANCELLED",
      cancelReason: "Khách hàng yêu cầu hủy",
      extra: "Đã hủy",
    },
  ];

  console.log("\n⑫ RENTAL ORDERS + ITEMS + PAYMENTS");

  for (const o of orderSeeds) {
    // Xóa dữ liệu handover/return cũ nếu có (tránh unique constraint)
    await pool.query(
      `DELETE FROM return_charges WHERE return_record_id IN (
         SELECT id FROM return_records WHERE rental_order_id IN (
           SELECT id FROM rental_orders WHERE order_code = $1
         )
       )`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM return_record_details WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM rental_record_files WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM maintenance_records WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM return_records WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM asset_movements WHERE related_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM handover_record_details WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM handover_records WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `DELETE FROM rental_order_assets WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)`,
      [o.code]
    );
    await pool.query(
      `UPDATE identified_assets SET status = 'AVAILABLE'
       WHERE id IN (
         SELECT asset_id FROM rental_order_assets
         WHERE rental_order_id IN (SELECT id FROM rental_orders WHERE order_code = $1)
       )`,
      [o.code]
    );

    const existingOrder = await pool.query(
      `SELECT id FROM rental_orders WHERE order_code = $1`,
      [o.code]
    );

    let orderId;
    if (existingOrder.rows.length > 0) {
      orderId = existingOrder.rows[0].id;
      // Reset status nếu đơn đã bị thay đổi (ví dụ CANCELLED -> RESERVED)
      await pool.query(
        `UPDATE rental_orders SET
           status = $1,
           start_date = $2, end_date = $3, rental_days = $4,
           total_rental_amount = $5, total_deposit_amount = $6,
           expired_at = $7, cancelled_at = $8, cancel_reason = $9,
           updated_at = NOW()
         WHERE id = $10`,
        [
          o.status, o.start, o.end, o.days,
          o.rent, o.deposit,
          o.status === "RESERVED" ? new Date(Date.now() + 30 * 60 * 1000) : null,
          o.status === "CANCELLED" ? new Date() : null,
          o.cancelReason,
          orderId,
        ]
      );
      console.log(`  🔄 Đơn ${o.code} → reset về ${o.status}`);
    } else {
      const r = await pool.query(
        `INSERT INTO rental_orders
           (order_code, customer_id, start_date, end_date, rental_days,
            total_rental_amount, total_deposit_amount, status,
            expired_at, cancelled_at, cancel_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [
          o.code, profileId, o.start, o.end, o.days,
          o.rent, o.deposit, o.status,
          o.status === "RESERVED" ? new Date(Date.now() + 30 * 60 * 1000) : null,
          o.status === "CANCELLED" ? new Date() : null,
          o.cancelReason,
        ]
      );
      orderId = r.rows[0].id;
      console.log(`  ✅ Đơn ${o.code} → tạo mới`);
    }

    for (const [pmId, label, price, deposit, qty] of o.items) {
      if (pmId) await seedOrderItem(orderId, pmId, label, price, deposit, qty);
    }

    const existPay = await pool.query(
      `SELECT id FROM payments WHERE rental_order_id = $1`,
      [orderId]
    );

    if (existPay.rows.length > 0) {
      await pool.query(
        `UPDATE payments SET status = $1 WHERE rental_order_id = $2`,
        [o.payStatus, orderId]
      );
      console.log(`  🔄 Payment đơn ${o.code} → reset về ${o.payStatus}`);
    } else {
      await pool.query(
        `INSERT INTO payments
           (rental_order_id, payment_type, amount, method, status, transaction_code, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          orderId, "DEPOSIT",
          o.deposit, "ONLINE_PAYMENT",
          o.payStatus,
          `VNPAY-${o.code}`,
          o.payStatus === "PAID" ? new Date() : null,
        ]
      );
      console.log(`  ✅ Payment đơn ${o.code} → tạo mới`);
    }
  }

  // ============================================================
  // ⑬ Tạo handover data cho đơn RENTING (sẵn sàng test return)
  // ============================================================
  console.log("\n⑬ HANDOVER DATA CHO ĐƠN RENTING");

  for (const o of orderSeeds) {
    if (o.status !== "RENTING") continue;

    const orderRes = await pool.query(
      `SELECT id FROM rental_orders WHERE order_code = $1`, [o.code]
    );
    if (orderRes.rows.length === 0) continue;
    const orderId = orderRes.rows[0].id;

    // Lấy staff_id
    const staffRes = await pool.query(
      `SELECT id FROM users WHERE email = 'staff@test.com' LIMIT 1`
    );
    const staffId = staffRes.rows[0]?.id;
    if (!staffId) continue;

    // Lấy rental_order_items
    const itemsRes = await pool.query(
      `SELECT id, product_model_id, quantity FROM rental_order_items WHERE rental_order_id = $1`,
      [orderId]
    );

    for (const item of itemsRes.rows) {
      // Lấy asset AVAILABLE cho product_model này
      const assetRes = await pool.query(
        `SELECT id, asset_code, serial_number, identification_note, current_location_id
         FROM identified_assets
         WHERE product_model_id = $1 AND status = 'AVAILABLE' AND deleted_at IS NULL
         LIMIT $2`,
        [item.product_model_id, item.quantity]
      );

      if (assetRes.rows.length === 0) {
        console.log(`  ⚠️  Không đủ assets cho item ${item.product_model_id}`);
        continue;
      }

      // Tạo handover_records
      const handoverRes = await pool.query(
        `INSERT INTO handover_records (rental_order_id, staff_id, handover_at, note, status)
         VALUES ($1, $2, NOW(), 'Seed: bàn giao tự động', 'COMPLETED')
         RETURNING id`,
        [orderId, staffId]
      );
      const handoverId = handoverRes.rows[0].id;

      for (const asset of assetRes.rows) {
        // Tạo rental_order_assets
        const roaRes = await pool.query(
          `INSERT INTO rental_order_assets
             (rental_order_id, rental_order_item_id, asset_id,
              asset_code_snapshot, serial_snapshot, identification_note_snapshot,
              condition_before, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'DELIVERED')
           RETURNING id`,
          [orderId, item.id, asset.id,
           asset.asset_code, asset.serial_number, asset.identification_note,
           'Seed: tài sản tốt']
        );
        const roaId = roaRes.rows[0].id;

        // Tạo handover_record_details
        await pool.query(
          `INSERT INTO handover_record_details
             (handover_record_id, rental_order_id, rental_order_asset_id,
              delivered_quantity, condition_note)
           VALUES ($1, $2, $3, 1, 'Seed: bàn giao tự động')`,
          [handoverId, orderId, roaId]
        );

        // Update identified_assets → RENTED
        await pool.query(
          `UPDATE identified_assets SET status = 'RENTED' WHERE id = $1`,
          [asset.id]
        );

        // Tạo asset_movement
        await pool.query(
          `INSERT INTO asset_movements
             (asset_id, related_order_id, from_location_id,
              status_before, status_after, movement_type,
              note, created_by)
           VALUES ($1, $2, $3, 'AVAILABLE', 'RENTED', 'DELIVER',
                   $4, $5)`,
          [asset.id, orderId, asset.current_location_id,
           `Seed: bàn giao cho đơn ${o.code}`, staffId]
        );
      }

      // Update rental_order_items → RENTED
      await pool.query(
        `UPDATE rental_order_items SET status = 'RENTED', updated_at = NOW()
         WHERE id = $1`,
        [item.id]
      );
    }

    console.log(`  ✅ Đơn ${o.code} → đã tạo handover data (sẵn sàng test return)`);
  }

  // ============================================================
  // KẾT THÚC
  // ============================================================
  console.log("\n========================================");
  console.log("  ✅ SEED HOÀN TẤT");
  console.log("========================================");
  console.log("");
  console.log("📋 DANH SÁCH TÀI KHOẢN:");
  console.log("  Khách hàng: customer@test.com / 123456");
  console.log("  Nhân viên:  staff@test.com    / 123456");
  console.log("");
  console.log("📋 SẢN PHẨM:");
  console.log("  • Canon EOS R5  — 500k/ngày, cọc 5tr (2 máy)");
  console.log("  • Sony A7 IV    — 400k/ngày, cọc 4tr (2 máy)");
  console.log("  • DJI Mavic 3   — 600k/ngày, cọc 6tr (2 máy)");
  console.log("");
  console.log("📋 GIỎ HÀNG MẪU:");
  console.log("  • Canon EOS R5 (01-05/07/2026)");
  console.log("  • DJI Mavic 3  (01-05/07/2026)");
  console.log("");
  console.log("📋 ĐƠN MẪU (test order APIs):");
  console.log("  • 2206CANONR5-001 — RESERVED   (có thể hủy)");
  console.log("  • 2206CANA74-002  — RENTING    (đã bàn giao)");
  console.log("  • 2206DJIMAV3-003 — CANCELLED  (đã hủy)");
  console.log("");
  console.log(`📌 UserId khách hàng: ${customerId}`);
  console.log(`   Dùng để test POST /api/rental-otp/send`);
  console.log("");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
