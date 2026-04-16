export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface KanbanTask {
  id: string;
  taskKey: string;
  title: string;
  priority: Priority;
  statusId: string;
  type?: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  labels?: { name: string; color: string }[];
}

export interface WorkflowColumn {
  id: string;
  name: string;
  displayOrder: number;
  color: string;
  isStart: boolean;
  isDone: boolean;
  wipLimit?: number;
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-blue-500 text-white",
  LOW: "bg-gray-400 text-white",
  NONE: "bg-gray-200 text-gray-600",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  NONE: "None",
};

/**
 * Check if a column is at WIP capacity.
 * Returns true if the column has a WIP limit and the current task count meets or exceeds it.
 */
export function isColumnAtCapacity(
  taskCount: number,
  wipLimit?: number
): boolean {
  if (wipLimit === undefined || wipLimit <= 0) return false;
  return taskCount >= wipLimit;
}

/**
 * Group tasks by their statusId.
 */
export function groupTasksByStatus(
  tasks: KanbanTask[]
): Record<string, KanbanTask[]> {
  const grouped: Record<string, KanbanTask[]> = {};
  for (const task of tasks) {
    if (!grouped[task.statusId]) {
      grouped[task.statusId] = [];
    }
    grouped[task.statusId].push(task);
  }
  return grouped;
}

/**
 * Group tasks by assignee (for swimlane view).
 * Tasks with no assignee are grouped under "unassigned".
 */
export function groupTasksByAssignee(
  tasks: KanbanTask[]
): Record<string, KanbanTask[]> {
  const grouped: Record<string, KanbanTask[]> = {};
  for (const task of tasks) {
    const key = task.assignee?.id ?? "unassigned";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(task);
  }
  return grouped;
}

/**
 * Get initials from a name or email for avatar display.
 */
export function getInitials(name: string | null | undefined, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}
