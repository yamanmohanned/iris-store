/**
 * Minimal CSV (RFC 4180) for spreadsheets made in Excel or Google Sheets: quoted fields with ""
 * escapes and line breaks, CRLF or LF, a UTF-8 byte-order mark (so Excel shows Arabic correctly),
 * and the delimiter Excel uses for the region (comma, semicolon or tab) detected from the header.
 */

const DELIMITERS = [",", ";", "\t"] as const;

/** Cells that a spreadsheet would run as a formula ("CSV injection"). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** The delimiter that splits the header line into the most cells (quoted text is skipped). */
export function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && counts.has(ch)) counts.set(ch, counts.get(ch)! + 1);
  }
  let best: string = ",";
  for (const [d, n] of counts) if (n > counts.get(best)!) best = d;
  return best;
}

/** Rows of cells. Fully blank rows are dropped; cells are returned as written (not trimmed). */
export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let fieldStarted = false;

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
      continue;
    }
    if (ch === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
    } else if (ch === delimiter) endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += ch;
      fieldStarted = true;
    }
  }
  if (fieldStarted || row.length) endRow();
  return rows;
}

/** One cell, quoted when needed. Text that a spreadsheet would treat as a formula gets a `'`. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",;\t\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A whole file: byte-order mark, comma-separated cells, CRLF line endings. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** Undo the formula guard added by `csvCell` when a file comes back. */
export function unguardCell(text: string): string {
  return /^'[=+\-@\t\r]/.test(text) ? text.slice(1) : text;
}
