"use client";

import { useCallback, useMemo, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import {
  type KanbanTask,
  type WorkflowColumn,
  groupTasksByStatus,
  groupTasksByAssignee,
  isColumnAtCapacity,
  getInitials,
} from "@/types/kanban";

interface KanbanBoardProps {
  columns: WorkflowColumn[];
  tasks: KanbanTask[];
  onTaskMove: (taskId: string, targetStatusId: string) => void;
}

export function KanbanBoard({ columns, tasks, onTaskMove }: KanbanBoardProps) {
  const [swimlaneEnabled, setSwimlaneEnabled] = useState(false);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.displayOrder - b.displayOrder),
    [columns]
  );

  const tasksByStatus = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  const handleDrop = useCallback(
    (taskId: string, _sourceStatusId: string, targetStatusId: string) => {
      const targetColumn = columns.find((c) => c.id === targetStatusId);
      if (!targetColumn) return;

      const currentTasks = tasksByStatus[targetStatusId] ?? [];
      if (isColumnAtCapacity(currentTasks.length, targetColumn.wipLimit)) {
        alert(
          `WIP limit reached for "${targetColumn.name}". Current: ${currentTasks.length}/${targetColumn.wipLimit}. Move a task out first.`
        );
        return;
      }

      onTaskMove(taskId, targetStatusId);
    },
    [columns, tasksByStatus, onTaskMove]
  );

  // Swimlane view: group tasks by assignee, then render a row per assignee
  if (swimlaneEnabled) {
    const assigneeGroups = groupTasksByAssignee(tasks);

    // Build sorted assignee keys: named users first, unassigned last
    const assigneeKeys = Object.keys(assigneeGroups).sort((a, b) => {
      if (a === "unassigned") return 1;
      if (b === "unassigned") return -1;
      return a.localeCompare(b);
    });

    // Resolve assignee display names
    const assigneeNames: Record<string, string> = {};
    for (const task of tasks) {
      if (task.assignee) {
        assigneeNames[task.assignee.id] =
          task.assignee.name ?? task.assignee.email;
      }
    }

    return (
      <div className="flex flex-col gap-4" data-testid="kanban-board">
        <BoardToolbar
          swimlaneEnabled={swimlaneEnabled}
          onToggleSwimlane={() => setSwimlaneEnabled((v) => !v)}
        />

        {assigneeKeys.map((assigneeId) => {
          const assigneeTasks = assigneeGroups[assigneeId];
          const assigneeName =
            assigneeId === "unassigned"
              ? "Unassigned"
              : assigneeNames[assigneeId] ?? assigneeId;
          const initials =
            assigneeId === "unassigned"
              ? "??"
              : getInitials(
                  assigneeNames[assigneeId] ?? null,
                  undefined
                );

          // Group this assignee's tasks by status
          const assigneeTasksByStatus = groupTasksByStatus(assigneeTasks);

          return (
            <div key={assigneeId} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {initials}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {assigneeName}
                </span>
                <span className="text-xs text-gray-400">
                  ({assigneeTasks.length} task{assigneeTasks.length !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {sortedColumns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={assigneeTasksByStatus[column.id] ?? []}
                    onDrop={handleDrop}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="kanban-board">
      <BoardToolbar
        swimlaneEnabled={swimlaneEnabled}
        onToggleSwimlane={() => setSwimlaneEnabled((v) => !v)}
      />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] ?? []}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}

function BoardToolbar({
  swimlaneEnabled,
  onToggleSwimlane,
}: {
  swimlaneEnabled: boolean;
  onToggleSwimlane: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-bold text-gray-900">Board</h2>
      <button
        type="button"
        onClick={onToggleSwimlane}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          swimlaneEnabled
            ? "bg-indigo-100 text-indigo-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {swimlaneEnabled ? "Swimlanes ON" : "Swimlanes OFF"}
      </button>
    </div>
  );
}
