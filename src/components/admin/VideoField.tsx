import { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { uploadVideo } from '@/lib/image';
import { useToast } from '@/state/toast';

const MAX_VIDEOS = 3;

/** فيديوهات المنتج (حتى 3): رفع ملف MP4 من الجهاز، معاينة، حذف. */
export function VideoField({ value, onChange }: { value: string[]; onChange: (videos: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange([...value, await uploadVideo(file)]);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر رفع الفيديو', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((v, i) => (
            <div key={v + i} className="relative aspect-[9/16] overflow-hidden rounded-lg bg-wine-night">
              <video src={v} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <Icon name="play_circle" className="pointer-events-none absolute inset-0 m-auto h-fit w-fit text-[32px] text-white/90" />
              <button
                type="button"
                aria-label="حذف الفيديو"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-wine-night/70 text-ivory-canvas"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < MAX_VIDEOS && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-blush-surface px-4 py-3 font-label-md text-label-md text-imperial-burgundy shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)] hover:bg-rose-mist disabled:opacity-60"
        >
          <Icon name={busy ? 'progress_activity' : 'videocam'} className={busy ? 'animate-spin text-[20px]' : 'text-[20px]'} />
          {busy ? 'جارٍ رفع الفيديو…' : 'إضافة فيديو (MP4)'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
