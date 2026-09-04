import { describe, it, expect } from "vitest";
import { daysLeft, formatDaysLeft, STATUS_LABELS } from "@/lib/todo-status";

describe("daysLeft", () => {
  it("returns null for null due date", () => {
    expect(daysLeft(null)).toBeNull();
  });

  it("returns positive days for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const result = daysLeft(future.toISOString());
    expect(result).toBe(3);
  });

  it("returns 0 for today", () => {
    const now = new Date();
    const result = daysLeft(now.toISOString());
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(0);
  });

  it("returns negative days for past date", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const result = daysLeft(past.toISOString());
    expect(result).toBe(-5);
  });
});

describe("formatDaysLeft", () => {
  it("returns — for null", () => {
    expect(formatDaysLeft(null)).toBe("—");
  });

  it("returns Today for 0", () => {
    expect(formatDaysLeft(0)).toBe("Today");
  });

  it("returns singular day", () => {
    expect(formatDaysLeft(1)).toBe("1 day");
  });

  it("returns plural days", () => {
    expect(formatDaysLeft(3)).toBe("3 days");
  });

  it("returns overdue singular", () => {
    expect(formatDaysLeft(-1)).toBe("1 day over");
  });

  it("returns overdue plural", () => {
    expect(formatDaysLeft(-5)).toBe("5 days over");
  });
});

describe("STATUS_LABELS", () => {
  it("has all four statuses", () => {
    expect(STATUS_LABELS.not_started).toBe("Not Started");
    expect(STATUS_LABELS.in_progress).toBe("In Progress");
    expect(STATUS_LABELS.blocked).toBe("Blocked");
    expect(STATUS_LABELS.completed).toBe("Completed");
  });
});