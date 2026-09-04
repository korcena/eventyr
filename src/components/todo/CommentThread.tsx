"use client";

import { useTransition, useState } from "react";
import { addComment, updateComment, deleteComment } from "@/lib/actions/comments";
import type { CommentRow } from "@/lib/actions/comments";
import { Input, Button } from "@/components/ui";

export function CommentThread({
  todoId,
  comments,
  currentUserId,
}: {
  todoId: string;
  comments: CommentRow[];
  currentUserId: string;
}) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  return (
    <div>
      <p className="mb-3 text-[10px] uppercase tracking-wider text-text-tertiary">
        Comments ({comments.length})
      </p>

      <div className="space-y-3">
        {comments.map((comment) => {
          const initials = comment.profile?.display_name
            ? comment.profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
            : "??";
          const isOwner = comment.user_id === currentUserId;

          return (
            <div key={comment.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#333] text-[10px] text-text-secondary">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-text-primary">
                    {comment.profile?.display_name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                  {isOwner && editingId !== comment.id && (
                    <div className="ml-auto flex gap-2">
                      <button
                        className="text-[10px] text-text-tertiary hover:text-accent"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="text-[10px] text-text-tertiary hover:text-error"
                        onClick={() => {
                          startTransition(async () => {
                            await deleteComment(comment.id);
                          });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={!editContent.trim()}
                      onClick={() => {
                        startTransition(async () => {
                          await updateComment(comment.id, editContent);
                          setEditingId(null);
                        });
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-text-secondary">{comment.content}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {comments.length === 0 && (
        <p className="mb-3 text-xs text-text-tertiary">No comments yet.</p>
      )}

      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <Input
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && content.trim()) {
              startTransition(async () => {
                await addComment(todoId, content);
                setContent("");
              });
            }
          }}
        />
        <Button
          size="sm"
          disabled={pending || !content.trim()}
          onClick={() => {
            startTransition(async () => {
              await addComment(todoId, content);
              setContent("");
            });
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}