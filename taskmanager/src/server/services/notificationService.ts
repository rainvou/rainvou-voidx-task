/* ------------------------------------------------------------------ */
/*  Notification service – mention parsing & notification stubs        */
/* ------------------------------------------------------------------ */

/**
 * Extract @username patterns from text content.
 *
 * Rules:
 *  - Matches `@` followed by 1-39 word characters (letters, digits, underscores).
 *  - Ignores email-like patterns (preceded by a word character).
 *  - Returns a deduplicated array of usernames (without the `@` prefix).
 */
export function parseMentions(content: string): string[] {
  // Negative lookbehind: skip email-style `user@name`
  const mentionRegex = /(?<!\w)@(\w{1,39})\b/g;
  const matches = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(content)) !== null) {
    matches.add(match[1]);
  }

  return Array.from(matches);
}

/* ------------------------------------------------------------------ */
/*  Notification types (interface only – no persistence yet)           */
/* ------------------------------------------------------------------ */

export type NotificationType = "mention" | "reply" | "reaction";

export interface NotificationData {
  commentId: string;
  taskId: string;
  mentionedBy?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  data: NotificationData;
  read: boolean;
  createdAt: Date;
}

/**
 * Create a notification for the given user.
 *
 * Currently a stub – logs to console.  Replace with a DB insert or message
 * queue push when the Notification model is finalised.
 */
export function createNotification(
  userId: string,
  type: NotificationType,
  data: NotificationData,
): void {
  console.log("[notification]", { userId, type, data, createdAt: new Date() });
}
