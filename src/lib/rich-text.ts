/**
 * Descriptions and pages are stored as (sanitized) HTML but edited as plain text, so owners never
 * see or type tags:
 *
 *   blank line        → new paragraph          ## Title    → heading      ### Title → subheading
 *   • / - / * item    → bullet list            1. item     → numbered list
 *   **words**         → bold
 *
 * These two functions convert both ways. The server sanitizes the HTML again before storing it.
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
  return (
    html
      .replace(/\r/g, "")
      // Whitespace around block tags is formatting, not content ("</li>\n<li>" must not add a
      // blank line, which would split the list on the way back).
      .replace(
        /\s*(<\/?(?:p|ul|ol|li|h[1-6]|div|blockquote|br|hr|table|thead|tbody|tr|td|th)\b[^>]*>)\s*/gi,
        "$1",
      )
      // Numbered lists first, so their items keep their numbers.
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner: string) => {
        let n = 0;
        return `\n${inner.replace(/<li[^>]*>/gi, () => `${++n}. `).replace(/<\/li>/gi, "\n")}\n`;
      })
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/(ul|ol)>/gi, "\n")
      .replace(/<h2[^>]*>/gi, "\n\n## ")
      .replace(/<h[34][^>]*>/gi, "\n\n### ")
      .replace(/<\/?(strong|b)(\s[^>]*)?>/gi, "**")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|div|blockquote)>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
      .split("\n")
      .map((l) => l.trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inline = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const BULLET = /^[•\-*]\s+/;
const NUMBERED = /^\d{1,3}[.)]\s+/;
const HEADING = /^(#{2,3})\s+(.+)$/;

export function editableToHtml(text: string | null | undefined): string {
  const clean = (text ?? "").replace(/\r/g, "").trim();
  if (!clean) return "";
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list)
      out.push(
        `<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`,
      );
    list = null;
  };

  for (const raw of clean.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }
    const marker = BULLET.exec(line) ?? NUMBERED.exec(line);
    if (marker) {
      flushParagraph();
      const tag = BULLET.test(line) ? "ul" : "ol";
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(line.slice(marker[0].length));
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return out.join("");
}
