-- Step 20 (ZATCA Phase 2): archive the signed UBL document with the invoice.
-- ZATCA requires the signed XML to be retained for 6 years; keeping it next to the invoice makes
-- re-submission and audit possible without depending on object storage availability.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS zatca_xml text;
