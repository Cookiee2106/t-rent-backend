# T-Rent API Documentation

> Base URL: `https://t-rent-backend.onrender.com` (hoặc `http://localhost:5000` local)

## Authentication

- **Customer APIs**: `Authorization: Bearer <customer_token>`
- **Admin APIs**: `Authorization: Bearer <staff_admin_token>`
- Token lấy từ endpoint `/api/auth/login`

---

## 1. Kiểm tra giỏ hàng — Đặt thuê

### `POST /api/orders/preview`

Kiểm tra giỏ hàng, tính tiền thuê, tiền cọc, kiểm tra khả dụng.

> ⚠️ Chưa implement

---

## 2. Gửi OTP xác nhận đặt thuê

### `POST /api/orders/send-otp`

> ⚠️ Chưa implement — hiện tại dùng `/api/rental-otp/send`

---

## 3. Xác thực OTP đặt thuê

### `POST /api/orders/verify-otp`

> ⚠️ Chưa implement — hiện tại dùng `/api/rental-otp/verify`

---

## OTP Module (hiện tại)

### `POST /api/rental-otp/send`

**Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "userId": "uuid-của-user"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Đã gửi mã OTP xác thực",
  "data": {
    "otpId": "uuid",
    "expiresAt": "2026-06-23T10:00:00.000Z",
    "sentTo": "user@email.com",
    "otpCode": "123456"
  }
}
```

### `POST /api/rental-otp/verify`

**Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "otpId": "uuid-từ-send-otp",
  "otpCode": "123456",
  "userId": "uuid-của-user"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Xác thực OTP thành công. Chuyển sang bước thanh toán cọc.",
  "data": {
    "otpId": "uuid",
    "verifiedAt": "2026-06-23T10:00:00.000Z"
  }
}
```

---

## 5. Khách hàng xem danh sách đơn hàng

### `GET /api/customer/orders`

**Headers:** `Authorization: Bearer <token>`

