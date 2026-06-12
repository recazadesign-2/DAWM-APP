# خطة التنفيذ: Offline-First + PWA + إشعارات الصلاة

طلبك يتضمن ثلاث ميزات كبيرة مترابطة. سأنفذها على ثلاث مراحل متتالية لضمان الجودة:

## المرحلة 1 — PWA كامل (الأساس)

**الهدف:** تطبيق قابل للتثبيت على الهاتف مع Splash واسم وأيقونة.

- إضافة `vite-plugin-pwa` مع `generateSW` و `registerType: autoUpdate`.
- `public/manifest.webmanifest` كامل: name=داوم، short_name، theme_color، background_color، display=standalone، lang=ar، dir=rtl، icons (192, 512, maskable).
- توليد أيقونات التطبيق (192, 512, maskable, apple-touch-icon) من شعار داوم الحالي.
- Wrapper آمن للتسجيل: لا يسجّل في Lovable preview/iframe/dev، يدعم `?sw=off` لإيقاف SW.
- meta tags في `__root.tsx`: manifest, theme-color, apple-touch-icon, apple-mobile-web-app-capable.
- الحفاظ على `public/sw.js` الحالي للـ Push (دمج منطقي عبر importScripts أو فصل بمسار مختلف للـ PWA SW).

## المرحلة 2 — Offline-First للمصحف والتقدم

**الهدف:** قراءة المصحف وتسجيل التقدم بدون إنترنت + مزامنة تلقائية عند العودة.

- **Caching strategies** في `vite-plugin-pwa`:
  - HTML navigations → `NetworkFirst` (مع fallback لـ offline).
  - صور صفحات المصحف (CDN) → `CacheFirst` مع expiration (90 يوم، 700 صفحة).
  - JS/CSS مبنية (hashed) → `CacheFirst`.
  - استثناء `/~oauth` و `/api/`.
- **Pre-cache ذكي للمصحف:** تحميل مسبق للصفحات المجاورة (current ± 3) عند فتح صفحة قراءة.
- **Outbox للمزامنة:** طابور محلي في IndexedDB/localStorage للعمليات (تقدم القراءة، bookmarks، dhikr) عند فقد الاتصال؛ flush تلقائي عند رجوع `online` event.
- إضافة `online/offline` indicator خفيف في الواجهة.

## المرحلة 3 — إشعارات أوقات الصلاة الدقيقة

**الهدف:** إشعار في كل وقت صلاة حسب موقع المستخدم + تذكير الورد اليومي.

- البنية التحتية موجودة بالفعل (`user_prayer_settings`, `push_subscriptions`, `adhan`, `web-push`, `prayer-tick` route).
- ما ينقص:
  - واجهة في `/prayer` أو `/settings` لطلب الموقع (Geolocation) وحفظه + اختيار طريقة الحساب والمذهب وتشغيل/تعطيل كل صلاة.
  - تسجيل push subscription تلقائياً عند تفعيل المستخدم للإشعارات.
  - cron job (pg_cron) كل دقيقة يستدعي `/api/public/hooks/prayer-tick`.
  - إعداد VAPID secrets (سأطلب من المستخدم لو لم تكن موجودة).
  - تذكير الورد اليومي: server-side عبر cron منفصل في الساعة المختارة بدلاً من المؤقت المحلي الحالي (الذي يتوقف عند إغلاق المتصفح).

## ملاحظات تقنية
- Lovable preview/iframe: SW لن يعمل (متعمد)، الميزات تظهر فقط على الموقع المنشور.
- VAPID keys: مطلوبة لإشعارات Push. لو غير موجودة سأطلبها.

## ترتيب التنفيذ المقترح
أبدأ الآن بـ **المرحلة 1 (PWA)** فهي الأساس، ثم 2، ثم 3. هل توافق على الخطة أم تريد تعديل الترتيب أو التركيز على مرحلة واحدة فقط أولاً؟
