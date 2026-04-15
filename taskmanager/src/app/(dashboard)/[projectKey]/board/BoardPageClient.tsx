"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { KanbanTask, WorkflowColumn, Priority } from "@/types/kanban";
import { PRIORITY_COLORS, PRIORITY_LABELS, getInitials, isColumnAtCapacity, groupTasksByStatus } from "@/types/kanban";

interface BoardPageClientProps {
  projectKey: string;
  projectId: string;
  initialColumns: WorkflowColumn[];
  initialTasks: KanbanTask[];
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  EPIC: { icon: "⚡", color: "#6554c0" },
  STORY: { icon: "📘", color: "#36b37e" },
  SUBTASK: { icon: "📋", color: "#0065ff" },
};

const PRIORITIES: { value: Priority; label: string; icon: string }[] = [
  { value: "URGENT", label: "긴급", icon: "🔴" },
  { value: "HIGH", label: "높음", icon: "🟠" },
  { value: "MEDIUM", label: "보통", icon: "🔵" },
  { value: "LOW", label: "낮음", icon: "⚪" },
];

export function BoardPageClient({ projectKey, projectId, initialColumns, initialTasks }: BoardPageClientProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInColumn, setCreateInColumn] = useState<string | null>(null);
  const [inlineAddColumn, setInlineAddColumn] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const inlineRef = useRef<HTMLTextAreaElement>(null);

  const tasksByStatus = groupTasksByStatus(tasks);

  useEffect(() => {
    if (inlineAddColumn && inlineRef.current) {
      inlineRef.current.focus();
    }
  }, [inlineAddColumn]);

  const handleTaskMove = useCallback(
    async (taskId: string, targetStatusId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, statusId: targetStatusId } : t))
      );
      try {
        await fetch(`/api/projects/${projectKey}/tasks/${taskId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId: targetStatusId }),
        });
      } catch { /* revert on failure */ }
    },
    [projectKey]
  );

  const createTask = useCallback(
    async (data: { title: string; type?: string; priority?: string; statusId?: string }) => {
      try {
        const res = await fetch(`/api/projects/${projectKey}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("생성 실패");
        const { data: task } = await res.json();
        setTasks((prev) => [...prev, {
          id: task.id,
          taskKey: task.taskKey,
          title: task.title,
          priority: task.priority as Priority,
          statusId: task.statusId,
          type: task.type,
          assignee: task.assignee,
          labels: [],
        }]);
        return true;
      } catch {
        return false;
      }
    },
    [projectKey]
  );

  const handleInlineAdd = async () => {
    if (!inlineTitle.trim() || !inlineAddColumn) return;
    const ok = await createTask({ title: inlineTitle.trim(), statusId: inlineAddColumn });
    if (ok) {
      setInlineTitle("");
      // Keep input open for rapid entry
    }
  };

  return (
    <>
      <div className="flex gap-3" style={{ minWidth: initialColumns.length * 290 }}>
        {initialColumns.map((column) => {
          const columnTasks = tasksByStatus[column.id] ?? [];
          const isOver = dragOverColumn === column.id;
          const atCapacity = isColumnAtCapacity(columnTasks.length, column.wipLimit);

          return (
            <div
              key={column.id}
              className={`flex w-[272px] shrink-0 flex-col rounded-[3px] transition-colors ${
                isOver ? "bg-[#e2e4ea]" : "bg-[#ebecf0]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(column.id); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumn(null);
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId && !atCapacity) handleTaskMove(taskId, column.id);
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="text-xs font-bold uppercase tracking-wide text-[#5e6c84]">{column.name}</span>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#dfe1e6] px-1.5 text-xs font-bold text-[#5e6c84]">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {column.wipLimit && column.wipLimit > 0 && (
                    <span className={`text-[10px] font-medium ${atCapacity ? "text-red-500" : "text-[#97a0af]"}`}>
                      MAX {column.wipLimit}
                    </span>
                  )}
                  <button
                    onClick={() => { setCreateInColumn(column.id); setShowCreateModal(true); }}
                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#dfe1e6] text-[#6b778c] hover:text-[#172b4d] transition"
                    title="태스크 생성"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-1.5 pb-1.5" style={{ maxHeight: "calc(100vh - 240px)" }}>
                {columnTasks.map((task) => {
                  const typeInfo = TYPE_ICONS[task.type || "STORY"];
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); setDraggedTask(task.id); }}
                      onDragEnd={() => setDraggedTask(null)}
                      className={`group cursor-grab rounded-[3px] border border-[#091e4214] bg-white p-2 shadow-sm transition hover:bg-[#f4f5f7] active:cursor-grabbing ${
                        draggedTask === task.id ? "opacity-50" : ""
                      }`}
                    >
                      {task.labels && task.labels.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {task.labels.map((label) => (
                            <span key={label.name} className="inline-block h-2 w-10 rounded-full" style={{ backgroundColor: label.color }} title={label.name} />
                          ))}
                        </div>
                      )}
                      <p className="mb-2 text-sm leading-5 text-[#172b4d]">{task.title}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span title={task.type || "STORY"} className="text-xs">{typeInfo?.icon || "📘"}</span>
                          <span className="text-xs font-medium text-[#5e6c84]">{task.taskKey}</span>
                          {task.priority !== "NONE" && (
                            <span className={`inline-flex h-4 items-center rounded px-1 text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`} title={PRIORITY_LABELS[task.priority]}>
                              {task.priority === "URGENT" ? "🔴" : task.priority === "HIGH" ? "🟠" : task.priority === "MEDIUM" ? "🔵" : "⚪"}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <div title={task.assignee.name || task.assignee.email} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0052cc] text-[10px] font-bold text-white">
                            {getInitials(task.assignee.name, task.assignee.email)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Inline quick add */}
                {inlineAddColumn === column.id ? (
                  <div className="rounded-[3px] border border-[#091e4214] bg-white p-2 shadow-sm">
                    <textarea
                      ref={inlineRef}
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInlineAdd(); }
                        if (e.key === "Escape") { setInlineAddColumn(null); setInlineTitle(""); }
                      }}
                      placeholder="태스크 제목을 입력하세요..."
                      className="w-full resize-none rounded border-none text-sm text-[#172b4d] outline-none placeholder:text-[#97a0af]"
                      rows={2}
                    />
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        onClick={handleInlineAdd}
                        disabled={!inlineTitle.trim()}
                        className="rounded bg-[#0052cc] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#0047b3] disabled:opacity-40"
                      >
                        생성
                      </button>
                      <button
                        onClick={() => { setInlineAddColumn(null); setInlineTitle(""); }}
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#ebecf0] text-[#6b778c]"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setInlineAddColumn(column.id)}
                    className="flex w-full items-center gap-1 rounded-[3px] px-2 py-1.5 text-sm text-[#5e6c84] transition hover:bg-[#dfe1e6] hover:text-[#172b4d]"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                    </svg>
                    태스크 생성
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          columns={initialColumns}
          defaultStatusId={createInColumn}
          onClose={() => { setShowCreateModal(false); setCreateInColumn(null); }}
          onCreate={createTask}
        />
      )}
    </>
  );
}

function CreateTaskModal({
  columns,
  defaultStatusId,
  onClose,
  onCreate,
}: {
  columns: WorkflowColumn[];
  defaultStatusId: string | null;
  onClose: () => void;
  onCreate: (data: { title: string; type?: string; priority?: string; statusId?: string }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("STORY");
  const [priority, setPriority] = useState("MEDIUM");
  const [statusId, setStatusId] = useState(defaultStatusId || columns[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const ok = await onCreate({ title: title.trim(), type, priority, statusId });
    setLoading(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg rounded-[3px] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dfe1e6] px-5 py-4">
          <h2 className="text-lg font-semibold text-[#172b4d]">태스크 생성</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded hover:bg-[#ebecf0] text-[#6b778c]">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5e6c84]">제목 *</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="태스크 제목을 입력하세요"
              className="w-full rounded-[3px] border border-[#dfe1e6] px-3 py-2 text-sm text-[#172b4d] outline-none transition focus:border-[#4c9aff] focus:ring-2 focus:ring-[#4c9aff]/20"
            />
          </div>

          {/* Type + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-[#5e6c84]">유형</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-[3px] border border-[#dfe1e6] px-3 py-2 text-sm text-[#172b4d] outline-none focus:border-[#4c9aff]"
              >
                <option value="EPIC">⚡ Epic</option>
                <option value="STORY">📘 Story</option>
                <option value="SUBTASK">📋 Subtask</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-[#5e6c84]">우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-[3px] border border-[#dfe1e6] px-3 py-2 text-sm text-[#172b4d] outline-none focus:border-[#4c9aff]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5e6c84]">상태</label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="w-full rounded-[3px] border border-[#dfe1e6] px-3 py-2 text-sm text-[#172b4d] outline-none focus:border-[#4c9aff]"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[3px] px-4 py-2 text-sm font-medium text-[#42526e] transition hover:bg-[#ebecf0]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="rounded-[3px] bg-[#0052cc] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0047b3] disabled:opacity-50"
            >
              {loading ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
