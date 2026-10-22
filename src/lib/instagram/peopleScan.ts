/**
 * فحص تلقائي للصور قبل الاستيراد: هل يظهر فيها شخص؟ (وجه، أو جسم يملأ جزءاً كبيراً من الصورة)
 * صور اليد أو المعصم وحدها تمر لأنها تعرض القطعة نفسها. الفحص يجري في متصفح المالك فقط
 * (MediaPipe 0.10.35 مستضاف مع المتجر في public/vendor/mediapipe — مصدر الملفات وبصماتها في NOTICE.md هناك —
 * ويُحمَّل عند فتح صفحة الاستيراد)، والنتيجة اقتراح يراجعه المالك. لا يعتمد المتجر على jsDelivr ولا Google.
 */

const VENDOR = '/vendor/mediapipe';
const FACE_MODEL = `${VENDOR}/models/blaze_face_short_range.tflite`;
const OBJECT_MODEL = `${VENDOR}/models/efficientdet_lite0.tflite`;

/**
 * الحدود مضبوطة على صور المتجر نفسه: الكاشف يعطي اليدين أحياناً «وجهاً» بثقة 0.53–0.57 والوجه الحقيقي 0.75+،
 * وصندوق «شخص» حول اليدين يغطي أقل من 60% من الصورة بينما الجسم الظاهر يغطي 90% تقريباً.
 * الصور الداكنة جداً قد تفوت الفحص، لذلك يبقى قرار المالك في المراجعة هو الأخير.
 */
/** وجه بهذه الثقة = يظهر شخص */
const FACE_SCORE = 0.7;
/** جسم شخص يغطي هذه النسبة من الصورة أو أكثر = يظهر شخص (صور اليد وحدها أصغر) */
const PERSON_AREA = 0.75;
const PERSON_SCORE = 0.5;

export type ScanVerdict = 'clean' | 'people' | 'unknown';

interface Box {
  width: number;
  height: number;
}
interface Detector {
  detect(image: HTMLImageElement | HTMLCanvasElement): {
    detections: Array<{ boundingBox?: Box; categories: Array<{ score: number; categoryName: string }> }>;
  };
}

let loading: Promise<{ face: Detector; object: Detector }> | null = null;

function load() {
  loading ??= (async () => {
    const vision = await import(/* @vite-ignore */ `${VENDOR}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${VENDOR}/wasm`);
    const [face, object] = await Promise.all([
      vision.FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: 'IMAGE' }),
      vision.ObjectDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: OBJECT_MODEL },
        runningMode: 'IMAGE',
        categoryAllowlist: ['person'],
        scoreThreshold: PERSON_SCORE,
      }),
    ]);
    return { face, object };
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** يبدأ تحميل أدوات الفحص مبكراً (اختياري). */
export function preloadScanner(): Promise<boolean> {
  return load().then(
    () => true,
    () => false,
  );
}

function verdictOf(models: { face: Detector; object: Detector }, source: HTMLImageElement | HTMLCanvasElement, w: number, h: number): ScanVerdict {
  const faces = models.face.detect(source).detections;
  if (faces.some((d) => (d.categories[0]?.score ?? 0) >= FACE_SCORE)) return 'people';
  const people = models.object.detect(source).detections;
  const big = people.some((d) => d.boundingBox && (d.boundingBox.width * d.boundingBox.height) / (w * h) >= PERSON_AREA);
  return big ? 'people' : 'clean';
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image'));
    img.src = url;
  });

export async function scanImage(url: string): Promise<ScanVerdict> {
  try {
    const models = await load();
    const img = await loadImage(url);
    return verdictOf(models, img, img.naturalWidth, img.naturalHeight);
  } catch {
    return 'unknown';
  }
}

/** يفحص 4 لقطات موزعة على مدة الفيديو؛ لقطة واحدة فيها شخص تكفي. */
export async function scanVideo(url: string): Promise<ScanVerdict> {
  try {
    const models = await load();
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('video'));
      setTimeout(() => reject(new Error('timeout')), 20_000);
    });
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unknown';
    for (const t of [0.15, 0.4, 0.65, 0.9]) {
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error('seek'));
        video.currentTime = video.duration * t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (verdictOf(models, canvas, canvas.width, canvas.height) === 'people') return 'people';
    }
    video.removeAttribute('src');
    video.load();
    return 'clean';
  } catch {
    return 'unknown';
  }
}
