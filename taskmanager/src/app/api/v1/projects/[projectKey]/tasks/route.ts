import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/server/middleware/apiKey";

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:projectKey/tasks
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const { projectKey } = await params;

  // Authenticate
  const authHeader = request.headers.get("authorization");
  const keyInfo = await validateApiKey(authHeader);

  if (!keyInfo) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "유효하지 않은 API 키입니다" } },
      { status: 401 },
    );
  }

  // Verify the key belongs to the requested project
  if (keyInfo.projectKey !== projectKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "이 프로젝트에 대한 접근 권한이 없습니다" } },
      { status: 403 },
    );
  }

  // Parse query params
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const status = url.searchParams.get("status") ?? undefined;
  const assignee = url.searchParams.get("assignee") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" as const : "desc" as const;

  // Build filter
  const where: Record<string, unknown> = { projectId: keyInfo.projectId };

  if (status) {
    // Allow filtering by status name
    const statusRecord = await prisma.workflowStatus.findFirst({
      where: { projectId: keyInfo.projectId, name: status },
    });
    if (statusRecord) {
      where.statusId = statusRecord.id;
    }
  }

  if (assignee) {
    where.assigneeId = assignee;
  }

  if (priority) {
    const validPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"];
    if (validPriorities.includes(priority.toUpperCase())) {
      where.priority = priority.toUpperCase();
    }
  }

  // Validate sortBy
  const validSortFields = ["createdAt", "updatedAt", "priority", "sortOrder", "deadline"];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        status: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
        labels: { include: { label: { select: { id: true, name: true, color: true } } } },
      },
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: tasks.map((t: Record<string, unknown> & { labels: Array<{ label: unknown }> }) => ({
      id: t.id,
      taskKey: t.taskKey,
      title: t.title,
      description: t.description,
      type: t.type,
      priority: t.priority,
      status: t.status,
      assignee: t.assignee,
      labels: t.labels.map((tl: { label: unknown }) => tl.label),
      deadline: t.deadline,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:projectKey/tasks
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const { projectKey } = await params;

  // Authenticate
  const authHeader = request.headers.get("authorization");
  const keyInfo = await validateApiKey(authHeader);

  if (!keyInfo) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "유효하지 않은 API 키입니다" } },
      { status: 401 },
    );
  }

  if (keyInfo.projectKey !== projectKey) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "이 프로젝트에 대한 접근 권한이 없습니다" } },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 JSON 본문입니다" } },
      { status: 400 },
    );
  }

  const title = body.title as string | undefined;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "제목(title)은 필수입니다" } },
      { status: 400 },
    );
  }

  // Find the default (start) status for the project
  let statusId = body.statusId as string | undefined;
  if (!statusId) {
    const defaultStatus = await prisma.workflowStatus.findFirst({
      where: { projectId: keyInfo.projectId, isStart: true },
    });
    if (!defaultStatus) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "프로젝트에 기본 워크플로우 상태가 없습니다" } },
        { status: 400 },
      );
    }
    statusId = defaultStatus.id;
  }

  // Atomically increment counter and create task
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const task = await prisma.$transaction(async (tx: any) => {
    const project = await tx.project.update({
      where: { id: keyInfo.projectId },
      data: { taskCounter: { increment: 1 } },
      select: { key: true, taskCounter: true },
    });

    const taskKey = `${project.key}-${project.taskCounter}`;

    const validTypes = ["EPIC", "STORY", "SUBTASK"];
    const validPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"];

    const type = validTypes.includes(body.type as string) ? (body.type as string) : "STORY";
    const priority = validPriorities.includes(body.priority as string)
      ? (body.priority as string)
      : "MEDIUM";

    const created = await tx.task.create({
      data: {
        taskKey,
        projectId: keyInfo.projectId,
        title: title.trim(),
        description: (body.description as string) ?? undefined,
        type: type as "EPIC" | "STORY" | "SUBTASK",
        priority: priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE",
        statusId: statusId!,
        assigneeId: (body.assigneeId as string) ?? undefined,
      },
      include: {
        status: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.taskEvent.create({
      data: {
        taskId: created.id,
        type: "CREATED",
        data: { title: created.title, type: created.type, viaApi: true },
      },
    });

    return created;
  });

  return NextResponse.json(
    {
      data: {
        id: task.id,
        taskKey: task.taskKey,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
    },
    { status: 201 },
  );
}
