-- Add signature_id column to invoices table
ALTER TABLE IF EXISTS invoices 
ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES user_signatures(id) ON DELETE SET NULL; 