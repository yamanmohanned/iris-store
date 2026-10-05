/**
 * Product descriptions are stored as (sanitized) HTML but edited as plain text: blank lines make
 * paragraphs and lines starting with "•", "-" or "*" make a bullet list. These two functions
 * convert both ways so owners never see or type tags.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export function htmlToEditable(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/\r/g, "")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BULLET = /^\s*[•\-*]\s+/;

export function editableToHtml(text: string | null | undefined): string {
  const clean = (text ?? "").replace(/\r/g, "").trim();
  if (!clean) return "";
  return clean
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length && lines.every((l) => BULLET.test(l)))
        return `<ul>${lines.map((l) => `<li>${escape(l.replace(BULLET, ""))}</li>`).join("")}</ul>`;
      return `<p>${lines.map(escape).join("<br>")}</p>`;
    })
    .join("");
}
