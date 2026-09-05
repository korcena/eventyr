"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <p className="text-sm text-text-tertiary">Loading editor…</p>,
});

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    [{ align: [] }],
    ["clean"],
  ],
};

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "blockquote",
  "code-block",
  "link",
  "align",
];

export function QuillEditor({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const handleChange = useCallback(
    (value: string) => {
      onChange(value);
    },
    [onChange],
  );

  return (
    <div className="quill-wrapper">
      <ReactQuill
        theme="snow"
        modules={MODULES}
        formats={FORMATS}
        defaultValue={initialContent}
        onChange={handleChange}
        placeholder="Start writing your page…"
      />
    </div>
  );
}