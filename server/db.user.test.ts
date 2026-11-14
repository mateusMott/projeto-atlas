import { describe, expect, it } from "vitest";
import { buildUserUpsertPlan } from "./db";

describe("buildUserUpsertPlan", () => {
  const lastSignedIn = new Date("2026-11-13T00:00:00.000Z");
  const base = { openId: "oauth-user-1", lastSignedIn };

  it("grants admin only when the OAuth email matches the allowlist", () => {
    const plan = buildUserUpsertPlan(
      { ...base, email: " Admin@Example.com " },
      "admin@example.com"
    );

    expect(plan.values.role).toBe("admin");
    expect(plan.updates.role).toBe("admin");
  });

  it("keeps a new or non-allowlisted account as a regular user", () => {
    const plan = buildUserUpsertPlan(
      { ...base, email: "someone@example.com" },
      "admin@example.com"
    );

    expect(plan.values.role).toBe("user");
    expect(plan.updates.role).toBe("user");
  });

  it("preserves stored identity and role during a partial session heartbeat", () => {
    const plan = buildUserUpsertPlan(base, "admin@example.com");

    expect(plan.values.role).toBe("user");
    expect(plan.updates).toEqual({ lastSignedIn });
  });

  it("demotes an account when OAuth explicitly reports a different email", () => {
    const plan = buildUserUpsertPlan(
      { ...base, email: "changed@example.com" },
      "admin@example.com"
    );

    expect(plan.updates.email).toBe("changed@example.com");
    expect(plan.updates.role).toBe("user");
  });

  it("fails closed if the admin allowlist is empty", () => {
    const plan = buildUserUpsertPlan(
      { ...base, email: "admin@example.com" },
      "   "
    );

    expect(plan.values.role).toBe("user");
    expect(plan.updates.role).toBe("user");
  });
});
