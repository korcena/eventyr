"use client";

import { useTransition, useState } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

export function TableBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<string[]>((block.content.headers as string[]) ?? []);
  const [rows, setRows] = useState<string[][]>((block.content.rows as string[][]) ?? []);

  const save = (newHeaders: string[], newRows: string[][]) => {
    startTransition(async () => {
      await updateBlock(block.id, { ...block.content, headers: newHeaders, rows: newRows });
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {headers.map((header, i) => (
              <th key={i} className="px-2 py-1 text-left text-[10px] uppercase text-text-tertiary">
                {canEdit ? (
                  <input
                    defaultValue={header}
                    onBlur={(e) => {
                      const newHeaders = [...headers];
                      newHeaders[i] = e.target.value;
                      setHeaders(newHeaders);
                      save(newHeaders, rows);
                    }}
                    className="w-full bg-transparent font-semibold focus:outline-none"
                  />
                ) : (
                  <span className="font-semibold">{header}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 text-text-secondary">
                  {canEdit ? (
                    <input
                      defaultValue={cell}
                      onBlur={(e) => {
                        const newRows = [...rows];
                        newRows[ri] = [...row];
                        newRows[ri][ci] = e.target.value;
                        setRows(newRows);
                        save(headers, newRows);
                      }}
                      className="w-full bg-transparent focus:outline-none"
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
              {canEdit && (
                <td>
                  <button
                    onClick={() => {
                      const newRows = rows.filter((_, idx) => idx !== ri);
                      setRows(newRows);
                      save(headers, newRows);
                    }}
                    className="text-text-tertiary hover:text-error"
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <div className="mt-1 flex gap-2">
          <button
            onClick={() => {
              const newRows = [...rows, new Array(headers.length || 1).fill("")];
              setRows(newRows);
            }}
            className="text-xs text-text-tertiary hover:text-accent"
          >
            + Add row
          </button>
          <button
            onClick={() => {
              const newHeaders = [...headers, ""];
              setHeaders(newHeaders);
            }}
            className="text-xs text-text-tertiary hover:text-accent"
          >
            + Add column
          </button>
        </div>
      )}
    </div>
  );
}