import { describe, it, expect } from "vitest";
import { detectCycle } from "@/lib/cycle-detection";

describe("cycle detection", () => {
  it("returns true for self-dependency", () => {
    const deps = new Map<string, string[]>();
    expect(detectCycle("a", "a", deps)).toBe(true);
  });

  it("returns false for simple dependency with no cycle", () => {
    const deps = new Map<string, string[]>([["a", ["b"]]]);
    expect(detectCycle("c", "a", deps)).toBe(false);
  });

  it("returns true for direct cycle", () => {
    const deps = new Map<string, string[]>([["b", ["a"]]]);
    expect(detectCycle("a", "b", deps)).toBe(true);
  });

  it("returns true for indirect cycle (a→b→c→a)", () => {
    const deps = new Map<string, string[]>([
      ["b", ["c"]],
      ["c", ["a"]],
    ]);
    expect(detectCycle("a", "b", deps)).toBe(true);
  });

  it("returns false for complex DAG with no cycle", () => {
    const deps = new Map<string, string[]>([
      ["b", ["d"]],
      ["c", ["d"]],
      ["d", ["e"]],
    ]);
    expect(detectCycle("a", "b", deps)).toBe(false);
  });

  it("returns true when adding a dependency that closes a cycle (a→b→c, then c→a)", () => {
    const deps = new Map<string, string[]>([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);
    expect(detectCycle("c", "a", deps)).toBe(true);
  });

  it("returns false for a chain that does not cycle back", () => {
    const deps = new Map<string, string[]>([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);
    expect(detectCycle("d", "a", deps)).toBe(false);
  });
});