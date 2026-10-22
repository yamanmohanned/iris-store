/**
 * صلاحيات فريق العمل — ملف مشترك بين لوحة الإدارة والخادم (server/core) حتى تبقى القواعد واحدة.
 * المالك يملك كل شيء دائماً؛ إدارة الفريق وربط إنستغرام وإعادة الضبط للمالك وحده ولا تُمنح لأحد.
 */

export const SECTIONS = ['orders', 'products', 'categories', 'settings'] as const;
export type Section = (typeof SECTIONS)[number];

export const ACCESS_LEVELS = ['none', 'view', 'edit'] as const;
export type Access = (typeof ACCESS_LEVELS)[number];

export type Permissions = Record<Section, Access>;

export const SECTION_LABELS: Record<Section, { label: string; hint: string; icon: string }> = {
  orders: { label: 'الطلبات', hint: 'عرض طلبات الزبائن وتغيير حالتها', icon: 'receipt_long' },
  products: { label: 'المنتجات', hint: 'الأسعار والكميات والصور، والاستيراد من إنستغرام', icon: 'diamond' },
  categories: { label: 'الأقسام', hint: 'إضافة الأقسام وترتيبها وإخفاؤها', icon: 'category' },
  settings: { label: 'إعدادات المتجر', hint: 'التوصيل والقسائم والتواصل والشعار والخط', icon: 'tune' },
};

export const ACCESS_LABELS: Record<Access, string> = {
  none: 'لا وصول',
  view: 'عرض فقط',
  edit: 'عرض وتعديل',
};

const fill = (access: Access): Permissions => ({ orders: access, products: access, categories: access, settings: access });

export const FULL_ACCESS: Permissions = fill('edit');
export const NO_ACCESS: Permissions = fill('none');

export const PERMISSION_PRESETS: Array<{ id: string; label: string; description: string; permissions: Permissions }> = [
  { id: 'manager', label: 'مدير المتجر', description: 'كل الأقسام عرضاً وتعديلاً', permissions: FULL_ACCESS },
  {
    id: 'orders',
    label: 'مسؤول الطلبات',
    description: 'يتابع الطلبات ويغيّر حالتها، ويرى المنتجات دون تعديلها',
    permissions: { orders: 'edit', products: 'view', categories: 'view', settings: 'none' },
  },
  {
    id: 'catalog',
    label: 'مدخل منتجات',
    description: 'يضيف المنتجات والأقسام ويستورد من إنستغرام، بلا وصول للطلبات',
    permissions: { orders: 'none', products: 'edit', categories: 'edit', settings: 'none' },
  },
  { id: 'viewer', label: 'مشاهدة فقط', description: 'يرى كل شيء ولا يغيّر شيئاً', permissions: fill('view') },
];

/** هل تسمح الصلاحيات بهذا المستوى؟ (التعديل يتضمن العرض) */
export function allows(perms: Permissions | null | undefined, section: Section, level: Exclude<Access, 'none'> = 'view'): boolean {
  const have = perms?.[section] ?? 'none';
  return level === 'view' ? have !== 'none' : have === 'edit';
}

/** يحوّل أي مدخل إلى صلاحيات صالحة (القيم المجهولة تصبح «لا وصول»). */
export function cleanPermissions(input: unknown): Permissions {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out = { ...NO_ACCESS };
  for (const s of SECTIONS) {
    const v = src[s];
    if (v === 'view' || v === 'edit') out[s] = v;
  }
  return out;
}

export function presetOf(perms: Permissions): string | null {
  return PERMISSION_PRESETS.find((p) => SECTIONS.every((s) => p.permissions[s] === perms[s]))?.id ?? null;
}

/** حساب في لوحة الإدارة كما يعيده الخادم (auth/me وauth/login). */
export interface AdminProfile {
  id: string;
  username: string;
  name: string;
  /** المسمى الظاهر في اللوحة (المالك، مسؤول الطلبات…) */
  title: string;
  role: 'owner' | 'staff';
  permissions: Permissions;
  /** دخول بكلمة المرور الافتراضية (نسخة Netlify بلا كلمة مرور مضبوطة): لا شيء مسموح قبل تغييرها */
  mustChangePassword?: boolean;
  /** للمالك على خادم PHP فقط: نسخة PHP وهل فيها إصلاح ثغرتي PHP2Shell (انظر docs/SECURITY-REPORT.md) */
  runtime?: { php: string; phpFix: 'ok' | 'outdated' | 'unsupported' };
}

/** موظف كما تعرضه صفحة فريق العمل (بلا كلمة المرور). */
export interface StaffMember {
  id: string;
  username: string;
  name: string;
  title: string;
  permissions: Permissions;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const MAX_STAFF = 50;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

/** كلمات مرور شائعة تُرفض عند تعيين كلمة مرور جديدة — نفس القائمة في iris_password_problem (server/api/inc/users.php). */
// prettier-ignore
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword',
  '12345678', '123456789', '1234567890', '0123456789', '11111111', '00000000', '12341234', '12121212',
  '11223344', '12344321', '87654321', 'qwertyui', 'qwerty12', 'qwerty123', 'qwertyuiop', '1q2w3e4r',
  '1q2w3e4r5t', '1qaz2wsx', 'qazwsxedc', 'asdfghjk', 'asdf1234', 'zxcvbnm1', 'iloveyou', 'iloveyou1',
  'admin123', 'admin1234', 'admin12345', 'administrator', 'welcome1', 'welcome123', 'letmein1',
  'changeme', 'change-me', 'demo1234', 'abc12345', 'abcd1234', 'aa123456', 'a1234567', '12345abc',
  'iris1234', 'iris12345', 'irisstore', 'iris-store', 'irisstore1', 'store123', 'store1234', 'shop1234',
  'baghdad1', 'baghdad123', 'iraq1234', 'iraq12345', 'football', 'superman', 'sunshine', 'princess',
  'trustno1', 'dragon123', 'monkey123', 'master123',
]);

/** أرقام أو حروف متتالية صعوداً أو نزولاً (12345678، abcdefgh، 98765432). */
function isSequence(s: string): boolean {
  if (!/^[a-z0-9]+$/.test(s)) return false;
  const step = (a: string, b: string) => (a === '9' && b === '0' ? 1 : a === '0' && b === '9' ? -1 : b.charCodeAt(0) - a.charCodeAt(0));
  const first = step(s[0], s[1]);
  if (first !== 1 && first !== -1) return false;
  for (let i = 1; i < s.length - 1; i++) if (step(s[i], s[i + 1]) !== first) return false;
  return true;
}

/** سبب رفض كلمة مرور جديدة، أو null إن كانت مقبولة. يطبّقه الخادم (TS وPHP) وتعرضه اللوحة فوراً. */
export function passwordProblem(password: string, username = ''): string | null {
  if (password.length < MIN_PASSWORD) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.';
  if (password.length > MAX_PASSWORD) return 'كلمة المرور أطول من 128 حرفاً.';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return 'كلمة المرور هذه شائعة ويسهل تخمينها. اختر كلمة أقوى.';
  if (/^(.)\1+$/.test(password)) return 'كلمة المرور لا يصح أن تكون حرفاً واحداً مكرراً.';
  if (isSequence(lower)) return 'كلمة المرور لا يصح أن تكون أرقاماً أو حروفاً متتالية.';
  const user = username.trim().toLowerCase();
  if (user.length >= 3 && lower.includes(user)) return 'كلمة المرور لا يصح أن تحتوي اسم الدخول.';
  return null;
}
