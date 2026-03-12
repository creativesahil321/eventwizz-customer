"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, MessageSquare, Send, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import type { AdminVenueComment } from "@/services/admin/venues/type";

interface VenueCommentsProps {
  venueId: number;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function CommentItem({
  comment,
  venueId,
  onDeleted,
}: {
  comment: AdminVenueComment;
  venueId: number;
  onDeleted: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);

  const updateMutation = useMutation({
    mutationFn: (body: string) =>
      adminVenuesService.updateComment(venueId, comment.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venueId), "comments"],
      });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminVenuesService.deleteComment(venueId, comment.id),
    onSuccess: () => {
      onDeleted(comment.id);
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venueId), "comments"],
      });
    },
  });

  const isPending = updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="group flex gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Avatar */}
      <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold uppercase">
        {comment.author?.name?.charAt(0) ?? "A"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">
            {comment.author?.name ?? "Admin"}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDate(comment.created_at)}
          </span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="text-sm min-h-[72px] resize-none"
              disabled={isPending}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="event-primary"
                className="gap-1.5 h-7 text-xs"
                disabled={!editBody.trim() || isPending}
                onClick={() => updateMutation.mutate(editBody.trim())}
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 h-7 text-xs"
                disabled={isPending}
                onClick={() => {
                  setEditing(false);
                  setEditBody(comment.body);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        )}
      </div>

      {/* Actions — visible on hover */}
      {!editing && (
        <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Edit comment"
            disabled={isPending}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Delete comment"
            disabled={isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function VenueComments({ venueId }: VenueCommentsProps) {
  const queryClient = useQueryClient();
  const [newBody, setNewBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "venue", String(venueId), "comments"],
    queryFn: () => adminVenuesService.getComments(venueId),
  });

  const comments: AdminVenueComment[] = data?.data ?? [];

  const addMutation = useMutation({
    mutationFn: (body: string) => adminVenuesService.addComment(venueId, body),
    onSuccess: () => {
      setNewBody("");
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venueId), "comments"],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBody.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  const handleDeleted = (_id: number) => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "venue", String(venueId), "comments"],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Admin Comments
        </p>
        {comments.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              "bg-slate-100 text-slate-600",
            )}
          >
            {comments.length}
          </span>
        )}
      </div>

      {/* Comment list */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/30">
        {isLoading ? (
          <div className="px-4 py-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <MessageSquare className="h-4 w-4 animate-pulse" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No comments yet. Add the first one below.
          </div>
        ) : (
          <div className="px-4 divide-y-0">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                venueId={venueId}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Write a comment…"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          className="text-sm min-h-[72px] resize-none"
          disabled={addMutation.isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              const trimmed = newBody.trim();
              if (trimmed) addMutation.mutate(trimmed);
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="event-primary"
            className="gap-2"
            disabled={!newBody.trim() || addMutation.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            {addMutation.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd> to submit quickly.
        </p>
      </form>
    </div>
  );
}
