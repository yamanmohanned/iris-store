import { Link } from 'react-router';
import type { Category } from '@/data/types';
import { cn } from '@/lib/cn';
import { piecesCount } from '@/lib/format';

export interface CategoryTile {
  category: Pick<Category, 'slug' | 'name' | 'image'>;
  count: number;
}

/**
 * شبكة الأقسام بأسلوب قائمة المنيو المرجعية: بطاقتان بعرض كامل ثم بطاقتان متجاورتان، وهكذا.
 * كل بطاقة صورة القسم واسمه فوقها؛ الترتيب هو ترتيب المالك في لوحة الإدارة.
 */
export function CategoryGrid({ tiles, className }: { tiles: CategoryTile[]; className?: string }) {
  // نمط متكرر كل 4: كامل، كامل، نصف، نصف — ونصف يتيم في النهاية يصبح كاملاً
  const isHalf = (i: number) => {
    const pos = i % 4;
    if (pos < 2) return false;
    return pos === 3 || i + 1 < tiles.length;
  };

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {tiles.map(({ category: c, count }, i) => {
        const half = isHalf(i);
        return (
          <Link
            key={c.slug}
            to={`/collections/${c.slug}`}
            className={cn(
              'fade-up-item group relative isolate overflow-hidden rounded-[20px] bg-wine-night shadow-[0_10px_28px_rgba(42,3,13,0.16)] transition-transform active:scale-[0.985]',
              half ? 'col-span-1 aspect-[4/5]' : 'col-span-2 aspect-[16/10]',
            )}
          >
            {c.image ? (
              <img
                src={c.image}
                alt=""
                loading={i < 2 ? 'eager' : 'lazy'}
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-imperial-burgundy to-wine-night" />
            )}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-wine-night/90 via-wine-night/25 to-transparent" />
            <div className="pointer-events-none absolute inset-[6px] rounded-[16px] shadow-[inset_0_0_0_1px_rgba(201,162,75,0.35)]" />
            <div className={cn('absolute inset-x-0 bottom-0 flex flex-col items-center text-center', half ? 'px-3 pb-4' : 'px-5 pb-5')}>
              <h3
                className={cn(
                  'font-headline-md font-bold leading-tight text-ivory-canvas drop-shadow-[0_2px_8px_rgba(42,3,13,0.6)]',
                  half ? 'text-[22px]' : 'text-[28px]',
                )}
              >
                {c.name}
              </h3>
              <span className="mt-1 inline-flex items-center gap-1.5 font-label-sm text-label-sm text-champagne-gold/90">
                <span className="text-[7px] text-royal-gold">◆</span>
                {count > 0 ? piecesCount(count) : 'قريباً'}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
