/**
 * عميل واجهة الخادم (PHP على الاستضافة، أو خادم التطوير المحاكي في vite.config.ts).
 * كل الطلبات تمر عبر `/api/index.php?r=…` حتى تعمل على أي استضافة بلا إعداد mod_rewrite.
 */

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

/**
 * VITE_DEMO:
 *  - '1'    : نسخة عرض داخل المتصفح فقط (استضافة ثابتة بلا خادم).
 *  - 'auto' : نسخة Netlify — خادم Netlify Functions إن وُجد، وإلا (نشر بالسحب والإفلات) نسخة المتصفح.
 *  - غير مضبوط: الإنتاج على PHP.
 */
const DEMO_MODE = import.meta.env.VITE_DEMO as string | undefined;
let browserOnly = DEMO_MODE === '1';

/** هل تعمل البيانات داخل هذا المتصفح فقط (لا خادم)؟ */
export function isBrowserOnly(): boolean {
  return browserOnly;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** true عندما لا يوجد خادم أصلاً (استضافة ثابتة أو انقطاع الشبكة) — بخلاف رفض الخادم للطلب. */
export function isUnavailable(e: unknown): boolean {
  return e instanceof ApiError && (e.status === 0 || e.status === 404 || e.status === 405 || e.status === 502 || e.status === 503);
}

export function apiUrl(route: string, query?: Record<string, string>): string {
  const params = new URLSearchParams({ r: route, ...query });
  return `${BASE}/index.php?${params}`;
}

export async function api<T>(
  route: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string>; form?: FormData } = {},
): Promise<T> {
  if (browserOnly) return browserApi<T>(route, init);

  const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'iris' };
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(route, init.query), {
      method: init.method ?? 'GET',
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.', 0);
  }

  const type = res.headers.get('content-type') ?? '';
  // استضافة بلا PHP تعيد ملف index.html أو نص الملف بدل JSON
  if (!type.includes('application/json')) {
    // لا خادم إطلاقاً (index.html أو 404) ← نسخة المتصفح؛ أما أعطال الخادم المؤقتة (5xx) فتظهر كخطأ عادي
    if (DEMO_MODE === 'auto' && (res.ok || res.status === 404)) {
      browserOnly = true;
      return browserApi<T>(route, init);
    }
    throw new ApiError('الخادم غير متاح على هذه الاستضافة.', res.ok ? 503 : res.status);
  }

  const data = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
  if (!res.ok || !data || data.ok === false) {
    throw new ApiError(data?.error || `خطأ غير متوقع من الخادم (${res.status}).`, res.status);
  }
  return data;
}

/** نسخة العرض داخل المتصفح (src/lib/demoApi.ts): نفس العقد والبيانات في localStorage. */
async function browserApi<T>(
  route: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string>; form?: FormData },
): Promise<T> {
  const { demoApi, DemoError } = await import('./demoApi');
  try {
    return (await demoApi(route, init.method ?? 'GET', init.body as Record<string, unknown>, init.query, init.form)) as T;
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : 'خطأ', e instanceof DemoError ? e.status : 500);
  }
}
