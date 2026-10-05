import {
  siFacebook,
  siInstagram,
  siSnapchat,
  siTelegram,
  siTiktok,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";

const ICONS = {
  instagram: siInstagram,
  facebook: siFacebook,
  tiktok: siTiktok,
  x: siX,
  snapchat: siSnapchat,
  telegram: siTelegram,
  youtube: siYoutube,
  whatsapp: siWhatsapp,
} as const;

export type BrandIconName = keyof typeof ICONS;

/** Official brand marks (Simple Icons, CC0), rendered inline on the server — no client JS. */
export function BrandIcon({ name, className }: { name: BrandIconName; className?: string }) {
  const icon = ICONS[name];
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={icon.path} />
    </svg>
  );
}

export const SOCIAL_URL: Record<Exclude<BrandIconName, "whatsapp">, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  facebook: (h) => `https://facebook.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h.replace(/^@/, "")}`,
  x: (h) => `https://x.com/${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h.replace(/^@/, "")}`,
};

/** Accept either a full https URL or a bare handle typed by the owner. */
export function socialHref(name: Exclude<BrandIconName, "whatsapp">, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https:\/\//i.test(v)) return v;
  if (!/^@?[\w.-]{1,60}$/.test(v)) return null;
  return SOCIAL_URL[name](v.replace(/^@/, ""));
}
