# MediaPipe Tasks Vision (مستضاف محلياً)

يُستخدم في لوحة الإدارة ← الاستيراد من إنستغرام لفحص الصور (هل يظهر فيها شخص) داخل متصفح المالك.
الملفات هنا حتى لا يعتمد المتجر على خدمة خارجية (jsDelivr و Google Storage) عند التشغيل.

| الملف | المصدر |
| --- | --- |
| `vision_bundle.mjs`, `wasm/vision_wasm_internal.{js,wasm}` | npm: `@mediapipe/tasks-vision@0.10.35` (Apache-2.0) — نسخة SIMD فقط (كل المتصفحات منذ 2021) |
| `models/blaze_face_short_range.tflite` | https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite |
| `models/efficientdet_lite0.tflite` | https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite |

البصمات في `SHA256SUMS`. للتحديث: غيّر الإصدار في `src/lib/instagram/peopleScan.ts` ونزّل الملفات نفسها ثم أعد حساب البصمات.
الترخيص: Apache License 2.0 (Google LLC).
