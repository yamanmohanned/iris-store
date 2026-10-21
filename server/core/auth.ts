/**
 * الدخول وفريق العمل: المالك (من متغيرات البيئة) + حسابات موظفين بصلاحيات لكل قسم.
 * الموظف يُقرأ من التخزين في كل طلب، فتغيير صلاحياته يسري فوراً، وإيقافه أو تغيير كلمة مروره
 * يرفع رقم الإصدار ver فتنتهي جلساته القديمة.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import {
  cleanPermissions,
  FULL_ACCESS,
  MAX_STAFF,
  MIN_PASSWORD,
  USERNAME_PATTERN,
  type AdminProfile,
  type StaffMember,
} from '../../src/lib/permissions.ts';
import { clearRate, fail, rateLimited, sha, sessionToken, type Env, type Json, type Kv } from './base.ts';

const DEFAULT_PASSWORD = 'demo1234';
const SESSION_TTL = 12 * 60 * 60; // ثوانٍ

interface Hashed {
  salt: string;
  hash: string;
}

interface StaffRecord extends StaffMember, Hashed {
  ver: number;
}

interface Session {
  uid: string;
  ver: number;
  exp: number;
}

export interface Actor extends AdminProfile {
  /** رمز الجلسة الحالية (لتحديثها بعد تغيير كلمة المرور الذاتي) */
  token: string;
}

const hashPassword = (password: string): Hashed => {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
};

