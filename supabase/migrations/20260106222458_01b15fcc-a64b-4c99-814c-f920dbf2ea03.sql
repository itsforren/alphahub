-- Rename email column to phone in agreement_otps table
ALTER TABLE agreement_otps RENAME COLUMN email TO phone;

-- Drop old index if exists and create new one for phone
DROP INDEX IF EXISTS agreement_otps_email_idx;
CREATE INDEX IF NOT EXISTS agreement_otps_phone_idx ON agreement_otps(phone);