**Query params:** `?page=1&limit=20`

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": [
    {
      "id": "uuid",
      "order_code": "2206CANONR5-001",
      "status": "RESERVED",
      "created_at": "2026-06-23T...",
      "rental_order_items": [
        {
          "id": "uuid",
          "product_models": {
            "id": "uuid",
            "name": "Máy ảnh Canon R5",
            "image_url": "https://..."
          }
        }
      ],
      "payments": [
        {
          "status": "PAID",
          "amount": 500000,
          "method": "CASH"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 6. Khách hàng xem chi tiết đơn hàng

### `GET /api/customer/orders/:id`

**Headers:** `Authorization: Bearer <token>`

**Response 200:** Chi tiết đơn hàng kèm:
- `rental_order_items[].product_models` (có `description`)
- `payments` (đầy đủ)
- `handover_records` (kèm staff `full_name`)
- `return_records`

---

## 7. Khách hàng hủy đơn hàng

### `PATCH /api/customer/orders/:id/cancel`

**Headers:** `Authorization: Bearer <token>`

**Điều kiện:** Chỉ hủy được khi `status === "RESERVED"`

**Request Body:** Không cần body

**Response 200:**
```json
{
  "success": true,
  "message": "Hủy đơn hàng thành công",
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelled_at": "2026-06-23T...",
    "cancel_reason": "Khách hàng yêu cầu hủy"
  }
}
```

---

## 8. Admin xem danh sách đơn hàng

### `GET /api/admin/orders`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)

**Query params:** `?page=1&limit=20&status=RESERVED&keyword=2206`

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": [ ...orders ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 9. Admin xem chi tiết đơn hàng

### `GET /api/admin/orders/:id`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)

**Response 200:** Chi tiết đầy đủ giống customer + thêm thông tin staff.

---

## 10. Lấy tài sản sẵn sàng để bàn giao

### `GET /api/admin/orders/:id/available-assets`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách tài sản sẵn sàng thành công",
  "data": [
    {
      "rental_order_item_id": "uuid",
      "product_model_id": "uuid",
      "product_model": {
        "id": "uuid",
        "name": "Máy ảnh Canon R5"
      },
      "quantity": 2,
      "availableAssets": [
        {
          "id": "uuid",
          "asset_code": "CANONR5-001",
          "serial_number": "SN123456",
          "status": "AVAILABLE"
        }
      ]
    }
  ]
}
```

---

## 11. Upload hợp đồng giấy

### `POST /api/admin/orders/:id/contract-file`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | File (single) | Yes |

**Điều kiện:** Order phải có status `RESERVED` hoặc `RENTING`

**Response 201:**
```json
{
  "success": true,
  "message": "Tải lên hợp đồng thành công",
  "data": {
    "contractId": "uuid",
    "contractCode": "HD-2306-001",
    "fileUrl": "https://res.cloudinary.com/.../contract.pdf"
  }
}
```

---

## 12. Upload ảnh khi bàn giao

### `POST /api/admin/orders/:id/handover-images`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | File[] (max 10) | No | File ảnh upload |
| `imageUrls` | string (JSON) | No | Mảng URLs dạng `["url1","url2"]` |

> Có thể dùng `images` hoặc `imageUrls` hoặc cả hai.

**Response 201:**
```json
{
  "success": true,
  "message": "Tải lên ảnh bàn giao thành công",
  "data": {
    "images": [
      {
        "fileUrl": "https://res.cloudinary.com/.../image.jpg",
        "originalName": "handover_1.jpg",
        "fileType": "image/jpeg",
        "fileSize": 102400
      }
    ]
  }
}
```

---

## 13. Lập phiếu bàn giao

### `POST /api/admin/orders/:id/handover`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assets` | string (JSON) | **Yes** | Mảng object tài sản bàn giao (xem dưới) |
| `images` | File[] (max 10) | No | File ảnh bàn giao |
| `imageUrls` | string (JSON) | No | Mảng URLs ảnh |
| `note` | string | No | Ghi chú |

**`assets` format:**
```json
[
  {
    "product_model_id": "uuid",
    "identified_asset_ids": ["uuid1", "uuid2"],
    "condition_note": "Tình trạng tốt"
  }
]
```

> ⚠️ `assets` và `imageUrls` gửi dưới dạng JSON string trong form-data.

**Response 201:**
```json
{
  "success": true,
  "message": "Lập phiếu bàn giao thành công",
  "data": {
    "handoverId": "uuid",
    "detailCount": 2
  }
}
```

> Order status tự động chuyển từ `RESERVED` → `RENTING`

---

## 14. Danh sách hợp đồng chờ thanh lý

### `GET /api/admin/contract-liquidations`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)

**Query params:** `?page=1&limit=20&status=PENDING_RETURN&keyword=2206`

- `status=PENDING_RETURN` → lọc đơn đang `RENTING`
- `keyword` → tìm theo `order_code` hoặc tên khách hàng

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách thanh lý thành công",
  "data": [
    {
      "id": "uuid",
      "order_code": "2206CANA74-002",
      "status": "RENTING",
      "start_date": "2026-06-01",
      "end_date": "2026-06-15",
      "customer_profiles": {
        "full_name": "Nguyễn Văn A"
      },
      "rental_order_items": [...],
      "return_records": [],
      "payments": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

## 15. Xem chi tiết thanh lý

### `GET /api/admin/contract-liquidations/:id`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)

**Response 200:** Chi tiết đơn hàng kèm:
- `customer_profiles` (address, identityNumber, user.email, user.full_name)
- `rental_order_items[].product_models`
- `rental_order_items[].rental_order_assets[].identified_assets`
- `handover_records` (staff, details, images)
- `return_records` (staff, details kèm charges, images, refund/deduction payments)
- `payments`
- `rental_contracts[].contract_files`

---

## 16. Upload ảnh khi trả hàng

### `POST /api/admin/contract-liquidations/:id/return-images`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | File[] (max 10) | No | File ảnh upload |
| `imageUrls` | string (JSON) | No | Mảng URLs dạng `["url1","url2"]` |

**Response 201:**
```json
{
  "success": true,
  "message": "Tải lên ảnh trả hàng thành công",
  "data": {
    "images": [
      {
        "fileUrl": "https://res.cloudinary.com/.../image.jpg",
        "originalName": "return_1.jpg",
        "fileType": "image/jpeg",
        "fileSize": 102400
      }
    ]
  }
}
```

---

## 17. Lập phiếu trả và kiểm kê

### `POST /api/admin/contract-liquidations/:id/return-inspection`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "assets": [
    {
      "rental_order_asset_id": "uuid",
      "is_damaged": false,
      "is_missing": false,
      "condition_note": "Tình trạng tốt",
      "note": ""
    }
  ],
  "imageUrls": [
    {
      "fileUrl": "https://res.cloudinary.com/.../image.jpg",
      "originalName": "return_1.jpg",
      "fileType": "image/jpeg",
      "fileSize": 102400
    }
  ],
  "note": "Trả hàng đúng hạn",
  "result": "VALID"
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `assets` | Array | **Yes** | — |
| `assets[].rental_order_asset_id` | string | **Yes** | — |
| `assets[].is_damaged` | boolean | No | `false` |
| `assets[].is_missing` | boolean | No | `false` |
| `assets[].condition_note` | string | No | — |
| `assets[].note` | string | No | — |
| `imageUrls` | Array | No | `[]` |
| `note` | string | No | — |
| `result` | string | No | `"VALID"` |

> `result` chỉ chấp nhận: `VALID`, `HAS_ISSUE`

**Response 201:**
```json
{
  "success": true,
  "message": "Tạo phiếu thanh lý thành công",
  "data": {
    "returnRecordId": "uuid",
    "detailCount": 1
  }
}
```

---

## 18. Ghi nhận hoàn cọc

### `POST /api/admin/contract-liquidations/:id/refund-deposit`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "amount": 500000,
  "transactionCode": "REF123456",
  "note": "Hoàn cọc đơn 2206CANA74-002"
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `amount` | number | No | `total_deposit_amount` |
| `transactionCode` | string | No | — |
| `note` | string | No | — |

> `payment_type` = `REFUND_DEPOSIT`, `method` = `BANK_TRANSFER` (tự động)

**Response 200:**
```json
{
  "success": true,
  "message": "Hoàn trả tiền cọc thành công",
  "data": {
    "paymentId": "uuid",
    "refundAmount": 500000
  }
}
```

---

## 19. Ghi nhận khấu trừ cọc

### `POST /api/admin/contract-liquidations/:id/deduct-deposit`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "charges": [
    {
      "return_record_detail_id": "uuid",
      "charge_type": "DAMAGED",
      "description": "Vỡ kính lens",
      "amount": 200000
    }
  ],
  "transactionCode": "DEDUCT001",
  "note": "Khấu trừ do hư hỏng"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `charges` | Array | **Yes** | Danh sách khoản khấu trừ |
| `charges[].return_record_detail_id` | string | No | ID chi tiết phiếu trả |
| `charges[].charge_type` | string | **Yes** | `DAMAGED`, `MISSING`, `LATE_RETURN`, `OTHER` |
| `charges[].description` | string | No | Mô tả |
| `charges[].amount` | number | **Yes** | Số tiền khấu trừ |
| `transactionCode` | string | No | Mã giao dịch |
| `note` | string | No | Ghi chú |

> `payment_type` = `DEDUCT_DEPOSIT`, `method` = `CASH` (tự động)
> Tổng các `amount` không được vượt quá `total_deposit_amount`

**Response 200:**
```json
{
  "success": true,
  "message": "Khấu trừ tiền cọc thành công",
  "data": {
    "paymentId": "uuid",
    "deductionAmount": 200000,
    "chargeCount": 1
  }
}
```

---

## 20. Tạo hồ sơ bảo trì

### `POST /api/admin/contract-liquidations/:id/maintenance`

**Headers:** `Authorization: Bearer <token>` (role: STAFF, ADMIN)
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "assetId": "uuid-của-identified_assets",
  "rentalOrderAssetId": "uuid-của-rental_order_assets",
  "reason": "Hư hỏng sau khi thuê",
  "note": "Cần thay lens mới"
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `assetId` | string | **Yes** | — |
| `rentalOrderAssetId` | string | **Yes** | — |
| `reason` | string | No | `"Hư hỏng sau khi thuê"` |
| `note` | string | No | — |

**Response 201:**
```json
{
  "success": true,
  "message": "Tạo phiếu bảo trì thành công",
  "data": {
    "maintenanceId": "uuid",
    "assetId": "uuid",
    "status": "IN_PROGRESS"
  }
}
```

---

## Order Status Flow

```
PENDING_DEPOSIT → (sau khi đặt cọc) → RESERVED
                                     → (bàn giao) → RENTING
                                                   → (thanh lý) → COMPLETED
RESERVED → (hủy) → CANCELLED
```

## DB Constraint Values

| Field | Accepted Values |
|-------|----------------|
| `payments.payment_type` | `DEPOSIT`, `RENTAL_FEE`, `REFUND_DEPOSIT`, `DEDUCT_DEPOSIT` |
| `payments.method` | `CASH`, `BANK_TRANSFER`, `ONLINE_PAYMENT` |
| `return_records.result` | `VALID`, `HAS_ISSUE` |
| `return_records.deposit_result` | `REFUND`, `DEDUCT`, `NO_ACTION` hoặc NULL |
| `return_charges.charge_type` | `DAMAGED`, `MISSING`, `LATE_RETURN`, `OTHER` |

---

## Test Data (từ seed hiện tại)

### Tài khoản đăng nhập

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@test.com` | `123456` |
| Staff | `staff@test.com` | `123456` |

### IDs quan trọng (seed mới nhất)

| Entity | ID |
|--------|----|
| **Customer userId** (Nguyễn Văn A) | `bf7088cb-c294-4bfb-a35e-07ff397ae807` |
| **Profile ID** (customer@test.com) | `4e272bd7-ffb4-4adb-a8db-e4362cf50e73` |
| **Staff userId** (Nguyễn Văn B) | `cbf53979-b5e1-4727-9646-c71e45937593` |
| **Cart ID** (customer@test.com) | `b5e80e5d-3e24-4005-bf9b-17596609789a` |
| **Rental Terms ID** (v1.0) | `ae3aa484-090b-4e09-a3fe-558b68cdd231` |

### Product Models

| ID | Name | Daily Price | Deposit |
|----|------|-------------|---------|
| `5e4bb143-99d1-4648-adb7-4f07666d3143` | Canon EOS R5 | 500,000 | 5,000,000 |
| `6793a27f-ecdd-436b-b3d6-76dc932c6715` | Sony A7 IV | 400,000 | 4,000,000 |
| `c0a5f7c1-f03d-40d3-9092-bd51b1548129` | DJI Mavic 3 | 600,000 | 6,000,000 |

### Orders

| Order Code | Status | ID | Ghi chú |
|------------|--------|----|---------|
| `2206CANONR5-001` | **RESERVED** | `1f5e3382-c5fe-4856-94c3-6a3717ad14df` | Có thể hủy, bàn giao |
| `2206CANA74-002` | COMPLETED | `828190ae-a47d-4ac8-8659-7139fde382d0` | Đã thanh lý xong |
| `2206DJIMAV3-003` | CANCELLED | `74257989-a931-47f4-8f0c-69ff069d4ac0` | Đã hủy |

### Identified Assets (AVAILABLE)

| ID | Asset Code | Product Model |
|----|------------|---------------|
| `3446aeec-01b5-43ab-b78c-9ed8213e799f` | CAM-R5-001 | Canon EOS R5 |
| `5c247eba-b9e1-4c71-9b1d-5d81ee9bcdb7` | CAM-R5-002 | Canon EOS R5 |
| `610c84b1-70ae-4530-8aa5-2c4b52bd6326` | CAM-A74-002 | Sony A7 IV |
| `bd6893c0-1712-4b96-afd0-f8002a0cd063` | FLY-MAV3-001 | DJI Mavic 3 |
| `03720285-1da1-40d8-95da-f74c4f417876` | FLY-MAV3-002 | DJI Mavic 3 |

### Cart Items (customer@test.com — cart: `b5e80e5d-3e24-4005-bf9b-17596609789a`)

| ID | Product | Qty | Dates |
|----|---------|-----|-------|
| `5a3de6ab-2c9b-4df4-8f06-9f5e3e5fc608` | Canon EOS R5 | 1 | 30/06 → 04/07/2026 |
| `f16e80f2-9a99-43ae-8b83-10b359d9e252` | DJI Mavic 3 | 1 | 30/06 → 04/07/2026 |

### Term Acceptances (terms@trent.com)

| ID | Note |
|----|------|
| `ccf78445-f74c-4d2a-8672-febf6ab910ee` | Dùng cho checkout test |

> ⚠️ **Lưu ý:** Sau khi chạy seed lại, order `2206CANA74-002` sẽ quay về trạng thái `RENTING` thay vì `COMPLETED` như hiện tại.

### Các bước test Postman nhanh — sequential flow

#### A. Customer flow
```bash
# 1. Login lấy token
POST /api/auth/login
{ "email": "customer@test.com", "password": "123456" }

# 2. Gửi OTP (dùng userId từ login)
POST /api/rental-otp/send
{ "userId": "bf7088cb-c294-4bfb-a35e-07ff397ae807" }

# 3. Verify OTP
POST /api/rental-otp/verify
{ "otpId": "<otpId từ response>", "otpCode": "<otpCode từ response>", "userId": "bf7088cb-c294-4bfb-a35e-07ff397ae807" }

# 4. Xem danh sách đơn
GET /api/customer/orders

# 5. Xem chi tiết đơn (RESERVED)
GET /api/customer/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df

# 6. Hủy đơn (chỉ RESERVED)
PATCH /api/customer/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df/cancel
```

#### B. Admin flow
```bash
# 1. Login lấy token
POST /api/auth/login
{ "email": "staff@test.com", "password": "123456" }

# 2. Xem danh sách đơn
GET /api/admin/orders

# 3. Xem chi tiết đơn
GET /api/admin/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df

# 4. Lấy available assets
GET /api/admin/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df/available-assets

# 5. Upload contract file (multipart)
POST /api/admin/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df/contract-file
# Body: file = (chọn file PDF/image)

# 6. Upload handover images (multipart)
POST /api/admin/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df/handover-images
# Body: images = (chọn file ảnh)

# 7. Lập phiếu bàn giao (multipart)
POST /api/admin/orders/1f5e3382-c5fe-4856-94c3-6a3717ad14df/handover
# Body:
#   assets = "[{\"product_model_id\":\"5e4bb143-99d1-4648-adb7-4f07666d3143\",\"identified_asset_ids\":[\"3446aeec-01b5-43ab-b78c-9ed8213e799f\"],\"condition_note\":\"Máy mới\"}]"
#   note = "Bàn giao cho khách"
```

#### C. Seed lại để có đơn RENTING test return
```bash
cd BE && node prisma/seed.js
```
Sau seed, chạy tiếp:
```bash
# 8. Danh sách thanh lý
GET /api/admin/contract-liquidations?status=PENDING_RETURN

# 9. Upload return images
POST /api/admin/contract-liquidations/<RENTING-order-id>/return-images

# 10. Lập phiếu trả
POST /api/admin/contract-liquidations/<RENTING-order-id>/return-inspection
```
