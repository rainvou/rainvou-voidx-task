import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./init";

// ---------------------------------------------------------------------------
// Shared Zod schemas (exported for unit testing)
// ---------------------------------------------------------------------------

export const taskTitleSchema = z.string().min(1, "제목은 필수입니다").max(500, "제목은 500자 이하여야 합니다");

export const taskTypeSchema = z.enum(["EPIC", "STORY", "SUBTASK"]);

export const prioritySchema = z.enum(["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]);

export const dependencyTypeSchema = z.enum(["BLOCKS", "RELATES_TO"]);

export const taskFilterSchema = z.object({
  projectId: z.string(),
  statusId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: prioritySchema.optional(),
  type: taskTypeSchema.optional(),
  parentId: z.string().nullable().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "priority", "sortOrder", "deadline"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ---------------------------------------------------------------------------
// Task router
// ---------------------------------------------------------------------------

export const taskRouter = router({
  /**
   * Create a new task. Auto-generates taskKey using project key + counter.
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: taskTitleSchema,
        description: z.string().max(10000).optional(),
        type: taskTypeSchema.default("STORY"),
        priority: prioritySchema.default("MEDIUM"),
        statusId: z.string(),
        assigneeId: z.string().optional(),
        parentId: z.string().optional(),
        deadline: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Use a transaction to atomically increment taskCounter and create the task
      const task = await ctx.prisma.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: { id: input.projectId },
          data: { taskCounter: { increment: 1 } },
          select: { key: true, taskCounter: true },
        });

        const taskKey = `${project.key}-${project.taskCounter}`;

        // Validate parentId belongs to the same project if provided
        if (input.parentId) {
          const parentTask = await tx.task.findFirst({
            where: { id: input.parentId, projectId: input.projectId },
          });
          if (!parentTask) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "부모 태스크를 찾을 수 없거나 같은 프로젝트에 속하지 않습니다",
            });
          }
        }

        const created = await tx.task.create({
          data: {
            taskKey,
            projectId: input.projectId,
            title: input.title,
            description: input.description,
            type: input.type,
            priority: input.priority,
            statusId: input.statusId,
            assigneeId: input.assigneeId,
            parentId: input.parentId,
            deadline: input.deadline ? new Date(input.deadline) : undefined,
          },
          include: {
            status: true,
            assignee: { select: { id: true, name: true, email: true, image: true } },
            parent: { select: { id: true, taskKey: true, title: true } },
          },
        });

        // Create a CREATED event
        await tx.taskEvent.create({
          data: {
            taskId: created.id,
            type: "CREATED",
            data: { title: input.title, type: input.type },
          },
        });

        return created;
      });

      return task;
    }),

  /**
   * List tasks for a project with filters, pagination, and sorting.
   */
  list: protectedProcedure
    .input(taskFilterSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, statusId, assigneeId, priority, type, parentId, page, limit, sortBy, sortOrder } = input;

      const where: Record<string, unknown> = { projectId };
      if (statusId) where.statusId = statusId;
      if (assigneeId) where.assigneeId = assigneeId;
      if (priority) where.priority = priority;
      if (type) where.type = type;
      if (parentId !== undefined) where.parentId = parentId;

      const [tasks, total] = await Promise.all([
        ctx.prisma.task.findMany({
          where,
          include: {
            status: true,
            assignee: { select: { id: true, name: true, email: true, image: true } },
            _count: { select: { children: true, comments: true, checklists: true } },
            labels: { include: { label: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.prisma.task.count({ where }),
      ]);

      return {
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get a single task by its taskKey with all relations.
   */
  getByKey: protectedProcedure
    .input(z.object({ taskKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { taskKey: input.taskKey },
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true, image: true } },
          parent: { select: { id: true, taskKey: true, title: true, type: true } },
          children: {
            include: {
              status: true,
              assignee: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
          labels: { include: { label: true } },
          comments: {
            include: {
              author: { select: { id: true, name: true, email: true, image: true } },
              reactions: true,
            },
            orderBy: { createdAt: "asc" },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          checklists: {
            orderBy: { sortOrder: "asc" },
          },
          blockedBy: {
            include: {
              blockingTask: { select: { id: true, taskKey: true, title: true } },
            },
          },
          blocks: {
            include: {
              blockedTask: { select: { id: true, taskKey: true, title: true } },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `태스크 '${input.taskKey}'를 찾을 수 없습니다`,
        });
      }

      return task;
    }),

  /**
   * Update task fields. Creates a TaskEvent on status change.
   */
  update: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        title: taskTitleSchema.optional(),
        description: z.string().max(10000).optional(),
        priority: prioritySchema.optional(),
        statusId: z.string().optional(),
        assigneeId: z.string().nullable().optional(),
        deadline: z.string().datetime().nullable().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, ...data } = input;

      const existing = await ctx.prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, statusId: true, priority: true, assigneeId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "태스크를 찾을 수 없습니다",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.statusId !== undefined) updateData.statusId = data.statusId;
      if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
      if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      const task = await ctx.prisma.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          status: true,
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      // Create events for significant changes
      const events: Array<{ taskId: string; type: string; data: Record<string, unknown> }> = [];

      if (data.statusId && data.statusId !== existing.statusId) {
        events.push({
          taskId,
          type: "STATUS_CHANGED",
          data: { from: existing.statusId, to: data.statusId },
        });
      }

      if (data.priority && data.priority !== existing.priority) {
        events.push({
          taskId,
          type: "PRIORITY_CHANGED",
          data: { from: existing.priority, to: data.priority },
        });
      }

      if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
        events.push({
          taskId,
          type: "ASSIGNED",
          data: { from: existing.assigneeId, to: data.assigneeId },
        });
      }

      if (data.description !== undefined) {
        events.push({
          taskId,
          type: "DESCRIPTION_UPDATED",
          data: {},
        });
      }

      if (events.length > 0) {
        await ctx.prisma.taskEvent.createMany({
          data: events.map((e) => ({
            taskId: e.taskId,
            type: e.type as never,
            data: e.data,
          })),
        });
      }

      return task;
    }),

  /**
   * Delete a task.
   */
  delete: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "태스크를 찾을 수 없습니다",
        });
      }

      await ctx.prisma.task.delete({ where: { id: input.taskId } });

      return { success: true };
    }),

  /**
   * Bulk update multiple tasks at once (status, assignee, add label).
   */
  bulkUpdate: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()).min(1).max(50),
        statusId: z.string().optional(),
        assigneeId: z.string().nullable().optional(),
        addLabelId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskIds, statusId, assigneeId, addLabelId } = input;

      await ctx.prisma.$transaction(async (tx) => {
        // Bulk update status and/or assignee
        const updateData: Record<string, unknown> = {};
        if (statusId !== undefined) updateData.statusId = statusId;
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId;

        if (Object.keys(updateData).length > 0) {
          await tx.task.updateMany({
            where: { id: { in: taskIds } },
            data: updateData,
          });
        }

        // Add label to all tasks
        if (addLabelId) {
          const existingLabels = await tx.taskLabel.findMany({
            where: {
              taskId: { in: taskIds },
              labelId: addLabelId,
            },
          });

          const existingTaskIds = new Set(existingLabels.map((l) => l.taskId));
          const newLabelData = taskIds
            .filter((id) => !existingTaskIds.has(id))
            .map((taskId) => ({ taskId, labelId: addLabelId }));

          if (newLabelData.length > 0) {
            await tx.taskLabel.createMany({ data: newLabelData });
          }
        }

        // Create events for status changes
        if (statusId) {
          await tx.taskEvent.createMany({
            data: taskIds.map((taskId) => ({
              taskId,
              type: "STATUS_CHANGED" as const,
              data: { to: statusId, bulk: true },
            })),
          });
        }
      });

      return { success: true, count: taskIds.length };
    }),

  /**
   * Add a dependency between tasks.
   */
  addDependency: protectedProcedure
    .input(
      z.object({
        blockedTaskId: z.string(),
        blockingTaskId: z.string(),
        type: dependencyTypeSchema.default("BLOCKS"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.blockedTaskId === input.blockingTaskId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "태스크는 자기 자신에 대한 의존성을 가질 수 없습니다",
        });
      }

      // Verify both tasks exist
      const [blockedTask, blockingTask] = await Promise.all([
        ctx.prisma.task.findUnique({ where: { id: input.blockedTaskId } }),
        ctx.prisma.task.findUnique({ where: { id: input.blockingTaskId } }),
      ]);

      if (!blockedTask || !blockingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "태스크를 찾을 수 없습니다",
        });
      }

      const existing = await ctx.prisma.taskDependency.findUnique({
        where: {
          blockedTaskId_blockingTaskId: {
            blockedTaskId: input.blockedTaskId,
            blockingTaskId: input.blockingTaskId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 존재하는 의존성입니다",
        });
      }

      const dependency = await ctx.prisma.taskDependency.create({
        data: {
          blockedTaskId: input.blockedTaskId,
          blockingTaskId: input.blockingTaskId,
          type: input.type,
        },
        include: {
          blockedTask: { select: { id: true, taskKey: true, title: true } },
          blockingTask: { select: { id: true, taskKey: true, title: true } },
        },
      });

      return dependency;
    }),

  /**
   * Remove a task dependency.
   */
  removeDependency: protectedProcedure
    .input(z.object({ dependencyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.taskDependency.findUnique({
        where: { id: input.dependencyId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "의존성을 찾을 수 없습니다",
        });
      }

      await ctx.prisma.taskDependency.delete({ where: { id: input.dependencyId } });

      return { success: true };
    }),

  /**
   * Add a checklist item to a task.
   */
  addChecklistItem: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        title: z.string().min(1).max(500),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "태스크를 찾을 수 없습니다",
        });
      }

      // Auto-assign sortOrder if not provided
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const maxOrder = await ctx.prisma.checklistItem.aggregate({
          where: { taskId: input.taskId },
          _max: { sortOrder: true },
        });
        sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
      }

      const item = await ctx.prisma.checklistItem.create({
        data: {
          taskId: input.taskId,
          title: input.title,
          sortOrder,
        },
      });

      return item;
    }),

  /**
   * Toggle a checklist item's completed state.
   */
  toggleChecklistItem: protectedProcedure
    .input(z.object({ checklistItemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.checklistItem.findUnique({
        where: { id: input.checklistItemId },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "체크리스트 항목을 찾을 수 없습니다",
        });
      }

      const updated = await ctx.prisma.checklistItem.update({
        where: { id: input.checklistItemId },
        data: { completed: !item.completed },
      });

      return updated;
    }),
});
