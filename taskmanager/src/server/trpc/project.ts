import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./init";

/**
 * Project key: 2-10 uppercase letters and digits, must start with a letter.
 */
export const projectKeySchema = z
  .string()
  .min(2)
  .max(10)
  .regex(
    /^[A-Z][A-Z0-9]{1,9}$/,
    "프로젝트 키는 대문자로 시작하고, 대문자와 숫자만 포함하며, 2~10자여야 합니다",
  );

export const projectRouter = router({
  /**
   * Create a new project. The creator becomes an ADMIN member.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        key: projectKeySchema,
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const existing = await ctx.prisma.project.findUnique({
        where: { key: input.key },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `프로젝트 키 '${input.key}'는 이미 사용 중입니다`,
        });
      }

      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          key: input.key,
          description: input.description,
          members: {
            create: {
              userId,
              role: "ADMIN",
            },
          },
        },
        include: { members: true },
      });

      return project;
    }),

  /**
   * List projects the current user is a member of.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const projects = await ctx.prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return projects;
  }),

  /**
   * Get a project by its unique key, including members.
   */
  getByKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const project = await ctx.prisma.project.findUnique({
        where: { key: input.key },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "프로젝트를 찾을 수 없습니다" });
      }

      const isMember = project.members.some((m) => m.userId === userId);
      if (!isMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "프로젝트에 접근 권한이 없습니다" });
      }

      return project;
    }),

  /**
   * Update project name and/or description. ADMIN only.
   */
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectRole(ctx, input.projectId, ["ADMIN"]);

      const project = await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      return project;
    }),

  /**
   * Delete a project. ADMIN only.
   */
  delete: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectRole(ctx, input.projectId, ["ADMIN"]);

      await ctx.prisma.project.delete({ where: { id: input.projectId } });

      return { success: true };
    }),

  /**
   * Invite a member by email with a given role. ADMIN or PM only.
   */
  inviteMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        email: z.string().email(),
        role: z.enum(["ADMIN", "PM", "DEV", "VIEWER"]).default("DEV"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectRole(ctx, input.projectId, ["ADMIN", "PM"]);

      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `이메일 '${input.email}'에 해당하는 사용자를 찾을 수 없습니다`,
        });
      }

      const existingMember = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: user.id,
          },
        },
      });
      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 프로젝트 멤버입니다",
        });
      }

      const member = await ctx.prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: user.id,
          role: input.role,
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return member;
    }),

  /**
   * Update a member's role. ADMIN only.
   */
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        memberId: z.string(),
        role: z.enum(["ADMIN", "PM", "DEV", "VIEWER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectRole(ctx, input.projectId, ["ADMIN"]);

      const member = await ctx.prisma.projectMember.findFirst({
        where: { id: input.memberId, projectId: input.projectId },
      });
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" });
      }

      const updated = await ctx.prisma.projectMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      return updated;
    }),

  /**
   * Remove a member from a project. ADMIN only.
   */
  removeMember: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        memberId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentMember = await assertProjectRole(ctx, input.projectId, ["ADMIN"]);

      const member = await ctx.prisma.projectMember.findFirst({
        where: { id: input.memberId, projectId: input.projectId },
      });
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "멤버를 찾을 수 없습니다" });
      }

      if (member.id === currentMember.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "자기 자신은 제거할 수 없습니다",
        });
      }

      await ctx.prisma.projectMember.delete({ where: { id: input.memberId } });

      return { success: true };
    }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ProjectRoleValue = "ADMIN" | "PM" | "DEV" | "VIEWER";

interface ContextWithSession {
  prisma: {
    projectMember: {
      findFirst: (...args: unknown[]) => Promise<{ id: string; role: string } | null>;
    };
  };
  session: { user: { id: string } };
}

async function assertProjectRole(
  ctx: ContextWithSession,
  projectId: string,
  allowedRoles: ProjectRoleValue[],
) {
  const member = await ctx.prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: ctx.session.user.id,
    },
  });

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "프로젝트에 접근 권한이 없습니다" });
  }

  if (!allowedRoles.includes(member.role as ProjectRoleValue)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `이 작업에는 ${allowedRoles.join(" 또는 ")} 권한이 필요합니다`,
    });
  }

  return member;
}
