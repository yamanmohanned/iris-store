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
