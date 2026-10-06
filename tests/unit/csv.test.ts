import { describe, expect, it } from "vitest";
import { csvCell, detectDelimiter, parseCsv, toCsv, unguardCell } from "@/lib/csv";

describe("CSV parsing", () => {
  it("reads quoted cells with commas, escaped quotes and line breaks", () => {
    const text = 'name,description\r\n"Shirt, blue","He said ""hi""\nsecond line"\r\nPlain,x\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "description"],
      ["Shirt, blue", 'He said "hi"\nsecond line'],
      ["Plain", "x"],
    ]);
  });

  it("strips the byte-order mark and drops blank rows", () => {
    expect(parseCsv("\uFEFFa,b\n\n,\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty cells and a last row without a line break", () => {
    expect(parseCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("detects the delimiter Excel used from the header line", () => {
    expect(detectDelimiter("اسم المنتج;السعر;الكمية\nقميص;15000;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter('"a;b",c\n')).toBe(",");
    expect(parseCsv("اسم المنتج;السعر\nقميص;15000")).toEqual([
      ["اسم المنتج", "السعر"],
      ["قميص", "15000"],
    ]);
  });

  it("treats a quote inside an unquoted cell as text", () => {
    expect(parseCsv('a,b\n5" screen,x')).toEqual([
      ["a", "b"],
      ['5" screen', "x"],
    ]);
  });
});

describe("CSV writing", () => {
  it("quotes only when needed and round-trips through the parser", () => {
    const rows = [
      ["name", "notes"],
      ["قميص قطني", 'size "M", fits well\nwash cold'],
      [" padded ", ""],
    ];
    const text = toCsv(rows);
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("\r\n");
    expect(parseCsv(text)).toEqual(rows);
  });

  it("neutralizes cells a spreadsheet would run as formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-5")).toBe("'-5");
    // Numbers are data, not text a person typed.
    expect(csvCell(-5)).toBe("-5");
    expect(unguardCell("'=HYPERLINK(1)")).toBe("=HYPERLINK(1)");
    expect(unguardCell("'quoted")).toBe("'quoted");
    expect(parseCsv(toCsv([["=1+1"]])).map((r) => r.map(unguardCell))).toEqual([["=1+1"]]);
  });

  it("writes empty cells for null and undefined", () => {
    expect(toCsv([["a", null, undefined, 0]])).toBe("\uFEFFa,,,0\r\n");
  });
});
