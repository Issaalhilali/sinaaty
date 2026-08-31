-- صورة واجهة المنشأة: وجه الورشة أمام الضيف — logo_media_id كان موجوداً بلا أخ للغلاف.
-- (قابلة لإعادة التطبيق: هجرة التأسيس تُعاد كتابتها من schema.sql — CLAUDE.md §2)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cover_media_id uuid;
DO $$ BEGIN
  ALTER TABLE organizations ADD CONSTRAINT fk_orgs_cover FOREIGN KEY (cover_media_id) REFERENCES media_assets(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
