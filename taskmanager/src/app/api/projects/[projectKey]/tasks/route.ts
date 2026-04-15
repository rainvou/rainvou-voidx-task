import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  try {
    const { projectKey } = await params;
    const body = await req.json();
    const { title, description, type, priority, statusId, assigneeId } = body;

    if (!title) {
      return NextResponse.json(
        { error: { message: "제목은 필수입니다" } },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { key: projectKey } });
    if (!project) {
      return NextResponse.json(
        { error: { message: "프로젝트를 찾을 수 없습니다" } },
        { status: 404 }
      );
    }

    // Generate task key atomically
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true, key: true },
    });
    const taskKey = `${updated.key}-${updated.taskCounter}`;

    // If no statusId provided, use the start status
    let resolvedStatusId = statusId;
    if (!resolvedStatusId) {
      const startStatus = await prisma.workflowStatus.findFirst({
        where: { projectId: project.id, isStart: true },
      });
      if (!startStatus) {
        return NextResponse.json(
          { error: { message: "워크플로우 시작 상태가 없습니다" } },
          { status: 400 }
        );
      }
      resolvedStatusId = startStatus.id;
    }

    const task = await prisma.task.create({
      data: {
        taskKey,
        projectId: project.id,
        title,
        description: description || null,
        type: type || "STORY",
        priority: priority || "MEDIUM",
        statusId: resolvedStatusId,
        assigneeId: assigneeId || null,
      },
      include: {
        status: true,
        assignee: { select: { id: true, name: true, email: true } },
        labels: { include: { label: true } },
      },
    });

    return NextResponse.json({ data: task });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: { message: "태스크 생성 중 오류가 발생했습니다" } },
      { status: 500 }
    );
  }
}
