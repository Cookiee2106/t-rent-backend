-- Add status support for mau_thiet_bi

INSERT INTO trang_thai_he_thong (id, nhom_trang_thai, ma_trang_thai, ten_trang_thai, mo_ta, thu_tu)
VALUES
  (601, 'MAU_THIET_BI', 'HIEN_THI', 'Hiển thị', 'Mẫu thiết bị đang được hiển thị cho khách hàng', 1),
  (602, 'MAU_THIET_BI', 'DA_AN', 'Đã ẩn', 'Mẫu thiết bị đã bị ẩn khỏi các API khách hàng', 2)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE mau_thiet_bi
ADD COLUMN IF NOT EXISTS trang_thai INT;

UPDATE mau_thiet_bi
SET trang_thai = 601
WHERE trang_thai IS NULL;

ALTER TABLE mau_thiet_bi
ALTER COLUMN trang_thai SET DEFAULT 601;

ALTER TABLE mau_thiet_bi
ALTER COLUMN trang_thai SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mau_thiet_bi_trang_thai_fkey'
  ) THEN
    ALTER TABLE mau_thiet_bi
    ADD CONSTRAINT mau_thiet_bi_trang_thai_fkey
    FOREIGN KEY (trang_thai) REFERENCES trang_thai_he_thong(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mau_thiet_bi_trang_thai
ON mau_thiet_bi(trang_thai);
