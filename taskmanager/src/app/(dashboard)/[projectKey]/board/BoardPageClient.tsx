"use client";

import { useCallback, useState } from "react";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import type { KanbanTask, WorkflowColumn } from "@/types/kanban";

/**
 * Client-side wrapper for the board page.
 * In production this would fetch real data via tRPC; for now it provides
 * the interactive shell that receives tasks/columns and handles task moves.
 */
interface BoardPageClientProps {
  projectKey: string;
}

export function BoardPageClient({ projectKey }: BoardPageClientProps) {
  // Placeholder: these would normally come from a tRPC query
  const [columns] = useState<WorkflowColumn[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);

  const handleTaskMove = useCallback(
    (taskId: string, targetStatusId: string) => {
      // Optimistic update: move task to new column locally
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, statusId: targetStatusId } : t
        )
      );

      // TODO: call tRPC mutation to persist the status change
      // trpc.task.updateStatus.mutate({ taskId, statusId: targetStatusId });
    },
    []
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">
        {projectKey} &mdash; Board
      </h1>
      {columns.length === 0 ? (
        <p className="text-sm text-gray-500">
          No workflow columns configured for this project. Set up a workflow first.
        </p>
      ) : (
        <KanbanBoard
          columns={columns}
          tasks={tasks}
          onTaskMove={handleTaskMove}
        />
      )}
    </div>
  );
}
