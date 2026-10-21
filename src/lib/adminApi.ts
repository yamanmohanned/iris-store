/**
 * طلبات لوحة الإدارة الجديدة (فريق العمل، إنستغرام، إعادة الضبط) بأنواع واضحة.
 * الكتالوج والطلبات لهما مخازنهما الخاصة (state/catalog و state/adminOrders).
 */
import type { CatalogData } from '@/data/types';
import { api } from './api';
import type { Permissions, StaffMember } from './permissions';
import type { ResetMode } from './reset';

/* ───────────── فريق العمل ───────────── */

export interface StaffInput {
  id?: string;
  username: string;
  name: string;
  title: string;
  /** فارغة عند التعديل = تبقى كلمة المرور الحالية */
  password: string;
  permissions: Permissions;
  active: boolean;
}

export const staffApi = {
  list: () => api<{ users: StaffMember[]; owner: { username: string } }>('users'),
  save: (user: StaffInput) => api<{ users: StaffMember[] }>('users/save', { method: 'POST', body: { user } }),
  remove: (id: string) => api<{ users: StaffMember[] }>('users/delete', { method: 'POST', body: { id } }),
};

/* ───────────── إنستغرام ───────────── */

export interface InstagramStatus {
  connected: boolean;
  username?: string;
  accountType?: string;
  connectedAt?: string;
  expiresAt?: string;
}

export interface IgItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  preview: string;
  available: boolean;
  /** ملف الفيديو (للفيديو فقط) */
  src?: string;
}

export interface IgPost {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  permalink: string;
  timestamp: string;
  items: IgItem[];
}

export interface IgFetched {
  media: Array<{ id: string; kind: 'image' | 'video'; url: string; poster?: string }>;
  permalink: string;
  caption: string;
}

export const instagramApi = {
  status: () => api<InstagramStatus>('instagram/status'),
  connect: (token: string) => api<InstagramStatus>('instagram/connect', { method: 'POST', body: { token } }),
  disconnect: () => api<InstagramStatus>('instagram/disconnect', { method: 'POST' }),
  media: (after?: string | null) =>
    api<{ posts: IgPost[]; next: string | null; username: string }>('instagram/media', after ? { query: { after } } : {}),
  fetch: (id: string, childIds: string[]) => api<IgFetched>('instagram/fetch', { method: 'POST', body: { id, childIds } }),
};

/* ───────────── إعادة الضبط ───────────── */

export const systemApi = {
  reset: (input: { password: string; confirm: string; mode: ResetMode }) =>
    api<{ catalog: CatalogData; mode: ResetMode }>('system/reset', { method: 'POST', body: input }),
};
