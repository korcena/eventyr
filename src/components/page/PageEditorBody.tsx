"use client";

import { useRef, useState, useTransition } from "react";
import { updatePageContent } from "@/lib/actions/pages";
import { QuillEditor } from "./QuillEditor";

export function PageEditorBody({
  pageId,
  content,
  canEdit,
}: {
  pageId: string;
  content: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(content);

  function handleChange(html: string) {
    latestRef.current = html;
    setSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await updatePageContent(pageId, latestRef.current);
        setSaved(true);
      });
    }, 800);
  }

  if (!canEdit) {
    if (!content.trim()) {
      return <p className="py-8 text-center text-sm text-text-tertiary">This page has no content yet.</p>;
    }
    return (
      <div
        className="prose prose-invert max-w-none text-sm leading-relaxed text-text-secondary"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div>
      <QuillEditor initialContent={content} onChange={handleChange} />
      <div className="mt-1.5 text-[11px] text-text-tertiary">
        {pending ? "Saving…" : saved ? "Saved" : "Unsaved changes"}
      </div>
    </div>
  );
}