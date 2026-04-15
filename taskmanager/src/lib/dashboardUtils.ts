// ---------------------------------------------------------------------------
// Dashboard utility functions (pure, no DB calls)
// ---------------------------------------------------------------------------

export interface BurndownTask {
  id: string;
  statusIsDone: boolean;
  completedAt?: Date | string | null;
  storyPoints?: number;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface SprintData {
  sprintName: string;
  completedPoints: number;
}

export interface VelocityPoint {
  sprintName: string;
  completed: number;
  average: number;
}

/**
 * Calculate burndown chart data for a sprint.
 *
 * Returns an array of data points — one per day from `sprintStart` to
 * `sprintEnd` inclusive — containing the ideal remaining work (linear
 * decrease) and the actual remaining work based on completed tasks.
 */
export function calculateBurndown(
  tasks: BurndownTask[],
  sprintStart: Date | string,
  sprintEnd: Date | string,
): BurndownPoint[] {
  const start = normalizeDate(sprintStart);
  const end = normalizeDate(sprintEnd);

  if (end <= start) return [];

  const totalPoints = tasks.reduce(
    (sum, t) => sum + (t.storyPoints ?? 1),
    0,
  );

  // Build a map of date -> points completed on that day
  const completedByDate = new Map<string, number>();
  for (const task of tasks) {
    if (task.statusIsDone && task.completedAt) {
      const d = toDateKey(normalizeDate(task.completedAt));
      completedByDate.set(d, (completedByDate.get(d) ?? 0) + (task.storyPoints ?? 1));
    }
  }

  const days = daysBetween(start, end);
  const points: BurndownPoint[] = [];
  let remaining = totalPoints;

  for (let i = 0; i <= days; i++) {
    const current = addDays(start, i);
    const dateKey = toDateKey(current);

    // Ideal: linear decrease from totalPoints to 0
    const ideal = days === 0 ? 0 : Math.max(0, totalPoints - (totalPoints * i) / days);

    // Actual: subtract completed points up to this date
    const completedToday = completedByDate.get(dateKey) ?? 0;
    remaining -= completedToday;

    points.push({
      date: dateKey,
      ideal: Math.round(ideal * 100) / 100,
      actual: Math.max(0, remaining),
    });
  }

  return points;
}

/**
 * Calculate velocity data from a list of sprints.
 *
 * Returns one entry per sprint with the completed points and a running
 * average of all sprints up to and including that one.
 */
export function calculateVelocity(sprints: SprintData[]): VelocityPoint[] {
  if (sprints.length === 0) return [];

  const result: VelocityPoint[] = [];
  let cumulativePoints = 0;

  for (let i = 0; i < sprints.length; i++) {
    cumulativePoints += sprints[i].completedPoints;
    const average = cumulativePoints / (i + 1);

    result.push({
      sprintName: sprints[i].sprintName,
      completed: sprints[i].completedPoints,
      average: Math.round(average * 100) / 100,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
//
// All dates are handled as UTC-based "date-only" values to avoid timezone
// issues. Strings like "2026-04-01" are parsed into their year/month/day
// components directly rather than relying on Date constructor timezone
// behaviour.
// ---------------------------------------------------------------------------

function parseDateParts(d: Date | string): [number, number, number] {
  if (typeof d === "string") {
    // Handle "YYYY-MM-DD" or full ISO string
    const parts = d.slice(0, 10).split("-");
    return [Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])];
  }
  return [d.getFullYear(), d.getMonth(), d.getDate()];
}

function normalizeDate(d: Date | string): Date {
  const [y, m, day] = parseDateParts(d);
  return new Date(Date.UTC(y, m, day));
}

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}