const samePassword = (password: string, stored: Hashed) => {
  const a = scryptSync(password, stored.salt, 32);
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

const publicStaff = ({ salt: _s, hash: _h, ver: _v, ...member }: StaffRecord): StaffMember => member;

export function createAuth(kv: Kv, env: Env) {
  const owner: AdminProfile = {
    id: 'owner',
    username: (env.user || 'owner').toLowerCase(),
    name: 'مالك المتجر',
    title: 'المالك',
    role: 'owner',
    permissions: FULL_ACCESS,
  };

  const staffList = async (): Promise<StaffRecord[]> => ((await kv.getJSON('users'))?.users as StaffRecord[] | undefined) ?? [];
  const saveStaff = (users: StaffRecord[]) => kv.setJSON('users', { users });

  async function ownerPasswordOk(password: string): Promise<boolean> {
    const stored = (await kv.getJSON('auth')) as Hashed | null;
    if (stored?.salt && stored.hash) return samePassword(password, stored);
    const a = Buffer.from(sha(password));
    const b = Buffer.from(sha(env.password || DEFAULT_PASSWORD));
    return timingSafeEqual(a, b);
  }

  const profileOf = (u: StaffRecord): AdminProfile => ({
    id: u.id,
    username: u.username,
    name: u.name,
    title: u.title || 'موظف',
    role: 'staff',
    permissions: cleanPermissions(u.permissions),
  });

  /** الحساب صاحب الطلب أو null (جلسة منتهية، أو موظف موقوف/محذوف). */
  async function actorOf(req: Request): Promise<Actor | null> {
    const token = sessionToken(req);
    if (!token) return null;
    const s = (await kv.getJSON(`session/${sha(token)}`)) as Session | null;
    if (!s || !s.uid || s.exp < Date.now() / 1000) return null;
    if (s.uid === owner.id) return { ...owner, token };
    const u = (await staffList()).find((x) => x.id === s.uid);
    if (!u || !u.active || u.ver !== s.ver) return null;
    return { ...profileOf(u), token };
  }

  async function openSession(uid: string, ver: number): Promise<string> {
    const token = randomBytes(24).toString('hex');
    await kv.setJSON(`session/${sha(token)}`, { uid, ver, exp: Math.floor(Date.now() / 1000) + SESSION_TTL } satisfies Session);
    return token;
  }

  const cookie = (token: string, secure: boolean) =>
    `IRISADMIN=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL}${secure ? '; Secure' : ''}`;

  async function login(b: Json, ip: string, secure: boolean): Promise<{ admin: AdminProfile; cookie: string }> {
    if (await rateLimited(kv, 'login', ip, 8, 15 * 60, false)) fail('محاولات كثيرة خاطئة. حاول بعد 15 دقيقة.', 429);
    const username = String(b.username ?? '')
      .trim()
      .toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    let admin: AdminProfile | null = null;
    let ver = 0;
    const users = await staffList();
    const staff = users.find((u) => u.username === username);
    if (username === owner.username) {
      if (await ownerPasswordOk(password)) admin = owner;
    } else if (staff) {
      if (samePassword(password, staff)) {
        if (!staff.active) fail('هذا الحساب موقوف. تواصل مع مالك المتجر.', 403);
        admin = profileOf(staff);
        ver = staff.ver;
        staff.lastLoginAt = new Date().toISOString();
        await saveStaff(users);
      }
    } else {
      // نفس زمن التحقق تقريباً حتى لا يُعرف وجود الاسم من سرعة الرد
      samePassword(password, hashPassword('timing-only'));
    }
    if (!admin) {
      await rateLimited(kv, 'login', ip, 8, 15 * 60, true);
      fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
    }
    await clearRate(kv, 'login', ip);
    const token = await openSession(admin!.id, ver);
    return { admin: admin!, cookie: cookie(token, secure) };
  }

  async function logout(req: Request): Promise<void> {
    const token = sessionToken(req);
    if (token) await kv.delete(`session/${sha(token)}`);
  }

  /** تغيير كلمة مرور الحساب الحالي (المالك أو الموظف نفسه). */
  async function changeOwnPassword(actor: Actor, b: Json): Promise<void> {
    const current = typeof b.current === 'string' ? b.current : '';
    const next = typeof b.next === 'string' ? b.next : '';
    if (next.length < MIN_PASSWORD) fail('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
    if (actor.role === 'owner') {
      if (!(await ownerPasswordOk(current))) fail('كلمة المرور الحالية غير صحيحة.');
      await kv.setJSON('auth', hashPassword(next));
      return;
    }
    const users = await staffList();
    const u = users.find((x) => x.id === actor.id);
    if (!u) fail('الحساب غير موجود.', 404);
    if (!samePassword(current, u!)) fail('كلمة المرور الحالية غير صحيحة.');
    Object.assign(u!, hashPassword(next), { ver: u!.ver + 1, updatedAt: new Date().toISOString() });
    await saveStaff(users);
    // الجلسات الأخرى تنتهي، والجلسة الحالية تبقى
    await kv.setJSON(`session/${sha(actor.token)}`, { uid: u!.id, ver: u!.ver, exp: Math.floor(Date.now() / 1000) + SESSION_TTL });
  }

  async function listStaff(): Promise<StaffMember[]> {
    return (await staffList()).map(publicStaff);
  }

  async function saveMember(input: Json): Promise<StaffMember[]> {
    const users = await staffList();
    const id = typeof input.id === 'string' ? input.id : '';
    const existing = id ? users.find((u) => u.id === id) : undefined;
    if (id && !existing) fail('الموظف غير موجود.', 404);

    const username = String(input.username ?? '')
      .trim()
      .toLowerCase();
    if (!USERNAME_PATTERN.test(username)) fail('اسم الدخول من 3 إلى 32 حرفاً إنجليزياً صغيراً أو رقماً أو (. _ -).');
    if (username === owner.username) fail('اسم الدخول هذا محجوز لحساب المالك.');
    if (users.some((u) => u.username === username && u.id !== id)) fail('اسم الدخول مستخدم لموظف آخر.');
    const name = String(input.name ?? '').trim();
    if (name.length < 2 || name.length > 60) fail('اسم الموظف مطلوب (حتى 60 حرفاً).');
    const title = String(input.title ?? '').trim();
    if (title.length > 40) fail('المسمى الوظيفي أطول من 40 حرفاً.');
    const password = typeof input.password === 'string' ? input.password : '';
    if ((!existing || password) && password.length < MIN_PASSWORD) fail('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
    const active = input.active !== false;
    const permissions = cleanPermissions(input.permissions);
    const now = new Date().toISOString();

    if (existing) {
      const kick = Boolean(password) || (existing.active && !active);
      Object.assign(existing, { username, name, title, permissions, active, updatedAt: now });
      if (password) Object.assign(existing, hashPassword(password));
      if (kick) existing.ver += 1;
    } else {
      if (users.length >= MAX_STAFF) fail(`وصلت للحد الأقصى لفريق العمل (${MAX_STAFF} حساباً).`);
      users.push({
        id: `u-${randomBytes(6).toString('hex')}`,
        username,
        name,
        title,
        permissions,
        active,
        createdAt: now,
        ver: 1,
        ...hashPassword(password),
      });
    }
    await saveStaff(users);
    return users.map(publicStaff);
  }

  async function deleteMember(id: unknown): Promise<StaffMember[]> {
    const users = await staffList();
    const rest = users.filter((u) => u.id !== id);
    if (rest.length === users.length) fail('الموظف غير موجود.', 404);
    await saveStaff(rest);
    return rest.map(publicStaff);
  }

  return { owner, ownerPasswordOk, actorOf, login, logout, changeOwnPassword, listStaff, saveMember, deleteMember };
}

export type Auth = ReturnType<typeof createAuth>;
