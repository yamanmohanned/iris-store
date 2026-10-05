"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { ImageDTO } from "@/server/services/media";
import { MediaImage } from "../store/media-image";

/**
 * Phone photos are often 4–8 MB: JPEG/WebP above ~1.5 MB are scaled to ≤2400px in the browser
 * first (orientation applied, metadata dropped), which makes uploads on mobile data far faster.
 * The server still validates and re-encodes everything.
 */
async function prepare(file: File): Promise<File> {
  if (!/^image\/(jpeg|webp)$/.test(file.type) || file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    return blob && blob.size < file.size
      ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
      : file;
  } catch {
    return file;
  }
}

export async function uploadImage(
  file: File,
): Promise<{ ok: true; image: ImageDTO } | { ok: false; error: string }> {
  const body = new FormData();
  body.set("file", await prepare(file));
  try {
    const res = await fetch("/api/admin/media", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as ImageDTO & { error?: string };
    return res.ok ? { ok: true, image: data } : { ok: false, error: data.error ?? "generic" };
  } catch {
    return { ok: false, error: "generic" };
  }
}

function useUploadErrors() {
  const t = useTranslations("admin.media");
  return (code: string) =>
    toast.error(
      ["unsupported_media", "payload_too_large", "too_large", "rate_limited"].includes(code)
        ? t(`errors.${code}` as "errors.generic")
        : t("errors.generic"),
    );
}

/** Ordered product gallery: add, reorder, choose the main photo, remove. */
export function ImageGallery({
  images,
  onChange,
  max = 20,
  locale,
}: {
  images: ImageDTO[];
  onChange: (next: ImageDTO[]) => void;
  max?: number;
  locale: string;
}) {
  const t = useTranslations("admin.media");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const latest = useRef(images);
  useEffect(() => {
    latest.current = images;
  }, [images]);
  const showError = useUploadErrors();

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, Math.max(0, max - latest.current.length));
    setUploading((n) => n + list.length);
    for (const file of list) {
      const result = await uploadImage(file);
      setUploading((n) => n - 1);
      if (result.ok) onChange([...latest.current, result.image]);
      else showError(result.error);
    }
    if (input.current) input.current.value = "";
  }

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((img, i) => (
          <li key={img.id} className="group relative">
            <div
              className={cn(
                "aspect-square overflow-hidden petal-sm bg-surface-muted ring-1 ring-border",
                i === 0 && "ring-2 ring-primary",
              )}
            >
              <MediaImage image={img} sizes="160px" alt="" locale={locale} className="size-full" />
            </div>
            {i === 0 ? (
              <span className="absolute start-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold text-primary-foreground">
                {t("main")}
              </span>
            ) : null}
            <div className="mt-1 flex items-center justify-center gap-0.5">
              {i > 0 ? (
                <>
                  <IconButton label={t("moveStart")} onClick={() => move(i, i - 1)}>
                    <ArrowRight className="size-3.5 ltr:rotate-180" />
                  </IconButton>
                  <IconButton label={t("makeMain")} onClick={() => move(i, 0)}>
                    <Star className="size-3.5" />
                  </IconButton>
                </>
              ) : null}
              {i < images.length - 1 ? (
                <IconButton label={t("moveEnd")} onClick={() => move(i, i + 1)}>
                  <ArrowLeft className="size-3.5 ltr:rotate-180" />
                </IconButton>
              ) : null}
              <IconButton
                label={t("remove")}
                onClick={() => onChange(images.filter((x) => x.id !== img.id))}
                danger
              >
                <X className="size-3.5" />
              </IconButton>
            </div>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li
            key={`up-${i}`}
            className="flex aspect-square items-center justify-center petal-sm bg-surface-muted"
            aria-label={t("uploading")}
          >
            <Spinner />
          </li>
        ))}
        {images.length + uploading < max ? (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 petal-sm border-2 border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-6" aria-hidden="true" />
              {t("add")}
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />
      <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}

/** Single image field (category picture, banner…). */
export function SingleImageField({
  image,
  onChange,
  locale,
}: {
  image: ImageDTO | null;
  onChange: (next: ImageDTO | null) => void;
  locale: string;
}) {
  const t = useTranslations("admin.media");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const showError = useUploadErrors();
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-20 shrink-0 overflow-hidden petal-sm bg-surface-muted ring-1 ring-border">
        {image ? (
          <MediaImage image={image} sizes="80px" alt="" locale={locale} className="size-full" />
        ) : null}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <Spinner />
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          {image ? t("replace") : t("addOne")}
        </button>
        {image ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
          >
            {t("remove")}
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const result = await uploadImage(file);
          setBusy(false);
          if (result.ok) onChange(result.image);
          else showError(result.error);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        danger && "hover:bg-danger-soft hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}
