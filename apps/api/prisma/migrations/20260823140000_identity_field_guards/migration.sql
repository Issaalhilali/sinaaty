-- جرد حقول الهوية (docs/design/identity-fields-audit.md): كل حقل يظهر في مستند قانوني أو يعمل هوية
-- دخول يُحرس في القاعدة لا في الـDTO وحده — لأن البذور والأدوات و UPDATE اليدوي تكتب تحت الطبقة.
-- أُضيفت وصفر صف مخالف في القاعدة، أي بلا ترحيل بيانات: أرخص لحظة ممكنة قبل التجربة.

-- السجل التجاري: يُطبع على الفاتورة الضريبية بجوار الرقم الضريبي المحروس أصلاً.
ALTER TABLE organizations
  ADD CONSTRAINT org_cr_format CHECK (cr_number IS NULL OR cr_number ~ '^[0-9]{10}$');

-- الجوال: هوية الدخول وقناة رمز التوقيع — رقم مشوّه يعني حساباً لا يُدخل إليه أبداً.
ALTER TABLE users
  ADD CONSTRAINT user_phone_e164_saudi CHECK (phone_e164 ~ '^\+9665[0-9]{8}$');

-- رقم الهيكل: يحكم توافق القطع وسجل المركبة؛ الحروف I/O/Q ممنوعة في معيار VIN.
ALTER TABLE vehicles
  ADD CONSTRAINT vehicle_vin_format CHECK (vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$');
