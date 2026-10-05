import { describe, expect, it } from "vitest";
import { readableForeground } from "@/lib/color";
import {
  assignableRoles,
  hasPermission,
  isStaffRole,
  permissionsOf,
} from "@/server/auth/permissions";
import { safeNextPath } from "@/lib/safe-next";
import { checkPasswordPolicy } from "@/server/security/password";
import { describeUserAgent } from "@/lib/user-agent";

describe("permissions", () => {
  it("grants nothing to customers and everything to owners", () => {
    expect(permissionsOf("customer")).toEqual([]);
    expect(hasPermission("owner", "staff:manage")).toBe(true);
    expect(hasPermission("admin", "staff:manage")).toBe(false);
    expect(hasPermission("admin", "settings:write")).toBe(true);
  });

  it("limits managers to their area", () => {
    expect(hasPermission("order_manager", "orders:write")).toBe(true);
    expect(hasPermission("order_manager", "products:write")).toBe(false);
    expect(hasPermission("catalog_manager", "products:write")).toBe(true);
    expect(hasPermission("catalog_manager", "settings:write")).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(hasPermission("superuser", "orders:read")).toBe(false);
    expect(hasPermission(undefined, "orders:read")).toBe(false);
    expect(isStaffRole("customer")).toBe(false);
    expect(isStaffRole("owner")).toBe(true);
  });

  it("never lets anyone hand out the owner role", () => {
    expect(assignableRoles("owner")).not.toContain("owner");
    expect(assignableRoles("admin")).not.toContain("admin");
    expect(assignableRoles("order_manager")).toEqual([]);
  });
});

describe("safeNextPath (open-redirect protection)", () => {
  it("keeps internal paths", () => {
    expect(safeNextPath("/checkout")).toBe("/checkout");
    expect(safeNextPath("/p/فستان?x=1")).toBe("/p/فستان?x=1");
  });

  it("rejects external and tricky destinations", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
      "/api/auth/x",
      "/a\r\nSet-Cookie: x",
      42,
      null,
    ]) {
      expect(safeNextPath(bad, "/account")).toBe("/account");
    }
  });
});

describe("password policy", () => {
  it("accepts long memorable passphrases", () => {
    expect(checkPasswordPolicy("Calm-River-Stone-2026", { email: "a@b.com" })).toBeNull();
  });

  it("explains why a password is rejected", () => {
    expect(checkPasswordPolicy("short")).toBe("too_short");
    expect(checkPasswordPolicy("password123")).toBe("too_common");
    expect(checkPasswordPolicy("aaaaaaaaaaaa")).toBe("repetitive");
    expect(checkPasswordPolicy("1234567890ab")).toBe("repetitive");
    expect(checkPasswordPolicy("fatima.ali#2026", { email: "fatima.ali@example.com" })).toBe(
      "contains_email",
    );
  });
});

describe("misc helpers", () => {
  it("labels devices from user agents", () => {
    expect(
      describeUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari");
    expect(
      describeUserAgent(
        "Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
      ),
    ).toBe("Android · Chrome");
    expect(describeUserAgent(null)).toBe("—");
  });

  it("picks readable text colors for brand colors", () => {
    expect(readableForeground("#3d2c8d")).toBe("#ffffff");
    expect(readableForeground("#ffd84d")).toBe("#17161d");
    expect(readableForeground("not-a-color")).toBe("#ffffff");
  });
});
