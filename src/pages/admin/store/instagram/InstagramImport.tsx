import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AdminPage, Button, EmptyState, Notice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { instagramApi, type IgPost, type InstagramStatus } from '@/lib/adminApi';
import { isBrowserOnly } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { parseCaption } from '@/lib/instagram/caption';
import { importedKeys, isPostImported } from '@/lib/instagram/imported';
import { preloadScanner, scanImage, scanVideo, type ScanVerdict } from '@/lib/instagram/peopleScan';
import { useAdminAuth } from '@/state/adminAuth';
import { ImportReview } from './ImportReview';

type Filter = 'new' | 'all' | 'imported';
export type ScanMap = Record<string, ScanVerdict | 'pending'>;

/** الاستيراد من إنستغرام: منشورات الحساب المربوط، فحص الصور، اختيار القطع، ثم مراجعتها واستيرادها. */
export default function InstagramImport() {
  const catalog = useCatalog();
  const { isOwner } = useAdminAuth();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState<Filter>('new');
  const [selected, setSelected] = useState<string[]>([]);
  const [scan, setScan] = useState<ScanMap>({});
  const [scanner, setScanner] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reviewing, setReviewing] = useState(false);

  const imported = useMemo(() => importedKeys(catalog.products), [catalog.products]);
  const isImported = useCallback((p: IgPost) => isPostImported(imported, p), [imported]);

  const loadPage = useCallback(async (after: string | null) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await instagramApi.media(after);
      setPosts((prev) => (after ? [...prev, ...res.posts] : res.posts));
      setNext(res.next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المنشورات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isBrowserOnly()) {
      setStatus({ connected: false });
      return;
    }
    instagramApi
      .status()
      .then((s) => {
        setStatus(s);
        if (s.connected) {
          void loadPage(null);
          void preloadScanner().then((ok) => setScanner(ok ? 'ready' : 'failed'));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر قراءة حالة الربط.'));
  }, [loadPage]);

  // فحص الصور واحدة تلو الأخرى (المنشورات غير المستوردة فقط)
  useEffect(() => {
    if (scanner !== 'ready') return;
    const todo = posts.filter((p) => !isImported(p)).flatMap((p) => p.items).filter((i) => !(i.id in scan));
    if (!todo.length) return;
    let alive = true;
    void (async () => {
      for (const item of todo) {
        if (!alive) return;
        setScan((s) => ({ ...s, [item.id]: 'pending' }));
        const verdict = item.type === 'VIDEO' && item.src ? await scanVideo(item.src) : await scanImage(item.preview);
        if (!alive) return;
        setScan((s) => ({ ...s, [item.id]: verdict }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, scanner]);

  const visible = posts.filter((p) => (filter === 'all' ? true : filter === 'imported' ? isImported(p) : !isImported(p)));
  const scanned = Object.values(scan).filter((v) => v !== 'pending').length;
  const flagged = (p: IgPost) => p.items.filter((i) => scan[i.id] === 'people').length;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selectAllClean = () =>
    setSelected(posts.filter((p) => !isImported(p) && flagged(p) < p.items.length && parseCaption(p.caption).price !== null).map((p) => p.id));

  if (status && !status.connected) {
    return (
      <AdminPage title="الاستيراد من إنستغرام">
        <EmptyState
          icon="link_off"
          title={isBrowserOnly() ? 'الاستيراد يحتاج الموقع على الاستضافة الفعلية' : 'لم يُربط حساب إنستغرام بعد'}
          body={
            isOwner
              ? 'اربط حساب المتجر مرة واحدة من الإعدادات، ثم ترى منشوراتك هنا وتستورد القطع بصورها وفيديوهاتها.'
              : 'ربط الحساب يقوم به مالك المتجر من الإعدادات. بعد الربط تستطيع الاستيراد من هنا.'
          }
          action={
            isOwner &&
            !isBrowserOnly() && (
              <Link to="/admin/settings/instagram" className="inline-flex items-center gap-2 rounded-xl bg-imperial-burgundy px-4 py-2.5 font-label-lg text-label-lg font-semibold text-ivory-canvas">
                <Icon name="link" className="text-[18px]" />
                ربط الحساب
              </Link>
            )
          }
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="الاستيراد من إنستغرام"
      subtitle={status?.username ? `منشورات @${status.username}. اختر القطع، راجع أسماءها وأسعارها، ثم استوردها بصورها وفيديوهاتها.` : undefined}
      actions={
        <Button variant="secondary" icon="checklist" onClick={selectAllClean} disabled={!posts.length}>
          تحديد القطع الجاهزة
        </Button>
      }
    >
      {error && (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      )}
      <Notice tone={scanner === 'failed' ? 'warning' : 'info'} icon="person_off" className="mb-4">
        {scanner === 'loading' && 'جارٍ تجهيز الفحص التلقائي للصور (يستبعد الصور التي يظهر فيها أشخاص)…'}
        {scanner === 'ready' &&
          `الفحص التلقائي: ${scanned} من ${posts.filter((p) => !isImported(p)).reduce((n, p) => n + p.items.length, 0)} صورة/فيديو. الصور التي يظهر فيها وجه أو شخص تُستبعد تلقائياً، وصور اليد التي تعرض القطعة تبقى — راجعها قبل الاستيراد.`}
        {scanner === 'failed' && 'تعذر تحميل الفحص التلقائي على هذا الجهاز؛ راجع الصور بنفسك واستبعد ما يظهر فيه أشخاص.'}
      </Notice>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(
          [
            ['new', 'غير المستوردة'],
            ['all', 'الكل'],
            ['imported', 'المستوردة'],
          ] as Array<[Filter, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 font-label-md text-label-md',
              filter === id ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-blush-surface text-warm-ink hover:bg-rose-mist',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !posts.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-blush-surface" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon="photo_library" title={filter === 'imported' ? 'لم تستورد أي منشور بعد' : 'لا توجد منشورات جديدة'} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <li key={p.id}>
              <PostCard post={p} imported={isImported(p)} selected={selected.includes(p.id)} flagged={flagged(p)} scan={scan} onToggle={() => toggle(p.id)} />
            </li>
          ))}
        </ul>
      )}

      {next && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" icon="expand_more" busy={loading} onClick={() => void loadPage(next)}>
            تحميل منشورات أقدم
          </Button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-hairline-burgundy bg-ivory-canvas/95 px-4 py-3 shadow-[0_-8px_30px_rgba(42,3,13,0.12)] backdrop-blur lg:pr-[296px]">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <span className="font-label-lg text-label-lg text-warm-ink">
              اخترت <b className="text-imperial-burgundy">{selected.length}</b> منشوراً
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelected([])}>
                إلغاء
              </Button>
              <Button icon="arrow_back" onClick={() => setReviewing(true)}>
                مراجعة واستيراد
              </Button>
            </div>
          </div>
        </div>
      )}

      {reviewing && (
        <ImportReview
          posts={posts.filter((p) => selected.includes(p.id))}
          scan={scan}
          onClose={() => setReviewing(false)}
          onDone={() => {
            setReviewing(false);
            setSelected([]);
          }}
        />
      )}
    </AdminPage>
  );
}

function PostCard({
  post,
  imported,
  selected,
  flagged,
  scan,
  onToggle,
}: {
  post: IgPost;
  imported: boolean;
  selected: boolean;
  flagged: number;
  scan: ScanMap;
  onToggle: () => void;
}) {
  const parsed = parseCaption(post.caption);
  const cover = post.items[0];
  const allFlagged = flagged > 0 && flagged === post.items.length;
  const pending = post.items.some((i) => scan[i.id] === 'pending' || !(i.id in scan));
  return (
    <button
      type="button"
      disabled={imported}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest text-right shadow-luxury transition-all',
        selected && 'ring-[3px] ring-imperial-burgundy',
        imported && 'cursor-default opacity-60',
      )}
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-blush-surface">
        {cover?.preview && (
          <img src={cover.preview} alt="" loading="lazy" className={cn('h-full w-full object-cover', allFlagged && 'opacity-50 grayscale')} />
        )}
        <span className="absolute right-2 top-2 flex gap-1">
          {post.type === 'VIDEO' && <Badge icon="smart_display" />}
          {post.type === 'CAROUSEL_ALBUM' && <Badge icon="collections" label={String(post.items.length)} />}
        </span>
        <span
          className={cn(
            'absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
            selected ? 'border-imperial-burgundy bg-imperial-burgundy text-white' : 'border-white/90 bg-wine-night/30 text-transparent',
          )}
        >
          <Icon name="check" className="text-[18px]" />
        </span>
        {imported ? (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-semantic-success-bg/95 px-2 py-1 text-center font-label-sm text-label-sm text-semantic-success">
            مستورد ✓
          </span>
        ) : flagged > 0 ? (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-semantic-error-bg/95 px-2 py-1 font-label-sm text-label-sm text-semantic-error">
            <Icon name="person" className="text-[14px]" />
            {allFlagged ? 'يظهر شخص — مستبعد' : `${flagged} من ${post.items.length} فيها أشخاص`}
          </span>
        ) : pending ? null : (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-white/90 px-2 py-1 font-label-sm text-label-sm text-semantic-success">
            <Icon name="verified" className="text-[14px]" />
            صور منتج
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="line-clamp-1 font-label-lg text-label-lg font-semibold text-deep-oxblood">{parsed.name || 'بلا وصف'}</span>
        <span className="font-label-sm text-label-sm text-muted-rosewood">
          {parsed.price ? `${parsed.price.toLocaleString('en-US')}${parsed.priceMax ? `–${parsed.priceMax.toLocaleString('en-US')}` : ''} د.ع` : 'بلا سعر'} ·{' '}
          {post.timestamp ? formatDate(post.timestamp) : ''}
        </span>
      </span>
    </button>
  );
}

function Badge({ icon, label }: { icon: string; label?: string }) {
  return (
    <span className="flex items-center gap-0.5 rounded-full bg-wine-night/70 px-1.5 py-0.5 font-label-sm text-label-sm text-white">
      <Icon name={icon} className="text-[14px]" />
      {label}
    </span>
  );
}
