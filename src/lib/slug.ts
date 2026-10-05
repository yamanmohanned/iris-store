/**
 * URL slugs that keep Arabic letters (readable, good for Arabic SEO) and Latin letters/digits.
 * Example: "فستان صيفي – أزرق!" → "فستان-صيفي-أزرق"
 */
export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel & tatweel
    .replace(/[^\p{Script=Arabic}\p{Script=Latin}\p{N}]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

export const SLUG_PATTERN =
  /^[\p{Script=Arabic}\p{Script=Latin}\p{N}]+(?:-[\p{Script=Arabic}\p{Script=Latin}\p{N}]+)*$/u;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_PATTERN.test(slug);
}
