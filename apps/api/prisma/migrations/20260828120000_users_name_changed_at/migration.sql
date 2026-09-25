-- الاسم يوقّع الاعتمادات — تقلبه يهدم حجيتها. آخر تغيير يُختم هنا والتطبيق يفرض المهلة.
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_changed_at timestamptz;
