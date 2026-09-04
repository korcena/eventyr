import type { TodoStatus } from "./todo-status";

export function detectCycle(
  todoId: string,
  dependsOnId: string,
  existingDeps: Map<string, string[]>,
): boolean {
  if (todoId === dependsOnId) return true;

  const visited = new Set<string>();
  const queue = [dependsOnId];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === todoId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = existingDeps.get(current);
    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
  }

  return false;
}