"use client";

import { type DragEvent, useCallback } from "react";
import {
  type KanbanTask,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  getInitials,
} from "@/types/kanban";

interface KanbanCardProps {
  task: KanbanTask;
}

export function KanbanCard({ task }: KanbanCardProps) {
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("application/kanban-task-id", task.id);
      e.dataTransfer.setData("application/kanban-source-status", task.statusId);
      e.dataTransfer.effectAllowed = "move";
    },
    [task.id, task.statusId]
  );

  const priorityColor = PRIORITY_COLORS[task.priority];
  const priorityLabel = PRIORITY_LABELS[task.priority];
  const initials = task.assignee
    ? getInitials(task.assignee.name, task.assignee.email)
    : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      data-testid={`kanban-card-${task.taskKey}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-gray-500">{task.taskKey}</span>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${priorityColor}`}
        >
          {priorityLabel}
        </span>
      </div>

      <p className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">
        {task.title}
      </p>

      {initials && (
        <div className="mt-2 flex justify-end">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700"
            title={task.assignee?.name ?? task.assignee?.email ?? ""}
          >
            {initials}
          </div>
        </div>
      )}
    </div>
  );
}
