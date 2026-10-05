/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeNextPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 300)
    return fallback;
  if (/[\r\n]/.test(v) || v.startsWith("/api/")) return fallback;
  return v;
}
