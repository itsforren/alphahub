-- Change default delivery_status from 'pending' to null
-- Only leads processed through webhook will have delivery tracking
ALTER TABLE leads ALTER COLUMN delivery_status SET DEFAULT null;