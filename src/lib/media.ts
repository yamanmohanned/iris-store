import type { Product } from '@/data/types';

/** عنصر في معرض المنتج: صورة أو فيديو (غلافه الصورة الرئيسية). */
export interface MediaItem {
  kind: 'image' | 'video';
  src: string;
  /** الصورة المصغّرة/الغلاف */
  poster: string;
}

/** ترتيب معرض المنتج: الصورة الرئيسية، ثم الفيديوهات، ثم بقية الصور. */
export function productMedia(p: Product): MediaItem[] {
  const images: MediaItem[] = (p.gallery.length ? p.gallery : [p.image]).filter(Boolean).map((src) => ({ kind: 'image', src, poster: src }));
  const videos: MediaItem[] = (p.videos ?? []).map((src) => ({ kind: 'video', src, poster: p.image }));
  const [first, ...rest] = images;
  return first ? [first, ...videos, ...rest] : videos;
}
