"use client";

import { useTransition, useState } from "react";
import { addDependency, removeDependency } from "@/lib/actions/dependencies";
import type { DependencyRow } from "@/lib/actions/dependencies";
import type { TodoRow } from "@/lib/actions/todos";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui";

export function DependencyList({
  todoId,
  dependencies,
  dependents,
  availableDeps,
}: {
  todoId: string;
  dependencies: DependencyRow[];
  dependents: DependencyRow[];
  availableDeps: TodoRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedDep, setSelectedDep] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Dependencies</p>
        <div className="flex gap-1.5">
          <Select
            value={selectedDep}
            onChange={(e) => setSelectedDep(e.target.value)}
            className="w-40 text-xs"
          >
            <option value="">Select a task...</option>
            {availableDeps.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending || !selectedDep}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await addDependency(todoId, selectedDep);
                if (result.error) setError(result.error);
                else setSelectedDep("");
              });
            }}
          >
            + Add
          </Button>
        </div>
      </div>

      {dependencies.length > 0 ? (
        <div className="space-y-1.5">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center gap-2 rounded-md bg-bg-tertiary px-2.5 py-1.5"
            >
              <span className="text-warning">⚠</span>
              <span className="flex-1 text-xs text-text-primary">{dep.depends_on?.title}</span>
              <span className="text-[10px] text-text-tertiary">{dep.depends_on?.status.replace("_", " ")}</span>
              <button
                className="text-[10px] text-text-tertiary hover:text-error"
                onClick={() =>
                  startTransition(async () => {
                    await removeDependency(dep.id);
                  })
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-tertiary">No dependencies.</p>
      )}

      {dependents.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">
            Blocked By This Task
          </p>
          <div className="space-y-1">
            {dependents.map((dep) => (
              <div key={dep.id} className="text-xs text-text-secondary">
                ↳ {dep.depends_on?.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {dependencies.some((d) => d.depends_on?.status !== "completed") && (
        <p className="mt-2 text-[11px] italic text-text-tertiary">
          This task cannot be completed until all dependencies are done.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}