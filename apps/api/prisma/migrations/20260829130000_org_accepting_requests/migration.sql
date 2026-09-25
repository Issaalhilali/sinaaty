-- «مشغولون الآن»: إيقاف مؤقت لاستقبال طلبات السوق — المطابقة تستثني من أطفأها.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accepting_requests boolean NOT NULL DEFAULT true;
