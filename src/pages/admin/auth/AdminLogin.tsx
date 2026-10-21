import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { api } from '@/lib/api';
import { useAdminAuth } from '@/state/adminAuth';

/**
 * تلميح بيانات الدخول التجريبية — في نسخ العرض فقط (VITE_DEMO)، وما دامت كلمة المرور الافتراضية:
 * 'browser' = البيانات في هذا المتصفح، 'server' = خادم Netlify المشترك. الإنتاج على PHP لا يطلبه أصلاً.
 */
function useDemoLogin(): 'browser' | 'server' | null {
  const [demo, setDemo] = useState<'browser' | 'server' | null>(null);
  useEffect(() => {
    if (!import.meta.env.VITE_DEMO) return;
    let alive = true;
    api<{ demoLogin?: boolean; browserOnly?: boolean }>('health')
      .then((h) => alive && setDemo(h.demoLogin ? (h.browserOnly ? 'browser' : 'server') : null))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return demo;
}

/**
 * Stitch screen 46f0760680994a4e92475ae573d382cb
 * «IRIS | تسجيل الدخول للوحة الإدارة (Admin Login)»
 * التحقق يتم على الخادم (api/index.php ← auth/login) بكلمة المرور المضبوطة في api/config.php.
 */
export default function AdminLogin() {
  const { admin, signIn } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo = useDemoLogin();

  if (admin) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
      setBusy(false);
    }
  };

  return (
    <div className="bg-ivory-canvas text-on-surface selection:bg-rose-mist selection:text-wine-night">
      <main className="flex min-h-screen w-full flex-col lg:flex-row">
        <div className="relative hidden w-full select-none flex-col justify-between overflow-hidden bg-wine-night p-8 text-surface-bright sm:p-14 lg:flex lg:w-1/2 lg:p-20">
          <div className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-primary-container/20 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-10 left-0 h-80 w-80 rounded-full bg-royal-gold/10 blur-[100px]" />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
            height="100%"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern height="60" id="islamic-lattice" patternUnits="userSpaceOnUse" width="60">
                <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#C9A24B" strokeWidth="1.2" />
                <path d="M30 15 L45 30 L30 45 L15 30 Z" fill="none" stroke="#C9A24B" strokeWidth="0.8" />
                <circle cx="30" cy="30" fill="none" r="3.5" stroke="#C9A24B" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect fill="url(#islamic-lattice)" height="100%" width="100%" />
          </svg>
          <div className="relative z-10 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rotate-45 bg-champagne-gold" />
            <span className="font-label-md text-label-md uppercase tracking-widest text-champagne-gold">IRIS STORE · ACCESSORIES</span>
          </div>
          <div className="relative z-10 my-auto flex max-w-lg flex-col items-start py-12">
            <div className="relative mb-10 flex h-28 w-28 items-center justify-center rounded-full bg-deep-oxblood/60 p-3 shadow-2xl backdrop-blur-sm">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-royal-gold/30 via-transparent to-champagne-gold/20" />
              <BrandMark label="شعار آيريس" onDark className="relative h-20 text-champagne-gold drop-shadow-[0_2px_12px_rgba(201,162,75,0.4)]" />
            </div>
            <span className="mb-2 block font-headline-sm text-headline-sm tracking-wider text-royal-gold">آيريس ستور</span>
            <h1 className="mb-4 font-display-lg text-display-lg leading-tight tracking-tight text-surface-bright">لوحة إدارة المتجر</h1>
            <div className="my-6 flex w-full items-center gap-3">
              <div className="flex flex-1 flex-col gap-[3px]">
                <div className="h-[1px] w-full bg-royal-gold/45" />
                <div className="h-[1px] w-full bg-royal-gold/20" />
              </div>
              <span className="select-none font-label-sm text-label-sm text-champagne-gold">◆</span>
              <div className="flex flex-1 flex-col gap-[3px]">
                <div className="h-[1px] w-full bg-royal-gold/45" />
                <div className="h-[1px] w-full bg-royal-gold/20" />
              </div>
            </div>
            <p className="font-body-lg text-body-lg font-light leading-relaxed text-rose-mist/90">
              أضف الأقسام والمنتجات، تابع الطلبات الواردة من المتجر، وعدّل أسعار التوصيل والقسائم من مكان واحد.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2.5 pt-6 text-champagne-gold/80">
            <Icon name="verified_user" className="text-[18px]" />
            <span className="font-label-sm text-label-sm tracking-wide">
              جلسة محمية على الخادم · المحاولات الخاطئة المتكررة تُقيَّد مؤقتاً
            </span>
          </div>
        </div>

        <div className="relative flex min-h-screen w-full items-center justify-center p-5 sm:p-12 lg:w-1/2 lg:p-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-mist/15 via-transparent to-parchment/30" />
          <div className="relative z-10 w-full max-w-[440px] rounded-2xl bg-white p-7 shadow-[0_8px_30px_rgba(42,3,13,0.08),0_2px_8px_rgba(42,3,13,0.04)] sm:p-10">
            <div className="mb-7 text-center">
              <BrandMark label="شعار آيريس" className="mx-auto mb-3.5 h-14 text-imperial-burgundy" />
              <h2 className="mb-2 font-headline-lg text-headline-lg tracking-tight text-warm-ink">تسجيل الدخول</h2>
              <p className="font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
                أدخل اسم المستخدم وكلمة المرور الخاصة بمالك المتجر
              </p>
            </div>

            {demo && (
              <div className="mb-6 rounded-xl bg-semantic-info-bg p-4 font-body-sm text-body-sm text-semantic-info">
                نسخة عرض تجريبية: اسم المستخدم <b dir="ltr">owner</b> وكلمة المرور <b dir="ltr">demo1234</b>.{' '}
                {demo === 'browser' ? 'التعديلات تُحفظ في هذا المتصفح فقط.' : 'يمكن تغييرها من «إعدادات المتجر» بعد الدخول.'}
              </div>
            )}

            {error && (
              <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-semantic-error-bg p-4 text-semantic-error shadow-sm">
                <Icon name="error" fill className="mt-0.5 shrink-0 text-[20px]" />
                <p className="flex-1 font-body-sm text-body-sm leading-snug">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={(e) => void submit(e)}>
              <div className="space-y-2">
                <label className="block font-label-lg text-label-lg font-medium text-warm-ink" htmlFor="username">
                  اسم المستخدم
                </label>
                <div className="relative flex items-center">
                  <input
                    className="h-12 w-full rounded-xl bg-ivory-canvas/60 pl-4 pr-11 text-left font-body-md text-body-md text-warm-ink shadow-inner outline-none transition-all duration-200 placeholder:text-muted-rosewood/50 focus:bg-white focus:shadow-md"
                    dir="ltr"
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <Icon name="badge" className="pointer-events-none absolute right-3.5 text-[20px] text-muted-rosewood" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block font-label-lg text-label-lg font-medium text-warm-ink" htmlFor="password">
                  كلمة المرور
                </label>
                <div className="relative flex items-center">
                  <input
                    className="h-12 w-full rounded-xl bg-ivory-canvas/60 pl-11 pr-11 text-left font-body-md text-body-md text-warm-ink shadow-inner outline-none transition-all duration-200 focus:bg-white focus:shadow-md"
                    dir="ltr"
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Icon name="key" className="pointer-events-none absolute right-3.5 text-[20px] text-muted-rosewood" />
                  <button
                    aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    className="absolute left-3 flex items-center justify-center rounded-lg p-1.5 text-muted-rosewood transition-colors hover:bg-blush-surface hover:text-imperial-burgundy"
                    onClick={() => setShow((v) => !v)}
                    type="button"
                  >
                    <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[20px]" />
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  className="group relative flex h-12 w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-imperial-burgundy font-label-lg text-label-lg font-semibold text-surface-bright shadow-[0_4px_16px_rgba(78,24,37,0.28)] transition-all duration-200 hover:bg-burgundy-600 active:translate-y-[1px] disabled:opacity-60"
                  type="submit"
                  disabled={busy}
                >
                  <span className="absolute right-[-100%] top-0 h-full w-1/2 skew-x-[-25deg] bg-gradient-to-l from-transparent via-champagne-gold/25 to-transparent transition-all duration-700 group-hover:right-[150%]" />
                  <span className="relative z-10 flex items-center gap-2">
                    {busy ? <Icon name="progress_activity" className="animate-spin text-[18px]" /> : null}
                    <span>دخول إلى لوحة التحكم</span>
                    <Icon name="arrow_back" className="text-[18px] transition-transform group-hover:-translate-x-1" />
                  </span>
                </button>
              </div>
            </form>

            <details className="mt-6 rounded-xl bg-blush-surface/70 p-3.5">
              <summary className="cursor-pointer font-label-md text-label-md text-imperial-burgundy">نسيت كلمة المرور؟</summary>
              <p className="mt-2 font-label-sm text-label-sm leading-relaxed text-warm-ink/80">
                إن كنت موظفاً فاطلب من المالك تعيين كلمة مرور جديدة لك من «فريق العمل». وإن كنت المالك: افتح مدير الملفات في لوحة
                الاستضافة، احذف الملف{' '}
                <span dir="ltr" className="font-mono">
                  api/data/auth.php
                </span>{' '}
                ثم ادخل بكلمة المرور المكتوبة في
                <span dir="ltr" className="font-mono">
                  {' '}
                  api/config.php
                </span>
                .
              </p>
            </details>
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-6 px-4 text-center font-label-sm text-label-sm tracking-wide text-muted-rosewood/70">
            آيريس ستور © {new Date().getFullYear()}
          </p>
        </div>
      </main>
    </div>
  );
}
