import { z } from "zod";

/** Reusable zod pieces shared by server actions and client forms. */
export const localizedText = (max = 500) =>
  z.object({
    ar: z.string().trim().max(max).optional(),
    en: z.string().trim().max(max).optional(),
  });

/** Localized text that must have at least one non-empty language. */
export const requiredLocalizedText = (max = 500) =>
  localizedText(max).refine((v) => Boolean(v.ar?.trim() || v.en?.trim()), { message: "required" });

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalid color");

export const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "invalid url");

/** Same-site relative link (e.g. "/c/dresses") or an absolute http(s) URL. */
export const linkHref = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => (v.startsWith("/") && !v.startsWith("//")) || httpUrl.safeParse(v).success,
    "invalid link",
  );
