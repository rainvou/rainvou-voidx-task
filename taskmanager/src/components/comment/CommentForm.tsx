"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserSuggestion {
  id: string;
  name: string;
  email: string | null;
}

interface CommentFormProps {
  /** Called when the user submits a comment. */
  onSubmit: (content: string) => void;
  /** List of users available for @mention autocomplete. */
  users?: UserSuggestion[];
  /** Placeholder text. */
  placeholder?: string;
  /** Disable the form (e.g. while a mutation is in-flight). */
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  CommentForm                                                        */
/* ------------------------------------------------------------------ */

export default function CommentForm({
  onSubmit,
  users = [],
  placeholder = "Write a comment... (use @ to mention someone)",
  disabled = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorAtIndex, setCursorAtIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---------------------------------------------------------------- */
  /*  Derived mention suggestion list                                  */
  /* ---------------------------------------------------------------- */

  const suggestions =
    mentionQuery !== null
      ? users.filter((u) =>
          u.name.toLowerCase().startsWith(mentionQuery.toLowerCase()),
        )
      : [];

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  /** Detect @ trigger while typing. */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursor = e.target.selectionStart ?? value.length;
      setContent(value);

      // Find if we are in the middle of a @mention
      const textBeforeCursor = value.slice(0, cursor);
      const atMatch = textBeforeCursor.match(/(?<!\w)@(\w{0,39})$/);

      if (atMatch) {
        setMentionQuery(atMatch[1]);
        setCursorAtIndex(cursor);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
        setCursorAtIndex(null);
      }
    },
    [],
  );

  /** Accept a mention suggestion. */
  const acceptSuggestion = useCallback(
    (user: UserSuggestion) => {
      if (cursorAtIndex === null) return;

      const textBeforeCursor = content.slice(0, cursorAtIndex);
      const atPos = textBeforeCursor.lastIndexOf("@");
      if (atPos === -1) return;

      const before = content.slice(0, atPos);
      const after = content.slice(cursorAtIndex);
      const inserted = `@${user.name.replace(/\s+/g, "_")} `;
      const newContent = before + inserted + after;

      setContent(newContent);
      setMentionQuery(null);
      setCursorAtIndex(null);

      // Restore focus
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const pos = before.length + inserted.length;
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      });
    },
    [content, cursorAtIndex],
  );

  /** Keyboard navigation inside the mention dropdown. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (suggestions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => (i + 1) % suggestions.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          acceptSuggestion(suggestions[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }

      // Submit on Cmd/Ctrl + Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [suggestions, mentionIndex, acceptSuggestion],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
    setMentionQuery(null);
  }, [content, onSubmit]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          fontSize: 14,
          resize: "vertical",
          fontFamily: "inherit",
          lineHeight: 1.5,
        }}
      />

      {/* @mention dropdown */}
      {suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            width: "100%",
            maxHeight: 200,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 20,
            marginBottom: 4,
          }}
        >
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // keep textarea focus
                acceptSuggestion(user);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: idx === mentionIndex ? "#eef2ff" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
              }}
            >
              {/* Mini avatar */}
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: "#6366f1",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {user.name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              {user.email && (
                <span style={{ color: "#94a3b8", fontSize: 12 }}>
                  {user.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Submit button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 6,
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          Cmd+Enter to send
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !content.trim()}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            backgroundColor:
              disabled || !content.trim() ? "#e2e8f0" : "#6366f1",
            color: disabled || !content.trim() ? "#94a3b8" : "#fff",
            border: "none",
            cursor: disabled || !content.trim() ? "default" : "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
