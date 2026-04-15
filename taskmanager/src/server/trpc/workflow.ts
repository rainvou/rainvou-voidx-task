import { z } from "zod";
import { router, publicProcedure } from "./init";
import { TRPCError } from "@trpc/server";
import { statusNameSchema, DEFAULT_WORKFLOW_STATUSES } from "./workflow.constants";

export { DEFAULT_WORKFLOW_STATUSES } from "./workflow.constants";

export const workflowRouter = router({
  list: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workflowStatus.findMany({
        where: { projectId: input.projectId },
        orderBy: { displayOrder: "asc" },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: statusNameSchema,
        color: z.string().default("#6B7280"),
        isStart: z.boolean().default(false),
        isDone: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.isStart) {
        const existingStart = await ctx.prisma.workflowStatus.findFirst({
          where: { projectId: input.projectId, isStart: true },
        });
        if (existingStart) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A project can have at most 1 start status",
          });
        }
      }

      if (input.isDone) {
        const existingDone = await ctx.prisma.workflowStatus.findFirst({
          where: { projectId: input.projectId, isDone: true },
        });
        if (existingDone) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A project can have at most 1 done status",
          });
        }
      }

      const maxOrder = await ctx.prisma.workflowStatus.aggregate({
        where: { projectId: input.projectId },
        _max: { displayOrder: true },
      });

      return ctx.prisma.workflowStatus.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          color: input.color,
          isStart: input.isStart,
          isDone: input.isDone,
          displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: statusNameSchema.optional(),
        color: z.string().optional(),
        isStart: z.boolean().optional(),
        isDone: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.workflowStatus.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow status not found",
        });
      }

      if (input.isStart === true) {
        const existingStart = await ctx.prisma.workflowStatus.findFirst({
          where: { projectId: existing.projectId, isStart: true, id: { not: input.id } },
        });
        if (existingStart) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A project can have at most 1 start status",
          });
        }
      }

      if (input.isDone === true) {
        const existingDone = await ctx.prisma.workflowStatus.findFirst({
          where: { projectId: existing.projectId, isDone: true, id: { not: input.id } },
        });
        if (existingDone) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A project can have at most 1 done status",
          });
        }
      }

      const { id, ...data } = input;
      return ctx.prisma.workflowStatus.update({
        where: { id },
        data,
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const taskCount = await ctx.prisma.task.count({
        where: { statusId: input.id },
      });

      if (taskCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete status: ${taskCount} task(s) are still using it`,
        });
      }

      return ctx.prisma.workflowStatus.delete({
        where: { id: input.id },
      });
    }),

  reorder: publicProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            displayOrder: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.items.map((item) =>
          ctx.prisma.workflowStatus.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder },
          })
        )
      );
    }),

  createDefaults: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(
        DEFAULT_WORKFLOW_STATUSES.map((status) =>
          ctx.prisma.workflowStatus.create({
            data: {
              projectId: input.projectId,
              ...status,
            },
          })
        )
      );
    }),
});
