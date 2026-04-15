"use client";

import React, { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Author {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface ReactionData {
  id: string;
  emoji: string;
  user: { id: string; name: string | null };
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  reactions: ReactionData[];
  replies?: CommentData[];
}

interface CommentThreadProps {
  comments: CommentData[];
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onAddReaction: (commentId: string, emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build initials from user name (e.g. "Alice Park" -> "AP"). */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Render simple markdown-like content (bold, italic, code, @mentions). */
function renderContent(content: string): React.ReactNode[] {
  // Split into segments based on patterns
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(@\w{1,39})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const [full] = match;
    if (full.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: "#f1f5f9",
            padding: "1px 4px",
            borderRadius: 3,
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {full.slice(1, -1)}
        </code>,
      );
    } else if (full.startsWith("**")) {
      parts.push(<strong key={match.index}>{full.slice(2, -2)}</strong>);
    } else if (full.startsWith("*")) {
      parts.push(<em key={match.index}>{full.slice(1, -1)}</em>);
    } else if (full.startsWith("@")) {
      parts.push(
        <span
          key={match.index}
          style={{
            color: "#2563eb",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {full}
        </span>,
      );
    }

    lastIndex = match.index + full.length;
  }

  // Trailing plain text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

/** Format a timestamp for display. */
function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  Grouped reactions                                                  */
/* ------------------------------------------------------------------ */

interface GroupedReaction {
  emoji: string;
  count: number;
  reactionIds: string[];
  userNames: string[];
  currentUserReactionId: string | null;
}

function groupReactions(
  reactions: ReactionData[],
  currentUserId: string,
): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>();

  for (const r of reactions) {
    const existing = map.get(r.emoji);
    if (existing) {
      existing.count++;
      existing.reactionIds.push(r.id);
      existing.userNames.push(r.user.name ?? "Unknown");
      if (r.user.id === currentUserId) {
        existing.currentUserReactionId = r.id;
      }
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        reactionIds: [r.id],
        userNames: [r.user.name ?? "Unknown"],
        currentUserReactionId: r.user.id === currentUserId ? r.id : null,
      });
    }
  }

  return Array.from(map.values());
}

/* ------------------------------------------------------------------ */
/*  Quick emoji picker                                                 */
/* ------------------------------------------------------------------ */

const QUICK_EMOJIS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F604}", "\u{1F389}", "\u{1F440}", "\u{1F680}"];

function EmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "none",
          border: "1px solid #e2e8f0",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 14,
          padding: "2px 6px",
        }}
        aria-label="Add reaction"
      >
        +
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: 4,
            display: "flex",
            gap: 2,
            zIndex: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                padding: 2,
              }}
            >
              {emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Single comment                                                     */
/* ------------------------------------------------------------------ */

function Comment({
  comment,
  currentUserId,
  depth,
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
}: {
  comment: CommentData;
  currentUserId: string;
  depth: number;
  onReply: (parentId: string, content: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onAddReaction: (commentId: string, emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const isOwn = comment.author.id === currentUserId;
  const grouped = groupReactions(comment.reactions, currentUserId);

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText("");
    setReplyOpen(false);
  };

  const handleEditSubmit = () => {
    if (!editText.trim()) return;
    onEdit(comment.id, editText.trim());
    setEditing(false);
  };

  return (
    <div
      style={{
        marginLeft: depth > 0 ? 24 : 0,
        borderLeft: depth > 0 ? "2px solid #e2e8f0" : "none",
        paddingLeft: depth > 0 ? 12 : 0,
        marginTop: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#6366f1",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(comment.author.name)}
        </div>
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {comment.author.name ?? "Unknown"}
        </span>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          {formatTime(comment.createdAt)}
        </span>
      </div>

      {/* Body */}
      <div style={{ marginTop: 4, marginLeft: 40, fontSize: 14, lineHeight: 1.5 }}>
        {editing ? (
          <div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleEditSubmit}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  backgroundColor: "#6366f1",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditText(comment.content);
                }}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  backgroundColor: "#f1f5f9",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0 }}>{renderContent(comment.content)}</p>
        )}
      </div>

      {/* Reactions */}
      <div
        style={{
          marginTop: 4,
          marginLeft: 40,
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          alignItems: "center",
        }}
      >
        {grouped.map((g) => (
          <button
            key={g.emoji}
            type="button"
            title={g.userNames.join(", ")}
            onClick={() => {
              if (g.currentUserReactionId) {
                onRemoveReaction(g.currentUserReactionId);
              } else {
                onAddReaction(comment.id, g.emoji);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              border: g.currentUserReactionId
                ? "1px solid #6366f1"
                : "1px solid #e2e8f0",
              backgroundColor: g.currentUserReactionId ? "#eef2ff" : "#f8fafc",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <span>{g.emoji}</span>
            <span style={{ fontSize: 12 }}>{g.count}</span>
          </button>
        ))}
        <EmojiPicker onSelect={(emoji) => onAddReaction(comment.id, emoji)} />
      </div>

      {/* Actions */}
      {!editing && (
        <div
          style={{
            marginTop: 4,
            marginLeft: 40,
            display: "flex",
            gap: 8,
            fontSize: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setReplyOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              color: "#6366f1",
              cursor: "pointer",
              padding: 0,
              fontSize: 12,
            }}
          >
            Reply
          </button>
          {isOwn && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 12,
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Inline reply form */}
      {replyOpen && (
        <div style={{ marginTop: 8, marginLeft: 40 }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            <button
              type="button"
              onClick={handleReplySubmit}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                backgroundColor: "#6366f1",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Reply
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyOpen(false);
                setReplyText("");
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                backgroundColor: "#f1f5f9",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Threaded replies */}
      {comment.replies?.map((reply) => (
        <Comment
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          depth={depth + 1}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CommentThread – top-level export                                   */
/* ------------------------------------------------------------------ */

export default function CommentThread({
  comments,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
}: CommentThreadProps) {
  if (comments.length === 0) {
    return (
      <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: 24 }}>
        No comments yet. Be the first to add one!
      </p>
    );
  }

  return (
    <div>
      {comments.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          depth={0}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddReaction={onAddReaction}
          onRemoveReaction={onRemoveReaction}
        />
      ))}
    </div>
  );
}
