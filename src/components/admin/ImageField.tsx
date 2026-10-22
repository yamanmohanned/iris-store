import { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { uploadImage } from '@/lib/image';
import { useToast } from '@/state/toast';
import { inputClass } from './ui';

/** اختيار صورة: رفع من الجهاز (يُصغَّر تلقائياً) أو لصق رابط. */
export function ImageField({
  value,
  onChange,
  aspect = 'aspect-[4/3]',
}: {
  value: string;
  onChange: (url: string) => void;
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const toast = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر رفع الصورة', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          'group relative w-full overflow-hidden rounded-xl bg-blush-surface shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)]',
          aspect,
        )}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-rosewood">
            <Icon name="add_photo_alternate" className="text-[36px] text-antique-gold" />
            <span className="font-label-md text-label-md">اضغط لرفع صورة</span>
          </span>
        )}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-wine-night/50 text-ivory-canvas transition-opacity',
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {busy ? (
            <Icon name="progress_activity" className="animate-spin text-[32px]" />
          ) : (
            <span className="flex items-center gap-1 font-label-lg text-label-lg">
              <Icon name="upload" className="text-[20px]" /> تغيير الصورة
            </span>
          )}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="font-label-sm text-label-sm text-imperial-burgundy underline decoration-royal-gold/50 underline-offset-4"
        >
          {showUrl ? 'إخفاء الرابط' : 'أو استخدم رابط صورة'}
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="font-label-sm text-label-sm text-semantic-error">
            إزالة الصورة
          </button>
        )}
      </div>
      {showUrl && (
        <input
          dir="ltr"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="/images/… أو https://…"
        />
      )}
    </div>
  );
}
