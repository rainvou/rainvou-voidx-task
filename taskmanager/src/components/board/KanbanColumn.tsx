"use client";

import { type DragEvent, useCallback, useState } from "react";
import { KanbanCard } from "./KanbanCard";
import { type KanbanTask, type WorkflowColumn, isColumnAtCapacity } from "@/types/kanban";

interface KanbanColumnProps {
  column: WorkflowColumn;
  tasks: KanbanTask[];
  onDrop: (taskId: string, sourceStatusId: string, targetStatusId: string) => void;
}

export function KanbanColumn({ column, tasks, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const atCapacity = isColumnAtCapacity(tasks.length, column.wipLimit);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const taskId = e.dataTransfer.getData("application/kanban-task-id");
      const sourceStatusId = e.dataTransfer.getData("application/kanban-source-status");

      if (!taskId || sourceStatusId === column.id) return;

      onDrop(taskId, sourceStatusId, column.id);
    },
    [column.id, onDrop]
  );

  const borderColor = isDragOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200";
  const warningStyle = atCapacity ? "ring-2 ring-amber-400 bg-amber-50/30" : "";

  return (
    <div
      className={`flex w-72 shrink-0 flex-col rounded-lg border ${borderColor} ${warningStyle} transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold text-gray-700">{column.name}</h3>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {tasks.length}
          </span>
        </div>
        {column.wipLimit !== undefined && column.wipLimit > 0 && (
          <span
            className={`text-xs font-medium ${
              atCapacity ? "text-amber-600 font-bold" : "text-gray-400"
            }`}
          >
            WIP: {tasks.length}/{column.wipLimit}
          </span>
        )}
      </div>

      {/* Cards area */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2 min-h-[120px]">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-gray-400">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Capacity warning */}
      {atCapacity && (
        <div className="border-t border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          WIP limit reached
        </div>
      )}
    </div>
  );
}
