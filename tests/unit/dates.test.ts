import { describe, expect, it } from "vitest";
import { addDays, dayInZone, isDay, startOfDayInZone } from "@/lib/dates";

describe("calendar days in the store's time zone", () => {
  it("validates real calendar days only", () => {
    expect(isDay("2026-10-05")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("2026-1-05")).toBe(false);
    expect(isDay("")).toBe(false);
  });

  it("finds when a day starts in zones ahead of and behind UTC", () => {
    expect(startOfDayInZone("2026-11-01", "Asia/Baghdad").toISOString()).toBe(
      "2026-10-31T21:00:00.000Z",
    );
    expect(startOfDayInZone("2026-11-01", "UTC").toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(startOfDayInZone("2026-07-01", "America/New_York").toISOString()).toBe(
      "2026-07-01T04:00:00.000Z",
    );
  });

  it("handles days next to a daylight-saving change", () => {
    // New York leaves DST on 2026-11-01 at 02:00 (UTC-4 → UTC-5).
    expect(startOfDayInZone("2026-11-01", "America/New_York").toISOString()).toBe(
      "2026-11-01T04:00:00.000Z",
    );
    expect(startOfDayInZone("2026-11-02", "America/New_York").toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
    // Cairo starts DST at midnight on the last Friday of April: that day begins at 01:00.
    const cairo = startOfDayInZone("2026-04-24", "Africa/Cairo");
    expect(dayInZone(cairo, "Africa/Cairo")).toBe("2026-04-24");
    expect(dayInZone(new Date(cairo.getTime() - 1), "Africa/Cairo")).toBe("2026-04-23");
  });

  it("reads the day an instant falls on, and steps across months and years", () => {
    expect(dayInZone(new Date("2026-10-31T21:00:00Z"), "Asia/Baghdad")).toBe("2026-11-01");
    expect(dayInZone(new Date("2026-10-31T20:59:59Z"), "Asia/Baghdad")).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(() => startOfDayInZone("2026-02-30", "UTC")).toThrow(RangeError);
  });
});
