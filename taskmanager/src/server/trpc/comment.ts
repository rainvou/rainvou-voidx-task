import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import { parseMentions, createNotification } from "../services/notificationService";

/** Zod schema shared between create / update */
const commentContentSchema = z
  .string()
  .min(1, "Comment must not be empty")
  .max(10_000, "Comment must be at most 10 000 characters");

/** Allowed emoji set – any single emoji codepoint sequence up to 32 chars */
const emojiSchema = z
  .string()
  .min(1, "Emoji must not be empty")
  .max(32, "Emoji value is too long")
  .regex(
    /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+$/u,
    "Invalid emoji character",
  );

export const commentRouter = router({
  /* ------------------------------------------------------------------ */
  /*  list – paginated comments for a task (with author + reactions)     */
  /* ------------------------------------------------------------------ */
  list: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { taskId, cursor, limit } = input;

      const comments = await ctx.prisma.comment.findMany({
        where: {
          taskId,
          parentId: null, // top-level only; replies fetched via include
        },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          replies: {
            include: {
              author: { select: { id: true, name: true, email: true, image: true } },
              reactions: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (comments.length > limit) {
        const next = comments.pop();
        nextCursor = next?.id;
      }

      return { comments, nextCursor };
    }),

  /* ------------------------------------------------------------------ */
  /*  create – new comment (top-level or reply)                         */
  /* ------------------------------------------------------------------ */
  create: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        content: commentContentSchema,
        parentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, content, parentId } = input;
      const authorId = ctx.session.user.id;

      // Validate parentId belongs to the same task when provided
      if (parentId) {
        const parent = await ctx.prisma.comment.findUnique({
          where: { id: parentId },
        });
        if (!parent || parent.taskId !== taskId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Parent comment does not belong to this task",
          });
        }
      }

      const comment = await ctx.prisma.comment.create({
        data: { taskId, authorId, content, parentId: parentId ?? null },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          reactions: true,
          replies: true,
        },
      });

      // Detect @mentions and create notifications
      const mentionedUsernames = parseMentions(content);
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await ctx.prisma.user.findMany({
          where: { name: { in: mentionedUsernames } },
          select: { id: true, name: true },
        });

        for (const user of mentionedUsers) {
          if (user.id !== authorId) {
            createNotification(user.id, "mention", {
              commentId: comment.id,
              taskId,
              mentionedBy: authorId,
            });
          }
        }
      }

      return comment;
    }),

  /* ------------------------------------------------------------------ */
  /*  update – edit own comment                                         */
  /* ------------------------------------------------------------------ */
  update: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        content: commentContentSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.comment.findUnique({
        where: { id: input.commentId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      if (existing.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      return ctx.prisma.comment.update({
        where: { id: input.commentId },
        data: { content: input.content },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          reactions: true,
        },
      });
    }),

  /* ------------------------------------------------------------------ */
  /*  delete – remove own comment                                       */
  /* ------------------------------------------------------------------ */
  delete: protectedProcedure
    .input(z.object({ commentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.comment.findUnique({
        where: { id: input.commentId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      if (existing.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await ctx.prisma.comment.delete({ where: { id: input.commentId } });
      return { success: true };
    }),

  /* ------------------------------------------------------------------ */
  /*  addReaction – add emoji reaction to a comment                     */
  /* ------------------------------------------------------------------ */
  addReaction: protectedProcedure
    .input(
      z.object({
        commentId: z.string().uuid(),
        emoji: emojiSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Prevent duplicate reactions (same user + same emoji + same comment)
      const existing = await ctx.prisma.reaction.findFirst({
        where: {
          commentId: input.commentId,
          userId,
          emoji: input.emoji,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already reacted with this emoji",
        });
      }

      return ctx.prisma.reaction.create({
        data: {
          commentId: input.commentId,
          userId,
          emoji: input.emoji,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    }),

  /* ------------------------------------------------------------------ */
  /*  removeReaction – remove own reaction                              */
  /* ------------------------------------------------------------------ */
  removeReaction: protectedProcedure
    .input(z.object({ reactionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.reaction.findUnique({
        where: { id: input.reactionId },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reaction not found" });
      }
      if (existing.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only remove your own reactions",
        });
      }

      await ctx.prisma.reaction.delete({ where: { id: input.reactionId } });
      return { success: true };
    }),
});
