import { z } from "zod";

export const statusNameSchema = z.string().min(1).max(50);

export const DEFAULT_WORKFLOW_STATUSES = [
  { name: "Todo", displayOrder: 0, isStart: true, isDone: false, color: "#6B7280" },
  { name: "InProgress", displayOrder: 1, isStart: false, isDone: false, color: "#3B82F6" },
  { name: "Review", displayOrder: 2, isStart: false, isDone: false, color: "#F59E0B" },
  { name: "Done", displayOrder: 3, isStart: false, isDone: true, color: "#10B981" },
] as const;
