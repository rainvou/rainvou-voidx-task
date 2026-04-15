import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BoardPageClient } from "./BoardPageClient";
import type { KanbanTask, WorkflowColumn } from "@/types/kanban";
import type { Priority } from "@/types/kanban";
import Link from "next/link";

interface BoardPageProps {
  params: Promise<{ projectKey: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { projectKey } = await params;

  const project = await prisma.project.findUnique({
    where: { key: projectKey },
    include: {
      workflows: { orderBy: { displayOrder: "asc" } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          status: true,
          labels: { include: { label: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!project) return notFound();

  const columns: WorkflowColumn[] = project.workflows.map((w) => ({
    id: w.id,
    name: w.name,
    displayOrder: w.displayOrder,
    color: w.color,
    isStart: w.isStart,
    isDone: w.isDone,
  }));

  const tasks: KanbanTask[] = project.tasks.map((t) => ({
    id: t.id,
    taskKey: t.taskKey,
    title: t.title,
    priority: t.priority as Priority,
    statusId: t.statusId,
    type: t.type,
    assignee: t.assignee
      ? { id: t.assignee.id, name: t.assignee.name, email: t.assignee.email }
      : null,
    labels: t.labels.map((tl) => ({ name: tl.label.name, color: tl.label.color })),
  }));

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Jira-style top nav */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#dfe1e6] bg-white px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-[#172b4d]">
            TaskManager
          </Link>
          <span className="text-[#6b778c]">/</span>
          <span className="font-semibold text-[#172b4d]">{project.name}</span>
          <span className="rounded bg-[#ebecf0] px-2 py-0.5 text-xs font-medium text-[#5e6c84]">
            {project.key}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {project.members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                title={m.user.name || m.user.email}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#0052cc] text-xs font-bold text-white"
              >
                {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Board toolbar */}
      <div className="border-b border-[#dfe1e6] bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-[#172b4d]">Board</h1>
          <span className="text-sm text-[#5e6c84]">
            {tasks.length}개 태스크
          </span>
        </div>
      </div>

      {/* Board content */}
      <main className="overflow-x-auto p-6">
        <BoardPageClient
          projectKey={projectKey}
          projectId={project.id}
          initialColumns={columns}
          initialTasks={tasks}
        />
      </main>
    </div>
  );
}
