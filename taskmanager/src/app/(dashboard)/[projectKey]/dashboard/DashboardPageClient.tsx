"use client";

import { useState } from "react";
import { BurndownChart } from "@/components/dashboard/BurndownChart";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import {
  calculateBurndown,
  calculateVelocity,
  type BurndownTask,
  type SprintData,
} from "@/lib/dashboardUtils";

interface DashboardPageClientProps {
  projectKey: string;
}

// Demo data — in production these would come from tRPC queries
const DEMO_TASKS: BurndownTask[] = [
  { id: "1", statusIsDone: true, completedAt: "2026-04-03", storyPoints: 3 },
  { id: "2", statusIsDone: true, completedAt: "2026-04-05", storyPoints: 5 },
  { id: "3", statusIsDone: true, completedAt: "2026-04-08", storyPoints: 2 },
  { id: "4", statusIsDone: false, storyPoints: 8 },
  { id: "5", statusIsDone: false, storyPoints: 5 },
];

const DEMO_SPRINTS: SprintData[] = [
  { sprintName: "Sprint 1", completedPoints: 18 },
  { sprintName: "Sprint 2", completedPoints: 24 },
  { sprintName: "Sprint 3", completedPoints: 20 },
  { sprintName: "Sprint 4", completedPoints: 28 },
  { sprintName: "Sprint 5", completedPoints: 22 },
];

export function DashboardPageClient({ projectKey }: DashboardPageClientProps) {
  // In production, these would be loaded from the server
  const [sprintStart] = useState("2026-04-01");
  const [sprintEnd] = useState("2026-04-14");

  const burndownData = calculateBurndown(
    DEMO_TASKS,
    sprintStart,
    sprintEnd,
  );

  const velocityData = calculateVelocity(DEMO_SPRINTS);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900">
        {projectKey} &mdash; Dashboard
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <BurndownChart data={burndownData} />
        <VelocityChart data={velocityData} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="총 태스크" value={DEMO_TASKS.length} />
        <StatCard
          label="완료"
          value={DEMO_TASKS.filter((t) => t.statusIsDone).length}
        />
        <StatCard
          label="남은 포인트"
          value={DEMO_TASKS.filter((t) => !t.statusIsDone).reduce(
            (s, t) => s + (t.storyPoints ?? 1),
            0,
          )}
        />
        <StatCard
          label="평균 벨로시티"
          value={
            velocityData.length > 0
              ? velocityData[velocityData.length - 1].average
              : 0
          }
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
