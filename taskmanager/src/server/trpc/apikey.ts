import crypto from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./init";

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Generate a random API key string prefixed with "tm_".
 */
export function generateApiKey(): string {
  const bytes = crypto.randomBytes(32);
  return `tm_${bytes.toString("hex")}`;
}

/**
 * Hash an API key with SHA-256 for storage.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Extract the display prefix from a raw key (first 8 chars after "tm_").
 */
export function keyPrefix(key: string): string {
  return key.slice(0, 7) + "...";
}

// ---------------------------------------------------------------------------
// API Key router
// ---------------------------------------------------------------------------

export const apikeyRouter = router({
  /**
   * Create a new API key for a project.
   * Returns the raw key ONCE — it is never stored in plaintext.
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100),
        expiresAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the user is ADMIN or PM of the project
      const membership = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: ctx.session!.user.id,
          },
        },
      });

      if (!membership || !["ADMIN", "PM"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API 키를 생성할 권한이 없습니다",
        });
      }

      const rawKey = generateApiKey();
      const hash = hashApiKey(rawKey);
      const prefix = keyPrefix(rawKey);

      const apiKey = await ctx.prisma.apiKey.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        },
      });

      return {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // returned once
        keyPrefix: prefix,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      };
    }),

  /**
   * List all API keys for a project (prefix only, no raw keys).
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const keys = await ctx.prisma.apiKey.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          active: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return keys;
    }),

  /**
   * Revoke an API key (soft-delete: set active = false).
   */
  revoke: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ctx.prisma.apiKey.findUnique({
        where: { id: input.keyId },
        include: { project: { select: { id: true } } },
      });

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API 키를 찾을 수 없습니다",
        });
      }

      // Verify permission
      const membership = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: apiKey.project.id,
            userId: ctx.session!.user.id,
          },
        },
      });

      if (!membership || !["ADMIN", "PM"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API 키를 폐기할 권한이 없습니다",
        });
      }

      const updated = await ctx.prisma.apiKey.update({
        where: { id: input.keyId },
        data: { active: false },
      });

      return { id: updated.id, active: updated.active };
    }),

  /**
   * Permanently delete an API key.
   */
  delete: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = await ctx.prisma.apiKey.findUnique({
        where: { id: input.keyId },
        include: { project: { select: { id: true } } },
      });

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API 키를 찾을 수 없습니다",
        });
      }

      // Verify permission
      const membership = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: apiKey.project.id,
            userId: ctx.session!.user.id,
          },
        },
      });

      if (!membership || !["ADMIN", "PM"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "API 키를 삭제할 권한이 없습니다",
        });
      }

      await ctx.prisma.apiKey.delete({ where: { id: input.keyId } });

      return { success: true };
    }),
});
